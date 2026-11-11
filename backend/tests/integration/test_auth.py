import pytest

pytestmark = pytest.mark.integration


def register(client, email, password="senha123"):
    return client.post("/auth/register", json={"email": email, "password": password})


def login(client, email, password="senha123"):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_creates_user_with_hashed_password(client, db, new_email):
    email = new_email()
    response = register(client, email)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == email and body["id"] and body["created_at"]
    assert "password" not in body and "password_hash" not in body

    db.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
    password_hash = db.fetchone()[0]
    # RNF03: stored as a bcrypt hash, never in plain text.
    assert password_hash != "senha123" and password_hash.startswith("$2")


def test_register_duplicate_email_is_conflict(client, new_email):
    email = new_email()
    register(client, email)
    assert register(client, email).status_code == 409


@pytest.mark.parametrize(
    "body",
    [{"email": "not-an-email", "password": "x"}, {"email": "a@b.com"}, {}],
)
def test_register_invalid_body(client, body):
    assert client.post("/auth/register", json=body).status_code == 422


def test_login_returns_token_usable_on_me(client, new_email):
    email = new_email()
    user_id = register(client, email).json()["id"]
    response = login(client, email)
    assert response.status_code == 200
    token = response.json()["token"]

    me = client.get("/auth/me", headers={"x-token": token})
    assert me.status_code == 200
    assert me.json()["id"] == user_id and me.json()["email"] == email


@pytest.mark.parametrize("wrong", ["wrong-password", None])
def test_login_invalid_credentials(client, new_email, wrong):
    email = new_email()
    register(client, email)
    response = (
        login(client, email, wrong) if wrong else login(client, new_email())
    )
    assert response.status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/auth/me", headers={"x-token": "invalid"}).status_code == 403
    assert client.get("/auth/me").status_code == 422


def test_logout_invalidates_token(client, auth):
    assert client.post("/auth/logout", headers=auth).status_code == 200
    assert client.get("/auth/me", headers=auth).status_code == 403
    assert client.get("/investigations", headers=auth).status_code == 403
