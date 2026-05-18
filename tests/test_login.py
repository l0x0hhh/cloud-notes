import pytest
import yaml
import os
from common.request_util import send_request

data_path = os.path.join(os.path.dirname(__file__), "data", "test_data.yaml")
data = yaml.safe_load(open(data_path))

@pytest.mark.parametrize("case", data["login"])
def test_login(case):
    res = send_request("POST", "/login", json={
        "username": case["username"],
        "password": case["password"]
    })

    assert res.status_code == case["expect"]