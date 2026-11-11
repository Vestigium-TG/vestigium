import os
import uuid

import psycopg2
import pytest

os.environ.setdefault(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vestigium"
)

# Every user created by the tests uses this domain, so the data can be removed afterwards.
TEST_EMAIL_DOMAIN = "vestigium-pytest.com"


@pytest.fixture
def new_email():
    return lambda: f"{uuid.uuid4().hex}@{TEST_EMAIL_DOMAIN}"


def _database_available() -> bool:
    try:
        psycopg2.connect(os.environ["DATABASE_URL"], connect_timeout=3).close()
        return True
    except psycopg2.OperationalError:
        return False


DATABASE_AVAILABLE = _database_available()


def pytest_collection_modifyitems(config, items):
    if DATABASE_AVAILABLE:
        return
    skip = pytest.mark.skip(reason="PostgreSQL unavailable at DATABASE_URL")
    for item in items:
        if "integration" in item.keywords or "e2e" in item.keywords:
            item.add_marker(skip)


@pytest.fixture
def db():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    yield cursor
    conn.commit()
    cursor.close()
    conn.close()


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    yield
    if not DATABASE_AVAILABLE:
        return
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    users = "SELECT id FROM users WHERE email LIKE %s"
    investigations = f"SELECT id FROM investigations WHERE user_id IN ({users})"
    claims = f"SELECT id FROM claims WHERE investigation_id IN ({investigations})"
    pattern = (f"%@{TEST_EMAIL_DOMAIN}",)
    for table in ("evidences", "questions", "reflections"):
        cursor.execute(f"DELETE FROM {table} WHERE claim_id IN ({claims})", pattern)
    for table in ("claims", "sources", "conclusions"):
        cursor.execute(
            f"DELETE FROM {table} WHERE investigation_id IN ({investigations})",
            pattern,
        )
    cursor.execute(f"DELETE FROM investigations WHERE user_id IN ({users})", pattern)
    cursor.execute("DELETE FROM users WHERE email LIKE %s", pattern)
    conn.commit()
    cursor.close()
    conn.close()
