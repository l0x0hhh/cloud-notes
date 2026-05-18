"""
笔记 CRUD 接口自动化测试
覆盖：正常流程、异常操作、跨用户隔离、参数校验
"""
import uuid

import pytest
import requests
from conftest import load_test_data

_notes_cases = load_test_data("notes_cases.json")
_notes_ids = [c["test_id"] for c in _notes_cases]
_notes_params = [pytest.param(c, id=c["test_id"]) for c in _notes_cases]


class TestNotesCRUD:
    """笔记 CRUD 参数化测试 — 覆盖 28 种场景"""

    def _create_note(self, base_url, headers, title="测试", content="内容"):
        resp = requests.post(f"{base_url}/api/notes", json={"title": title, "content": content}, headers=headers)
        if resp.status_code == 200:
            return resp.json()["note"]["ID"]
        return None

    @pytest.mark.crud
    @pytest.mark.parametrize("case", _notes_params, ids=_notes_ids)
    def test_notes_scenarios(self, base_url, registered_user, second_user, case):
        scenario = case["scenario"]
        expected_status = case["expected_status"]
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        second_headers = {"Authorization": f"Bearer {second_user['token']}"}
        url = f"{base_url}/api/notes"

        # ---- Create ----
        if scenario == "create":
            if case.get("use_empty_body"):
                resp = requests.post(url, data="", headers=headers)
            else:
                resp = requests.post(url, json=case["body"], headers=headers)
            self._assert_response(resp, case)

        # ---- Get List ----
        elif scenario == "get_list":
            for i in range(3):
                self._create_note(base_url, headers, f"笔记{i}", f"内容{i}")
            resp = requests.get(url, headers=headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
            assert len(resp.json()) >= 3

        elif scenario == "get_list_empty":
            new_user = f"empty_{uuid.uuid4().hex[:6]}"
            requests.post(f"{base_url}/register", json={"username": new_user, "password": "pass123"})
            login_resp = requests.post(f"{base_url}/login", json={"username": new_user, "password": "pass123"})
            new_token = login_resp.json()["token"]
            resp = requests.get(url, headers={"Authorization": f"Bearer {new_token}"})
            assert resp.status_code == 200
            assert resp.json() == []

        # ---- Get By ID ----
        elif scenario == "get_by_id":
            note_id = self._create_note(base_url, headers, "获取测试", "获取内容")
            assert note_id is not None
            resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert resp.status_code == 200
            assert resp.json()["Title"] == "获取测试"

        elif scenario == "get_by_id_not_exist":
            resp = requests.get(f"{url}/{case['not_exist_id']}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "get_by_id_invalid":
            resp = requests.get(f"{url}/{case['invalid_id']}", headers=headers)
            self._assert_response(resp, case)

        # ---- Update ----
        elif scenario == "update":
            note_id = self._create_note(base_url, headers, "原始标题", "原始内容")
            resp = requests.put(f"{url}/{note_id}", json=case["body"], headers=headers)
            self._assert_response(resp, case)
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Title"] == case["body"]["title"]

        elif scenario == "update_not_exist":
            resp = requests.put(f"{url}/{case['not_exist_id']}", json=case["body"], headers=headers)
            self._assert_response(resp, case)

        elif scenario == "update_empty_body":
            note_id = self._create_note(base_url, headers)
            resp = requests.put(f"{url}/{note_id}", data="", headers=headers)
            self._assert_response(resp, case)

        # ---- Delete ----
        elif scenario == "delete":
            note_id = self._create_note(base_url, headers, "待删除", "内容")
            resp = requests.delete(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 404

        elif scenario == "delete_not_exist":
            resp = requests.delete(f"{url}/{case['not_exist_id']}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_get":
            note_id = self._create_note(base_url, headers, "删后查", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.get(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_update":
            note_id = self._create_note(base_url, headers, "删后改", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.put(f"{url}/{note_id}", json=case["body"], headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_delete":
            note_id = self._create_note(base_url, headers, "重复删", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.delete(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)

        # ---- Cross-User Isolation ----
        elif scenario == "cross_user_get":
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            resp = requests.get(f"{url}/{note_id}", headers=second_headers)
            self._assert_response(resp, case)

        elif scenario == "cross_user_update":
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            resp = requests.put(f"{url}/{note_id}", json=case["body"], headers=second_headers)
            self._assert_response(resp, case)

        elif scenario == "cross_user_delete":
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            resp = requests.delete(f"{url}/{note_id}", headers=second_headers)
            self._assert_response(resp, case)

    def _assert_response(self, resp, case):
        assert resp.status_code == case["expected_status"], \
            f"[{case['test_id']}] expected {case['expected_status']}, got {resp.status_code}: {resp.text[:300]}"
        expected_error = case.get("expected_error")
        if expected_error:
            assert expected_error in resp.json().get("error", ""), \
                f"[{case['test_id']}] expected error '{expected_error}', got: {resp.text[:200]}"


class TestNotesE2E:
    """笔记全生命周期端到端测试"""

    def test_full_crud_cycle(self, base_url, registered_user):
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        base = f"{base_url}/api/notes"

        resp = requests.post(base, json={"title": "E2E笔记", "content": "端到端测试内容"}, headers=headers)
        assert resp.status_code == 200
        note_id = resp.json()["note"]["ID"]
        assert note_id > 0

        resp = requests.get(base, headers=headers)
        assert resp.status_code == 200
        note_ids = [n["ID"] for n in resp.json()]
        assert note_id in note_ids

        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["Title"] == "E2E笔记"

        resp = requests.put(f"{base}/{note_id}", json={"title": "已更新标题", "content": "已更新内容"}, headers=headers)
        assert resp.status_code == 200

        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.json()["Title"] == "已更新标题"

        resp = requests.delete(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 200

        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 404
