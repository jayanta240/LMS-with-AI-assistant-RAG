from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from services.auth_service import decode_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    payload = decode_token(token)

    if payload is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return payload