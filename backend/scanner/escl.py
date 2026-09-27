"""Client for eSCL (AirScan), the HTTP scan protocol the Epson ET-4850 speaks.

A scan is two calls: `POST /eSCL/ScanJobs` creates the job and answers with
its URL in `Location`, then `GET {job}/NextDocument` hands back the image.
"""

import asyncio
import contextlib
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlsplit

import httpx

from scanner.schema import ScannerResponse, ScannerStatus

__all__ = [
    "MAX_DOCUMENT_ATTEMPTS",
    "RETRY_DELAY_SECONDS",
    "ScannerBusyError",
    "ScannerError",
    "scan_a4",
    "get_scanner_info",
]

# While the lamp warms up `NextDocument` answers 503: poll for about 30s.
MAX_DOCUMENT_ATTEMPTS = 15
RETRY_DELAY_SECONDS = 2

# Regions are in 1/300 of an inch: 2480x3508 is an A4 sheet, within the
# 2550x3510 the ET-4850 platen reports in its `ScannerCapabilities`.
SCAN_SETTINGS = """<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                   xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.6</pwg:Version>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:Width>2480</pwg:Width>
      <pwg:Height>3508</pwg:Height>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>Platen</pwg:InputSource>
  <scan:Intent>Document</scan:Intent>
  <scan:ColorMode>RGB24</scan:ColorMode>
  <scan:XResolution>300</scan:XResolution>
  <scan:YResolution>300</scan:YResolution>
  <pwg:DocumentFormat>image/jpeg</pwg:DocumentFormat>
</scan:ScanSettings>"""


ESCL_NAMESPACES = {"pwg": "http://www.pwg.org/schemas/2010/12/sm"}


class ScannerError(Exception):
    """
    The scanner answered something a scan cannot go on with
    """


class ScannerBusyError(ScannerError):
    """
    The scanner is working on another job, or still warming up
    """


async def get_scanner_info(
    client: httpx.AsyncClient, scanner_url: str, timeout: float
) -> ScannerResponse:
    """
    Read the model of the scanner and its state

    The state comes from `ScannerStatus`, and only the scanner-wide
    `<pwg:State>` counts, not the state of the jobs listed in the same
    document. The model comes from `ScannerCapabilities`: it is only shown to
    the user, so a scanner that does not tell it can still take a scan.

    :param client: The HTTP client that talks to the scanner
    :param scanner_url: The base URL of the scanner, without a trailing slash
    :param timeout: How many seconds to wait for each answer
    :return: The model of the scanner, empty when unknown, and its state
    :raises ScannerError: When an answer is not a 200 or not valid XML, or the
        state is missing or one eSCL does not define
    :raises httpx.HTTPError: When the scanner cannot be reached in time
    """
    capabilities_response = await client.get(
        f"{scanner_url}/eSCL/ScannerCapabilities", timeout=timeout
    )
    status_response = await client.get(
        f"{scanner_url}/eSCL/ScannerStatus", timeout=timeout
    )
    for name, response in (
        ("ScannerCapabilities", capabilities_response),
        ("ScannerStatus", status_response),
    ):
        if response.status_code != httpx.codes.OK:
            raise ScannerError(f"{name} answered {response.status_code}")

    # ElementTree never fetches external entities, and the expat it ships
    # with (>= 2.4) stops the entity expansion bombs.
    try:
        capabilities_root = ET.fromstring(capabilities_response.content)
        status_root = ET.fromstring(status_response.content)
    except ET.ParseError as error:
        raise ScannerError("The scanner answered invalid XML") from error

    make_and_model = capabilities_root.findtext(
        "pwg:MakeAndModel", default="", namespaces=ESCL_NAMESPACES
    )
    # A direct child of the root: the scanner-wide state, not the
    # `<pwg:JobState>` of each job listed under `<scan:Jobs>`.
    state = status_root.findtext("pwg:State", namespaces=ESCL_NAMESPACES)
    if not state or not state.strip():
        raise ScannerError("ScannerStatus did not say the scanner state")

    try:
        scanner_status = ScannerStatus(state.strip())
    except ValueError as error:
        raise ScannerError("ScannerStatus said an unknown state") from error

    return ScannerResponse(info=make_and_model.strip(), scanner_status=scanner_status)


async def scan_a4(client: httpx.AsyncClient, scanner_url: str) -> bytes:
    """
    Scan an A4 sheet from the platen

    While the lamp warms up the document is not ready yet: it is asked for
    again up to `MAX_DOCUMENT_ATTEMPTS` times, `RETRY_DELAY_SECONDS` apart.
    A job that fails once created is cancelled, so that it does not keep the
    printer busy.

    :param client: The HTTP client that talks to the scanner
    :param scanner_url: The base URL of the scanner, without a trailing slash
    :return: The scanned sheet as JPEG bytes
    :raises ScannerBusyError: When the scanner refuses the job or the document
        never arrives
    :raises ScannerError: When the scanner answers something unexpected
    :raises httpx.HTTPError: When the scanner cannot be reached
    """
    job_url = await _create_job(client, scanner_url)

    try:
        for _ in range(MAX_DOCUMENT_ATTEMPTS):
            document = await client.get(f"{job_url}/NextDocument")
            if document.status_code == httpx.codes.OK:
                return document.content
            if document.status_code != httpx.codes.SERVICE_UNAVAILABLE:
                raise ScannerError(f"NextDocument answered {document.status_code}")
            await asyncio.sleep(RETRY_DELAY_SECONDS)

        raise ScannerBusyError("The scanned document never arrived")
    except BaseException:
        # A job left open keeps the printer busy for everyone else.
        await _cancel_job(client, job_url)
        raise


async def _cancel_job(client: httpx.AsyncClient, job_url: str) -> None:
    """
    Cancel a scan job given up on, as best as the printer allows

    The job may already be gone, or the printer unreachable: either way the
    error that made the scan fail is the one worth reporting, not this one.

    :param client: The HTTP client that talks to the scanner
    :param job_url: The absolute URL of the job
    """
    with contextlib.suppress(httpx.HTTPError):
        await client.delete(job_url)


async def _create_job(client: httpx.AsyncClient, scanner_url: str) -> str:
    """
    Create a scan job with `SCAN_SETTINGS`

    :param client: The HTTP client that talks to the scanner
    :param scanner_url: The base URL of the scanner, without a trailing slash
    :return: The absolute URL of the job, always on the host of `scanner_url`
    :raises ScannerBusyError: When the scanner refuses a new job
    :raises ScannerError: When the job is not created, its location is missing
        or points to another host
    :raises httpx.HTTPError: When the scanner cannot be reached
    """
    response = await client.post(
        f"{scanner_url}/eSCL/ScanJobs",
        content=SCAN_SETTINGS,
        headers={"Content-Type": "text/xml"},
    )
    # Printers disagree on how to say they are busy: 503 or 409.
    if response.status_code in (httpx.codes.SERVICE_UNAVAILABLE, httpx.codes.CONFLICT):
        raise ScannerBusyError("The scanner refused a new job")
    if response.status_code != httpx.codes.CREATED:
        raise ScannerError(f"ScanJobs answered {response.status_code}")

    location = response.headers.get("Location")
    if not location:
        raise ScannerError("ScanJobs did not say where the job is")

    # `Location` may be relative or absolute. Only the configured host is ever
    # contacted: whatever sits on the network must not steer the backend
    # towards another machine.
    job_url = urljoin(f"{scanner_url}/", location).rstrip("/")
    if urlsplit(job_url).hostname != urlsplit(scanner_url).hostname:
        raise ScannerError("ScanJobs pointed to another host")
    return job_url
