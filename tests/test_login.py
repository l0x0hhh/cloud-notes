import pytest
import yaml
from common.request_util import send_request

with open("tests/data/test_data.yaml", encoding="utf-8") as file:
    data = yaml.safe_load(file)


@pytest.mark.parametrize("case", data["login"])
def test_login(case):
    res = send_request("POST", "/login", json={
        "username": case["username"],
        "password": case["password"]
    })

    assert res.status_code == case["expect"]
