"""
边界值和大文本传输测试
覆盖：空内容、1字节、1KB~5MB边界值、超长拒绝、特殊字符
"""
import pytest
import requests
from conftest import load_test_data, generate_content_of_size

_boundary_cases = load_test_data("boundary_cases.json")
_b_ids = [c["test_id"] for c in _boundary_cases]
_b_params = [pytest.param(c, id=c["test_id"]) for c in _boundary_cases]


class TestBoundaryText:
    """边界值参数化测试 — 覆盖 16 种场景"""

    @pytest.mark.boundary
    @pytest.mark.parametrize("case", _b_params, ids=_b_ids)
    def test_boundary_scenarios(self, base_url, registered_user, case):
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        url = f"{base_url}/api/notes"
        expected_status = case["expected_status"]

        title = case.get("title", "边界测试")
        if "content_size" in case:
            content = generate_content_of_size(case["content_size"])
        elif "content_includes_null" in case and case["content_includes_null"]:
            content = "正常内容开头" + "\x00" * 100 + "正常内容结尾"
        elif "content" in case:
            content = case["content"]
        else:
            content = "默认测试内容"

        resp = requests.post(url, json={"title": title, "content": content}, headers=headers, timeout=30)

        assert resp.status_code == expected_status, \
            f"[{case['test_id']}] expected {expected_status}, got {resp.status_code}: {resp.text[:200]}"

        if expected_status == 200:
            note_id = resp.json()["note"]["ID"]
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Title"] == title

    @pytest.mark.slow
    def test_5mb_exact_boundary(self, base_url, registered_user):
        """精确验证 5MB 边界值往返完整性"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        content = generate_content_of_size(5242880)
        assert len(content.encode("utf-8")) == 5242880

        resp = requests.post(f"{base_url}/api/notes", json={"title": "5MB边界测试", "content": content}, headers=headers, timeout=60)
        assert resp.status_code == 200, f"5MB create failed: {resp.status_code}"

        note_id = resp.json()["note"]["ID"]
        get_resp = requests.get(f"{base_url}/api/notes/{note_id}", headers=headers, timeout=60)
        assert get_resp.status_code == 200
        assert len(get_resp.json()["Content"].encode("utf-8")) == 5242880
        assert get_resp.json()["Content"] == content

    @pytest.mark.slow
    def test_oversized_content_rejected(self, base_url, registered_user):
        """超过 5MB 的内容应该被服务器拒绝"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        content = generate_content_of_size(5 * 1024 * 1024 + 1024)
        resp = requests.post(f"{base_url}/api/notes", json={"title": "超大内容", "content": content}, headers=headers, timeout=60)
        assert resp.status_code in [400, 413, 500], f"Expected 400/413/500, got {resp.status_code}"

    def test_content_roundtrip_preserves_data(self, base_url, registered_user):
        """验证不同大小内容的往返完整性"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        for size in [0, 1, 100, 1000, 10000]:
            content = generate_content_of_size(size) if size > 0 else ""
            resp = requests.post(f"{base_url}/api/notes", json={"title": f"roundtrip-{size}", "content": content}, headers=headers)
            assert resp.status_code == 200, f"Size {size} create failed: {resp.status_code}"
            note_id = resp.json()["note"]["ID"]
            get_resp = requests.get(f"{base_url}/api/notes/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Content"] == content, f"Size {size} roundtrip mismatch"
