"""Client for eSCL (AirScan), the HTTP scan protocol the Epson ET-4850 speaks.

A scan is two calls: `POST /eSCL/ScanJobs` creates the job and answers with
its URL in `Location`, then `GET {job}/NextDocument` hands back the image.
"""

import asyncio
from urllib.parse import urljoin, urlsplit

import httpx

__all__ = [
    "MAX_DOCUMENT_ATTEMPTS",
    "RETRY_DELAY_SECONDS",
    "ScannerBusyError",
    "ScannerError",
    "scan_a4",
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


class ScannerError(Exception):
    """The scanner answered something a scan cannot go on with."""


class ScannerBusyError(ScannerError):
    """The scanner is working on another job, or still warming up."""


async def scan_a4(client: httpx.AsyncClient, scanner_url: str) -> bytes:
    """Scan an A4 sheet from the platen and return it as a JPEG."""
    job_url = await _create_job(client, scanner_url)

    for _ in range(MAX_DOCUMENT_ATTEMPTS):
        document = await client.get(f"{job_url}/NextDocument")
        if document.status_code == httpx.codes.OK:
            return document.content
        if document.status_code != httpx.codes.SERVICE_UNAVAILABLE:
            raise ScannerError(f"NextDocument answered {document.status_code}")
        await asyncio.sleep(RETRY_DELAY_SECONDS)

    raise ScannerBusyError("The scanned document never arrived")


async def _create_job(client: httpx.AsyncClient, scanner_url: str) -> str:
    response = await client.post(
        f"{scanner_url}/eSCL/ScanJobs",
        content=SCAN_SETTINGS,
        headers={"Content-Type": "text/xml"},
    )
    if response.status_code == httpx.codes.SERVICE_UNAVAILABLE:
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
