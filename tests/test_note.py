from common.request_util import send_request


def test_create_note(token):
    data = {
        "title": "你好CC",
        "content": "## 我是一个测试笔记"
    }

    res = send_request("POST", "/api/notes", token=token, json=data)

    assert res.status_code == 200
    assert res.json()["message"] == "创建成功"


def test_get_notes(token):
    res = send_request("GET", "/api/notes", token=token)

    assert res.status_code == 200
    assert isinstance(res.json(), list)
