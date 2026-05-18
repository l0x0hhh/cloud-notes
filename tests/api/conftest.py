"""
pytest 配置文件 — 管理 fixture、测试数据加载、token 生成
"""
import json
import os
import time
import uuid

import jwt
import pytest
import requests

# ---- 配置 ----
BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
JWT_SECRET = "cloud-notes-secret"


def load_test_data(filename: str) -> list:
    """从 data/ 目录加载 JSON 测试数据"""
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---- Fixtures ----

@pytest.fixture(scope="session")
def base_url():
    """返回 API 服务的基础 URL"""
    return BASE_URL


@pytest.fixture(scope="session")
def registered_user(base_url):
    """注册新用户并登录，返回 {username, password, token}"""
    username = f"test_{uuid.uuid4().hex[:8]}"
    password = "TestPass123"

    # 注册
    resp = requests.post(f"{base_url}/register", json={
        "username": username,
        "password": password
    })
    assert resp.status_code == 200, f"注册失败: {resp.text}"

    # 登录获取 token
    resp = requests.post(f"{base_url}/login", json={
        "username": username,
        "password": password
    })
    assert resp.status_code == 200, f"登录失败: {resp.text}"
    token = resp.json()["token"]

    return {"username": username, "password": password, "token": token}


@pytest.fixture(scope="session")
def second_user(base_url):
    """注册第二个用户，用于跨用户隔离测试"""
    username = f"test2_{uuid.uuid4().hex[:8]}"
    password = "TestPass456"

    requests.post(f"{base_url}/register", json={
        "username": username, "password": password
    })
    resp = requests.post(f"{base_url}/login", json={
        "username": username, "password": password
    })
    return {"username": username, "password": password, "token": resp.json()["token"]}


@pytest.fixture
def auth_headers(registered_user):
    """返回带有效 token 的 Authorization 请求头"""
    return {"Authorization": f"Bearer {registered_user['token']}"}


@pytest.fixture
def expired_token():
    """返回一个已过期的 JWT token（exp 设为 1 小时前）"""
    payload = {
        "user_id": 1,
        "exp": int(time.time()) - 3600,
        "iat": int(time.time()) - 7200,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture
def invalid_token():
    """返回一个被篡改/伪造的 JWT token"""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.tampered_signature_xyz"


@pytest.fixture
def malformed_token():
    """返回一个格式错误的 token（随机字符串）"""
    return "this_is_not_a_valid_jwt_token_at_all"


def generate_content_of_size(size_bytes: int) -> str:
    """生成指定字节大小的文本内容（UTF-8 编码）"""
    if size_bytes <= 0:
        return ""
    # 对于小于 3 字节的情况，直接用单字节字符填充
    if size_bytes < 3:
        return "a" * size_bytes
    char_count = size_bytes // 3
    content = "测" * char_count
    while len(content.encode("utf-8")) < size_bytes:
        content += "a"
    while len(content.encode("utf-8")) > size_bytes:
        content = content[:-1]
    return content
