import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.app.db.session import get_db
from backend.app.db.user_crud import get_user_by_email, authenticate_user, create_user
from backend.app.schemas.user import Token, UserLogin, UserCreate, UserOut
from backend.app.core.security import create_access_token, decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@router.post("/auth/login", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with email + password. Returns JWT access token."""
    user = await authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    token = create_access_token(subject=user.email, role=user.role)
    return Token(access_token=token, token_type="bearer", role=user.role)


@router.post("/auth/login/form", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 form-based login (for Swagger UI / docs)."""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    token = create_access_token(subject=user.email, role=user.role)
    return Token(access_token=token, token_type="bearer", role=user.role)


@router.post(
    "/auth/register",
    response_model=UserOut,
    tags=["Authentication"],
    status_code=status.HTTP_201_CREATED
)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account with hashed password."""
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    user = await create_user(
        db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name or "",
        role=payload.role or "user"
    )
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Dependency: decode JWT and return the authenticated user dict."""
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload["sub"]
    user = await get_user_by_email(db, email)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found or inactive")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active
    }


@router.get("/auth/me", response_model=UserOut, tags=["Authentication"])
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return UserOut(**current_user)
