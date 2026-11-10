import secrets
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import bcrypt
import psycopg2
from fastapi import APIRouter, Depends, Header, HTTPException

from database import connect_db
from models.auth_model import LoginRequest, RegisterRequest
from services.auth_service import TOKENS, get_current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(data: RegisterRequest):
    password_hash = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt())
    conn = connect_db()
    cursor = conn.cursor()

    now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    user_id = uuid.uuid4()

    try:
        cursor.execute(
            """
            INSERT INTO users (id, email, password_hash, created_at)
            VALUES (%s, %s, %s, %s)
            """,
            (str(user_id), data.email, password_hash.decode("utf-8"), now),
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    cursor.close()
    conn.close()

    return {"id": str(user_id), "email": data.email, "created_at": now}


@router.post("/login")
def login(data: LoginRequest):
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, password_hash FROM users WHERE email = %s",
        (data.email,),
    )
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if result is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, password_hash = result
    if not bcrypt.checkpw(data.password.encode("utf-8"), password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = secrets.token_hex(32)
    TOKENS[token] = str(user_id)

    return {"token": token}


@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, email, created_at FROM users WHERE id = %s",
        (user_id,),
    )
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if result is None:
        raise HTTPException(status_code=403, detail="Invalid token")

    return {
        "id": str(result[0]),
        "email": result[1],
        "created_at": result[2],
    }


@router.post("/logout")
def logout(x_token: str = Header(...)):
    TOKENS.pop(x_token, None)
    return {"message": "Session closed"}
