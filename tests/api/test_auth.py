"""
鉴权相关接口自动化测试
覆盖：注册、登录、Token 鉴权的正常与异常场景
"""
import pytest
import requests
from conftest import load_test_data

_auth_cases = load_test_data("auth_cases.json")

def _build_auth_params():
    ids = []
    params = []
    for case in _auth_cases:
        ids.append(case["test_id"])
        params.append(pytest.param(case, id=case["test_id"]))
    return ids, params

_auth_ids, _auth_params = _build_auth_params()

class TestAuth:
    """鉴权模块参数化测试 — 覆盖 22 种场景"""

    @pytest.mark.auth
    @pytest.mark.parametrize("case", _auth_params, ids=_auth_ids)
    def test_auth_scenarios(self, base_url, registered_user, case,
                            expired_token, invalid_token, malformed_token):
        method = case["method"]
        path = case["path"]
        expected_status = case["expected_status"]
        expected_error = case.get("expected_error")
        url = f"{base_url}{path}"

        # Setup
        if case.get("setup") == "先注册一次同名用户":
            requests.post(f"{base_url}/register", json={"username": "__dup_test__", "password": "test123"})
            requests.post(f"{base_url}/register", json={"username": "__dup_test__", "password": "test123"})
        elif case.get("setup") == "先注册用户 __login_test__":
            requests.post(f"{base_url}/register", json={"username": "__login_test__", "password": "correctpass"})

        # Body
        body = case.get("body")
        json_body = None if body is None or case.get("raw_body") else body

        # Headers
        headers = {}
        if case.get("no_auth"):
            pass
        elif case.get("headers"):
            headers = case["headers"]
        elif case.get("use_expired_token"):
            headers["Authorization"] = f"Bearer {expired_token}"
        elif case.get("use_invalid_token"):
            headers["Authorization"] = f"Bearer {invalid_token}"
        elif case.get("use_malformed_token"):
            headers["Authorization"] = f"Bearer {malformed_token}"
        elif path.startswith("/api/"):
            headers["Authorization"] = f"Bearer {registered_user['token']}"

        # Request
        if case.get("raw_body"):
            resp = requests.request(method, url, data=body, headers=headers)
        elif method == "GET":
            resp = requests.get(url, headers=headers)
        else:
            resp = requests.request(method, url, json=json_body, headers=headers)

        assert resp.status_code == expected_status, \
            f"[{case['test_id']}] expected {expected_status}, got {resp.status_code}: {resp.text[:300]}"

        if expected_error:
            resp_json = resp.json()
            assert "error" in resp_json, f"[{case['test_id']}] missing error: {resp_json}"
            assert expected_error in resp_json["error"], \
                f"[{case['test_id']}] expected '{expected_error}', got '{resp_json['error']}'"


class TestLoginFlow:
    """登录端到端流程测试"""

    def test_register_login_full_flow(self, base_url):
        import uuid
        username = f"e2e_{uuid.uuid4().hex[:6]}"
        password = "E2ETest123"
        resp = requests.post(f"{base_url}/register", json={"username": username, "password": password})
        assert resp.status_code == 200
        assert resp.json()["message"] == "注册成功"

        resp = requests.post(f"{base_url}/login", json={"username": username, "password": password})
        assert resp.status_code == 200
        token = resp.json()["token"]
        assert len(token) > 20

        resp = requests.get(f"{base_url}/api/profile", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "user_id" in resp.json()

    def test_login_returns_valid_token(self, registered_user, base_url):
        resp = requests.get(f"{base_url}/api/profile", headers={"Authorization": f"Bearer {registered_user['token']}"})
        assert resp.status_code == 200
