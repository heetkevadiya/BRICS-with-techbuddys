"""Guards on who can see what.

The public preview must let a visitor reach the analyst and policymaker screens without an account.
Role selection therefore cannot be tied to APP_ENV, which an ordinary production deploy sets and
which used to silently 403 every dashboard.
"""
from fastapi.testclient import TestClient

from app.api import deps
from app.core.config import settings
from app.main import app

client = TestClient(app)
GUARDED = "/api/ai/performance"


def test_role_switching_is_on_by_default():
    assert settings.role_switching is True


def test_a_visitor_reaches_a_guarded_screen(monkeypatch):
    monkeypatch.setattr(deps.settings, "role_switching", True)
    assert client.get(GUARDED, headers={"X-Demo-Role": "analyst"}).status_code == 200


def test_turning_role_switching_off_locks_the_screens(monkeypatch):
    monkeypatch.setattr(deps.settings, "role_switching", False)
    assert client.get(GUARDED, headers={"X-Demo-Role": "analyst"}).status_code == 403


def test_an_unknown_role_never_escalates(monkeypatch):
    monkeypatch.setattr(deps.settings, "role_switching", True)
    assert client.get(GUARDED, headers={"X-Demo-Role": "admin-please"}).status_code == 403
