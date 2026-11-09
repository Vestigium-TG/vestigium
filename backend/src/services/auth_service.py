from fastapi import Header, HTTPException

TOKENS: dict[str, str] = {}

def get_current_user_id(x_token: str = Header(...)) -> str:
    user_id = TOKENS.get(x_token)
    if user_id is None:
        raise HTTPException(status_code=403, detail="Invalid token")
    return user_id
