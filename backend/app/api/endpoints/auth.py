from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from backend.app.schemas.user import Token, UserLogin, UserCreate, UserOut
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# In-memory mock user store for Phase 1 initial setup / tests
# In Phase 2 this links directly to PostgreSQL via SQLAlchemy
MOCK_USERS_DB = {
    "admin@sourceiq.com": {
        "id": 1,
        "email": "admin@sourceiq.com",
        "hashed_password": hash_password("admin123"),
        "full_name": "SourceIQ Admin",
        "role": "admin",
        "is_active": True
    },
    "user@sourceiq.com": {
        "id": 2,
        "email": "user@sourceiq.com",
        "hashed_password": hash_password("user123"),
        "full_name": "Demo User",
        "role": "user",
        "is_active": True
    }
}


@router.post("/auth/login", response_model=Token, tags=["Authentication"])
async def login(credentials: UserLogin):
    user = MOCK_USERS_DB.get(credentials.email)
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="Inactive user account")

    token = create_access_token(subject=user["email"], role=user["role"])
    return Token(access_token=token, token_type="bearer", role=user["role"])


@router.post("/auth/login/form", response_model=Token, tags=["Authentication"])
async def login_form(form_data: OAuth2PasswordRequestForm = Depends()):
    user = MOCK_USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user["email"], role=user["role"])
    return Token(access_token=token, token_type="bearer", role=user["role"])


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload["sub"]
    user = MOCK_USERS_DB.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/auth/me", response_model=UserOut, tags=["Authentication"])
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(**current_user)
