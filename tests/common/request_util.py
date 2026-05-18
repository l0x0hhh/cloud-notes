import requests

BASE_URL = "http://127.0.0.1:8080"

def send_request(method, url, token=None, **kwargs):
    headers = kwargs.get("headers", {})

    if token:
        headers["Authorization"] = f"Bearer {token}"

    kwargs["headers"] = headers

    response = requests.request(method, BASE_URL + url, **kwargs)
    return response