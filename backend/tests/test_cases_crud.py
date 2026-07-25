"""Backend regression tests for Namma Kavacha - focus on cases PATCH/DELETE & core APIs."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kavacha-ai-police.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "admin": {"email": "admin@nammakavacha.ai", "password": "Admin@123"},
    "analyst": {"email": "analyst@nammakavacha.ai", "password": "Analyst@123"},
    "supervisor": {"email": "supervisor@nammakavacha.ai", "password": "Supervisor@123"},
}


def _login(role):
    r = requests.post(f"{API}/auth/login", json=CREDS[role], timeout=15)
    assert r.status_code == 200, f"login {role}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def tokens():
    return {r: _login(r) for r in CREDS}


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def test_health_and_login(tokens):
    assert all(tokens.values())


def test_dashboard_kpis(tokens):
    r = requests.get(f"{API}/dashboard/kpis", headers=_hdr(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["total", "open", "critical", "chargesheeted"]:
        assert k in d
    assert d["total"] >= 1000


def test_cases_list(tokens):
    r = requests.get(f"{API}/cases?limit=5", headers=_hdr(tokens["analyst"]), timeout=20)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list) and len(lst) > 0
    assert "id" in lst[0] and "fir_no" in lst[0]


@pytest.fixture(scope="session")
def sample_case(tokens):
    r = requests.get(f"{API}/cases?limit=1", headers=_hdr(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    return r.json()[0]


def test_patch_case_as_analyst(tokens, sample_case):
    cid = sample_case["id"]
    original_status = sample_case.get("status")
    new_status = "Under Investigation" if original_status != "Under Investigation" else "Open"
    r = requests.patch(f"{API}/cases/{cid}", json={"status": new_status},
                       headers=_hdr(tokens["analyst"]), timeout=15)
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["status"] == new_status
    # Verify GET reflects update
    g = requests.get(f"{API}/cases/{cid}", headers=_hdr(tokens["analyst"]), timeout=15)
    assert g.status_code == 200
    assert g.json()["status"] == new_status
    # revert
    requests.patch(f"{API}/cases/{cid}", json={"status": original_status},
                   headers=_hdr(tokens["analyst"]), timeout=15)


def test_patch_case_forbidden_for_supervisor(tokens, sample_case):
    cid = sample_case["id"]
    r = requests.patch(f"{API}/cases/{cid}", json={"status": "Closed"},
                       headers=_hdr(tokens["supervisor"]), timeout=15)
    assert r.status_code in (401, 403), r.text


def test_delete_forbidden_for_analyst(tokens):
    r = requests.get(f"{API}/cases?limit=1", headers=_hdr(tokens["admin"]), timeout=15)
    cid = r.json()[0]["id"]
    r = requests.delete(f"{API}/cases/{cid}", headers=_hdr(tokens["analyst"]), timeout=15)
    assert r.status_code in (401, 403)


def test_delete_and_recreate_admin(tokens):
    # Create a case then delete it (admin only) to avoid touching seed
    payload = {
        "fir_no": "TEST/9999/2026",
        "title": "TEST_delete_case",
        "crime_head": "Property",
        "crime_sub_head": "Theft",
        "district": "Bengaluru City",
        "unit": "Test PS",
        "status": "Open",
        "severity": "Low",
        "date_registered": "2026-01-01",
        "location": "Test",
        "description": "temp",
        "io_officer": "Test IO",
        "court": "Test",
        "lat": 12.97,
        "lng": 77.59,
    }
    c = requests.post(f"{API}/cases", json=payload, headers=_hdr(tokens["admin"]), timeout=15)
    assert c.status_code in (200, 201), c.text
    cid = c.json()["id"]
    d = requests.delete(f"{API}/cases/{cid}", headers=_hdr(tokens["admin"]), timeout=15)
    assert d.status_code in (200, 204)
    # GET after delete should be 404
    g = requests.get(f"{API}/cases/{cid}", headers=_hdr(tokens["admin"]), timeout=15)
    assert g.status_code == 404


def test_network_graph_and_facets(tokens):
    r = requests.get(f"{API}/network/facets", headers=_hdr(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    r = requests.get(f"{API}/network/graph?limit=50", headers=_hdr(tokens["admin"]), timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert "nodes" in d and "links" in d
    # Ensure kinds exist so relKind filter works
    kinds = {l.get("kind") for l in d["links"]}
    assert kinds & {"accused", "victim"}


def test_kavacha_chat_stream(tokens):
    r = requests.post(f"{API}/kavacha/chat",
                      json={"message": "hi", "session_id": "test-session"},
                      headers=_hdr(tokens["admin"]), timeout=30, stream=True)
    assert r.status_code == 200
    # read first data chunk
    got = False
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            got = True
            break
    assert got, "No SSE data received from kavacha chat"
