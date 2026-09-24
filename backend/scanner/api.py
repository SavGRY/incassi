import os
import ssl
from collections.abc import AsyncIterator

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.responses import Response

from scanner.escl import ScannerBusyError, ScannerError, scan_a4

router = APIRouter(prefix="/scanner", tags=["scanner"])

# An A4 in colour at 300 dpi takes a while: the image only starts to flow once
# the head has travelled the whole sheet.
SCANNER_TIMEOUT_SECONDS = 60


def get_tls_verification() -> ssl.SSLContext | bool:
    """Trust exactly the printer certificate found at `SCANNER_CA_CERT`.

    The printer signs its own certificate, so no public CA can vouch for it:
    pinning it is what keeps another machine on the LAN from posing as the
    scanner. The certificate names the printer rather than its IP, hence the
    hostname is not checked, the pinned certificate is. Without the variable
    the usual verification applies.
    """
    ca_cert = os.getenv("SCANNER_CA_CERT")
    if not ca_cert:
        return True
    context = ssl.create_default_context(cafile=ca_cert)
    context.check_hostname = False
    return context


async def get_scanner_client() -> AsyncIterator[httpx.AsyncClient]:
    # The client only ever talks to `SCANNER_URL`, which comes from the
    # configuration and never from the request.
    async with httpx.AsyncClient(
        verify=get_tls_verification(), timeout=SCANNER_TIMEOUT_SECONDS
    ) as client:
        yield client


@router.post(
    path="/scan",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}}, "description": "The scan"}},
)
async def scan(client: httpx.AsyncClient = Depends(get_scanner_client)):
    """
    API that scans an A4 sheet from the scanner platen

    The JPEG goes back to the frontend untouched, which then sends it along
    with the other images when the incasso is created.

    :param client: The HTTP client that talks to the scanner
    :return: The scanned sheet as `image/jpeg`
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
