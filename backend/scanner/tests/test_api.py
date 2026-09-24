import ssl
from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from core.domain import API_PREFIX
from core.main import app
from scanner import api, escl

client = TestClient(app)

SCAN_URL = f"{API_PREFIX}/scanner/scan"
PRINTER_URL = "https://192.168.1.15"
JOB_PATH = "/eSCL/ScanJobs/job-1"
JPEG = b"\xff\xd8\xff\xe0 fake jpeg \xff\xd9"
# Stands in for the one the printer serves; its private key was thrown away.
SELF_SIGNED_CERTIFICATE = """\
-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIUHLvJ+t9eNY5W6dbGMJPyfaXG5jIwDQYJKoZIhvcNAQEL
BQAwFTETMBEGA1UEAwwKRVBTT04tVEVTVDAgFw0yNjA5MjQyMTEyMThaGA8yMTI2
MDgzMTIxMTIxOFowFTETMBEGA1UEAwwKRVBTT04tVEVTVDCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBALR4IXlfzdFn+8xGjK592lmAx7Uo4rESYhIoDbG0
UpqMmhiLVT6v365lyn0t33c895tmxo3rNZXmOc6vt88UBZ/hu5Vmq7RFxT1INmy9
dhB/gd3k2pzGRN9aqhIr5ttJwhmdaXF1sVIr/XGaoEZHeBxC3s2PWmYe/qg9VLhi
AgKxTQhCTCmnk85KAI/8R/ino/NBsD+05/zpt19KVjtAtI1GIG8O82s5GfLrQjRP
24p2nY3bxRxSVYBcRm0Z5z/c1z8piXwTihPY4uukncDz3DzM7UNva75Trt4yenb2
Y6dPS/nkjfhCDhwLI9wIdCLMAMdySWL+YugBzM9wnRDVmWECAwEAAaNTMFEwHQYD
VR0OBBYEFC87UAlw3aYj6JQcZWVACd7egvqTMB8GA1UdIwQYMBaAFC87UAlw3aYj
6JQcZWVACd7egvqTMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB
ACj0uRX8OF/40XbX04IP4bPRH2Kym1Upu945qJ2NFEpYZ13/5GYbPv98mmbePxdJ
XPNpMEpsBVuqxWVjUya75KwKV8+SwyyuOqv6EaJVf2gGIw8oEzXZgnL9skGgLj7u
fPlOWQVuvNo3zZqHM1L7joS3tJl9tEvcaAC7hGiSIMbUITu108qgRroZCkDipeA7
uwDPEAjh52ePl/65fWYzzGWDhqWy30WhcbJIIsr4e0AsbQ3w9NLAb1Bka8HMaARR
1ZxukGrCDhO96Ccxh1ENqhHOojl7//D+IAc02pE/HIw2EVzvFEt9nYozn34xPvs9
z8OZZ2Ds4gB/L8WnoLvohGY=
-----END CERTIFICATE-----
"""


def use_printer(handler: Callable[[httpx.Request], httpx.Response]) -> list:
    """Route the scanner calls to `handler` and return the requests it gets."""
    requests: list[httpx.Request] = []

    def recording_handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return handler(request)

    async def fake_client():
        transport = httpx.MockTransport(recording_handler)
        async with httpx.AsyncClient(transport=transport) as scanner_client:
            yield scanner_client

    app.dependency_overrides[api.get_scanner_client] = fake_client
    return requests


def working_printer(request: httpx.Request) -> httpx.Response:
    if request.method == "POST" and request.url.path == "/eSCL/ScanJobs":
        return httpx.Response(201, headers={"Location": f"{PRINTER_URL}{JOB_PATH}"})
    if request.method == "GET" and request.url.path == f"{JOB_PATH}/NextDocument":
        return httpx.Response(200, content=JPEG, headers={"Content-Type": "image/jpeg"})
    return httpx.Response(404)


@pytest.fixture(autouse=True)
def configured_scanner(monkeypatch):
    monkeypatch.setenv("SCANNER_URL", PRINTER_URL)
    monkeypatch.setattr(escl, "RETRY_DELAY_SECONDS", 0)
    yield
    app.dependency_overrides.clear()


def test_scan_requires_authentication():
    requests = use_printer(working_printer)

    response = client.post(SCAN_URL)

    assert response.status_code == 401
    assert requests == []


def test_scan_returns_the_scanned_jpeg(auth_headers):
    use_printer(working_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == JPEG


def test_scan_asks_for_an_a4_colour_jpeg_from_the_platen(auth_headers):
    requests = use_printer(working_printer)

    client.post(SCAN_URL, headers=auth_headers)

    job = requests[0]
    assert job.url == f"{PRINTER_URL}/eSCL/ScanJobs"
    settings = job.content.decode()
    assert "<pwg:Width>2480</pwg:Width>" in settings
    assert "<pwg:Height>3508</pwg:Height>" in settings
    assert "<pwg:InputSource>Platen</pwg:InputSource>" in settings
    assert "<scan:ColorMode>RGB24</scan:ColorMode>" in settings
    assert "<scan:XResolution>300</scan:XResolution>" in settings
    assert "<pwg:DocumentFormat>image/jpeg</pwg:DocumentFormat>" in settings


def test_scan_follows_a_relative_job_location(auth_headers):
    def printer(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(201, headers={"Location": JOB_PATH})
        return working_printer(request)

    use_printer(printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 200
    assert response.content == JPEG


def test_scan_waits_while_the_printer_warms_up(auth_headers):
    attempts = {"next_document": 0}

    def warming_printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            attempts["next_document"] += 1
            if attempts["next_document"] < 3:
                return httpx.Response(503)
        return working_printer(request)

    use_printer(warming_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 200
    assert attempts["next_document"] == 3


def test_scan_gives_up_when_the_document_never_arrives(auth_headers):
    def stuck_printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(503)
        return working_printer(request)

    requests = use_printer(stuck_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 503
    # One job plus a bounded number of polls: it must not spin forever.
    assert len(requests) == 1 + escl.MAX_DOCUMENT_ATTEMPTS


def test_scan_reports_a_busy_printer(auth_headers):
    use_printer(lambda request: httpx.Response(503))

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 503
    assert response.json()["detail"] == "The scanner is busy, try again shortly"


def test_scan_reports_an_unreachable_printer(auth_headers):
    def offline_printer(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out", request=request)

    use_printer(offline_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 504
    assert response.json()["detail"] == "The scanner is unreachable"


def test_scan_reports_a_job_the_printer_refused(auth_headers):
    use_printer(lambda request: httpx.Response(400))

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 502


def test_scan_never_follows_a_job_location_on_another_host(auth_headers):
    def redirecting_printer(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(
                201, headers={"Location": "http://10.0.0.1/eSCL/ScanJobs/job-1"}
            )
        return working_printer(request)

    requests = use_printer(redirecting_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 502
    assert [r.url.host for r in requests] == ["192.168.1.15"]


def test_scan_without_a_configured_scanner(auth_headers, monkeypatch):
    monkeypatch.delenv("SCANNER_URL")
    requests = use_printer(working_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 503
    assert response.json()["detail"] == "No scanner configured"
    assert requests == []


def test_tls_is_verified_when_no_certificate_is_pinned(monkeypatch):
    monkeypatch.delenv("SCANNER_CA_CERT", raising=False)

    assert api.get_tls_verification() is True


def test_tls_trusts_the_pinned_printer_certificate(monkeypatch, tmp_path):
    certificate = tmp_path / "scanner.pem"
    certificate.write_text(SELF_SIGNED_CERTIFICATE)
    monkeypatch.setenv("SCANNER_CA_CERT", str(certificate))

    context = api.get_tls_verification()

    assert context.verify_mode == ssl.CERT_REQUIRED
    assert [c["subject"] for c in context.get_ca_certs()] == [
        ((("commonName", "EPSON-TEST"),),)
    ]
