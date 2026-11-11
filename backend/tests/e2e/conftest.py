import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest
from dotenv import dotenv_values

BACKEND_SRC = Path(__file__).resolve().parents[2] / "src"
REPO_ROOT = Path(__file__).resolve().parents[3]


def _gemini_api_key() -> str | None:
    key = os.getenv("GEMINI_API_KEY") or dotenv_values(REPO_ROOT / ".env").get(
        "GEMINI_API_KEY"
    )
    # "chave" is the placeholder from .env.example.
    return key if key and key != "chave" else None


@pytest.fixture(scope="session")
def gemini_api_key():
    return _gemini_api_key()


@pytest.fixture(scope="session")
def server():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]

    env = dict(os.environ, GEMINI_API_KEY=_gemini_api_key() or "")
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", str(port)],
        cwd=BACKEND_SRC,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base_url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(60):
            try:
                if httpx.get(base_url + "/").status_code == 200:
                    break
            except httpx.TransportError:
                time.sleep(0.5)
        else:
            pytest.fail("uvicorn did not start")
        yield base_url
    finally:
        process.terminate()
        process.wait(timeout=10)


@pytest.fixture
def http(server):
    with httpx.Client(base_url=server, timeout=120) as client:
        yield client


@pytest.fixture
def user(http, new_email):
    email = new_email()
    assert http.post("/auth/register", json={"email": email, "password": "senha123"}).status_code == 200
    token = http.post("/auth/login", json={"email": email, "password": "senha123"}).json()["token"]
    return {"email": email, "headers": {"x-token": token}}
