import asyncio
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
STATUS_URL = f"{API_PREFIX}/scanner/status"
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

    assert response.status_code == 409
    # One job plus a bounded number of polls: it must not spin forever.
    polls = [r for r in requests if r.method == "GET"]
    assert len(polls) == escl.MAX_DOCUMENT_ATTEMPTS


def test_scan_cancels_the_job_it_gives_up_on(auth_headers):
    def stuck_printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(503)
        return working_printer(request)

    requests = use_printer(stuck_printer)

    client.post(SCAN_URL, headers=auth_headers)

    # Left open, the job would keep the printer busy for everyone else.
    assert requests[-1].method == "DELETE"
    assert requests[-1].url == f"{PRINTER_URL}{JOB_PATH}"


def test_scan_cancels_the_job_when_the_document_goes_wrong(auth_headers):
    def cancelled_printer(request: httpx.Request) -> httpx.Response:
        # Someone cancelled the job from the printer panel.
        if request.method == "GET":
            return httpx.Response(404)
        return working_printer(request)

    requests = use_printer(cancelled_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 502
    assert requests[-1].method == "DELETE"


def test_scan_reports_the_failure_even_when_the_job_cannot_be_cancelled(
    auth_headers,
):
    def printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(503)
        if request.method == "DELETE":
            raise httpx.ConnectTimeout("timed out", request=request)
        return working_printer(request)

    use_printer(printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 409
    assert response.json()["detail"] == "The scanner is busy, try again shortly"


def test_scan_does_not_cancel_a_job_that_worked(auth_headers):
    requests = use_printer(working_printer)

    client.post(SCAN_URL, headers=auth_headers)

    assert "DELETE" not in [r.method for r in requests]


@pytest.mark.parametrize("busy_status", [503, 409])
def test_scan_reports_a_busy_printer(auth_headers, busy_status):
    use_printer(lambda request: httpx.Response(busy_status))

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 409
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


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_scan_refuses_a_second_scan_while_one_is_running(auth_headers):
    # Two devices pressing "scan" together: the first holds the printer until
    # the second has had its answer.
    second_answered = asyncio.Event()

    async def slow_printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            await second_answered.wait()
        return working_printer(request)

    requests = use_printer(slow_printer)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as devices:
        first = asyncio.create_task(devices.post(SCAN_URL, headers=auth_headers))
        while not requests:
            await asyncio.sleep(0)

        try:
            # Should the second scan reach the printer, it would wait forever.
            second = await asyncio.wait_for(
                devices.post(SCAN_URL, headers=auth_headers), timeout=2
            )
        finally:
            second_answered.set()
        first = await first

    assert second.status_code == 409
    assert second.json()["detail"] == "The scanner is busy, try again shortly"
    assert first.status_code == 200
    assert first.content == JPEG
    # The second scan never reached the printer.
    assert [r.method for r in requests].count("POST") == 1


def test_scan_can_run_again_once_the_previous_one_is_over(auth_headers):
    use_printer(working_printer)

    first = client.post(SCAN_URL, headers=auth_headers)
    second = client.post(SCAN_URL, headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200


def test_scan_can_run_again_after_a_failed_one(auth_headers):
    use_printer(lambda request: httpx.Response(400))
    assert client.post(SCAN_URL, headers=auth_headers).status_code == 502

    use_printer(working_printer)

    assert client.post(SCAN_URL, headers=auth_headers).status_code == 200


def test_scan_without_a_configured_scanner(auth_headers, monkeypatch):
    monkeypatch.delenv("SCANNER_URL")
    requests = use_printer(working_printer)

    response = client.post(SCAN_URL, headers=auth_headers)

    assert response.status_code == 503
    assert response.json()["detail"] == "No scanner configured"
    assert requests == []


CAPABILITIES_XML = """<?xml version="1.0" encoding="UTF-8"?>
<scan:ScannerCapabilities xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                          xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.6</pwg:Version>
  <pwg:MakeAndModel>EPSON ET-4850 Series</pwg:MakeAndModel>
</scan:ScannerCapabilities>"""


def printer_in_state(
    state: str, capabilities: str = CAPABILITIES_XML
) -> Callable[[httpx.Request], httpx.Response]:
    status_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<scan:ScannerStatus xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.6</pwg:Version>
  <pwg:State>{state}</pwg:State>
  <scan:Jobs>
    <scan:JobInfo><pwg:JobState>Completed</pwg:JobState></scan:JobInfo>
  </scan:Jobs>
</scan:ScannerStatus>"""

    def printer(request: httpx.Request) -> httpx.Response:
        if request.method == "GET" and request.url.path == "/eSCL/ScannerStatus":
            return httpx.Response(200, text=status_xml)
        if request.method == "GET" and request.url.path == "/eSCL/ScannerCapabilities":
            return httpx.Response(200, text=capabilities)
        return httpx.Response(404)

    return printer


def test_status_requires_authentication():
    requests = use_printer(printer_in_state("Idle"))

    response = client.get(STATUS_URL)

    assert response.status_code == 401
    assert requests == []


@pytest.mark.parametrize("state", ["Idle", "Processing", "Testing", "Stopped", "Down"])
def test_status_returns_the_state_of_the_scanner(auth_headers, state):
    requests = use_printer(printer_in_state(state))

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "info": "EPSON ET-4850 Series",
        "scanner_status": state,
    }
    assert {str(r.url) for r in requests} == {
        f"{PRINTER_URL}/eSCL/ScannerCapabilities",
        f"{PRINTER_URL}/eSCL/ScannerStatus",
    }


def test_status_works_when_the_scanner_does_not_tell_its_model(auth_headers):
    # The model is only shown to the user: it must not stop a scan.
    capabilities = """<scan:ScannerCapabilities
    xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm"/>"""
    use_printer(printer_in_state("Idle", capabilities=capabilities))

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"info": "", "scanner_status": "Idle"}


def test_status_reports_capabilities_the_scanner_cannot_give(auth_headers):
    def printer(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/eSCL/ScannerCapabilities":
            return httpx.Response(500)
        return printer_in_state("Idle")(request)

    use_printer(printer)

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 502


def test_status_reports_an_unreachable_scanner(auth_headers):
    def offline_printer(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out on 192.168.1.15", request=request)

    use_printer(offline_printer)

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 504
    # What httpx said, addresses included, stays in the backend.
    assert response.json()["detail"] == "The scanner is unreachable"


@pytest.mark.parametrize(
    "answer",
    [
        httpx.Response(200, text="<html>not escl</html>"),
        httpx.Response(200, text="<pwg:State>Idle"),
        httpx.Response(500),
    ],
    ids=["not escl", "broken xml", "error status"],
)
def test_status_reports_a_scanner_answering_garbage(auth_headers, answer):
    use_printer(lambda request: answer)

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 502
    assert response.json()["detail"] == "The scanner answered something unexpected"


def test_status_reports_a_state_escl_does_not_define(auth_headers):
    use_printer(printer_in_state("Sleeping"))

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 502


def test_status_ignores_the_state_of_the_jobs(auth_headers):
    # Only a job says `Idle` here: the scanner itself says nothing.
    status_xml = """<scan:ScannerStatus
    xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <scan:Jobs><scan:JobInfo><pwg:State>Idle</pwg:State></scan:JobInfo></scan:Jobs>
</scan:ScannerStatus>"""
    use_printer(lambda request: httpx.Response(200, text=status_xml))

    response = client.get(STATUS_URL, headers=auth_headers)

    assert response.status_code == 502


@pytest.mark.anyio
async def test_scanner_info_names_the_answer_that_failed():
    def printer(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/eSCL/ScannerStatus":
            return httpx.Response(500)
        return printer_in_state("Idle")(request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(printer)) as scanner:
        with pytest.raises(escl.ScannerError, match="ScannerStatus answered 500"):
            await escl.get_scanner_info(scanner, PRINTER_URL, timeout=3)


@pytest.mark.anyio
async def test_scanner_info_reports_an_unknown_state_as_a_scanner_error():
    transport = httpx.MockTransport(printer_in_state("Sleeping"))
    async with httpx.AsyncClient(transport=transport) as scanner:
        with pytest.raises(escl.ScannerError, match="unknown state"):
            await escl.get_scanner_info(scanner, PRINTER_URL, timeout=3)


def test_status_without_a_configured_scanner(auth_headers, monkeypatch):
    monkeypatch.delenv("SCANNER_URL")
    requests = use_printer(printer_in_state("Idle"))

    response = client.get(STATUS_URL, headers=auth_headers)

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
