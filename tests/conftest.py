import pytest
from common.request_util import send_request


@pytest.fixture(scope="session")
def token():
    data = {
        "username": "test",
        "password": "123456"
    }

    res = send_request("POST", "/login", json=data)
    return res.json()["token"]
