import os
import ssl
from collections.abc import AsyncIterator

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.responses import Response

from scanner.escl import ScannerBusyError, ScannerError, get_scanner_info, scan_a4
from scanner.schema import ScannerResponse

router = APIRouter(prefix="/scanner", tags=["scanner"])

SCANNER_TIMEOUT_SECONDS = 60


def get_tls_verification() -> ssl.SSLContext | bool:
    """
    Trust exactly the printer certificate found at `SCANNER_CA_CERT`

    The printer signs its own certificate, so no public CA can vouch for it:
    pinning it is what keeps another machine on the LAN from posing as the
    scanner. The certificate names the printer rather than its IP, hence the
    hostname is not checked, the pinned certificate is. Without the variable
    the usual verification applies.

    :return: An SSL context trusting only the pinned certificate, or `True`
        for the default verification
    """
    ca_cert = os.getenv("SCANNER_CA_CERT")
    if not ca_cert:
        return True
    context = ssl.create_default_context(cafile=ca_cert)
    context.check_hostname = False
    return context


async def get_scanner_client() -> AsyncIterator[httpx.AsyncClient]:
    """
    Dependency that opens the HTTP client used to talk to the scanner

    The client is closed once the request is over.

    :return: The client, verifying TLS with `get_tls_verification`
    """
    # The client only ever talks to `SCANNER_URL`, which comes from the
    # configuration and never from the request.
    async with httpx.AsyncClient(
        verify=get_tls_verification(), timeout=SCANNER_TIMEOUT_SECONDS
    ) as client:
        yield client


@router.get(
    path="/status",
    response_model=ScannerResponse,
    responses={
        502: {"description": "The scanner answered something unexpected"},
        503: {"description": "No scanner configured"},
        504: {"description": "The scanner is unreachable"},
    },
)
async def get_status(
    client: httpx.AsyncClient = Depends(get_scanner_client),
) -> ScannerResponse:
    """
    API that tells the state of the scanner

    Only an `Idle` scanner can take a scan right now. The details of what went
    wrong stay in the backend: the client only learns which kind of failure.

    :param client: The HTTP client that talks to the scanner, defaults to
        Depends(get_scanner_client)
    :return: The model of the scanner and its eSCL state, e.g. `Idle` or
        `Processing`
    :raises HTTPException: 503 when no scanner is configured, 502 when it
        answers something unexpected, 504 when it is unreachable
    """
    scanner_url = os.getenv("SCANNER_URL")
    if not scanner_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No scanner configured",
        )

    try:
        return await get_scanner_info(client, scanner_url.rstrip("/"), timeout=3)
    except ScannerError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The scanner answered something unexpected",
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The scanner is unreachable",
        )


@router.post(
    path="/scan",
    response_class=Response,
    responses={
        200: {"content": {"image/jpeg": {}}, "description": "The scan"},
        502: {"description": "The scanner could not complete the scan"},
        503: {"description": "The scanner is busy, or none is configured"},
        504: {"description": "The scanner is unreachable"},
    },
)
async def scan(client: httpx.AsyncClient = Depends(get_scanner_client)):
    """
    API that scans an A4 sheet from the scanner platen

    The JPEG goes back to the frontend untouched, which then sends it along
    with the other images when the incasso is created.

    :param client: The HTTP client that talks to the scanner, defaults to
        Depends(get_scanner_client)
    :return: The scanned sheet as `image/jpeg`
    :raises HTTPException: 503 when the scanner is busy or none is
        configured, 502 when it cannot complete the scan, 504 when it is
        unreachable
    """
    scanner_url = os.getenv("SCANNER_URL")
    if not scanner_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No scanner configured",
        )

    try:
        image = await scan_a4(client, scanner_url.rstrip("/"))
    except ScannerBusyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The scanner is busy, try again shortly",
        )
    except ScannerError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The scanner could not complete the scan",
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The scanner is unreachable",
        )

    return Response(content=image, media_type="image/jpeg")
