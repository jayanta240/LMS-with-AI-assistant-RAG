from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext

# --------------------------------
# JWT CONFIG
# --------------------------------

SECRET_KEY = "CHANGE_THIS_TO_LONG_RANDOM_SECRET"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# --------------------------------
# PASSWORD HASHING
# --------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# --------------------------------
# JWT TOKENS
# --------------------------------

def create_access_token(
    user_id,
    email,
    role,
    company_id,
    department_id
):

    expire = (
        datetime.utcnow()
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "company_id": company_id,
        "department_id": department_id,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def decode_token(token: str):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:

        return None