from common.request_util import send_request

def test_create_note(token):
    data = {
        "title": "测试",
        "content": "内容"
    }

    res = send_request("POST", "/api/notes", token=token, json=data)

    assert res.status_code == 200
    assert res.json()["message"] == "创建成功"


def test_get_notes(token):
    res = send_request("GET", "/api/notes", token=token)

    assert res.status_code == 200
    assert isinstance(res.json(), list)