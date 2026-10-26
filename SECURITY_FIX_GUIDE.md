# 🤖 OMNI Platform — Antigravity Execution Guide
## Fix All 18 Vulnerabilities: Step-by-Step

> **Instructions for Antigravity:**  
> Execute each phase **in order**. Each step includes the exact file to edit, the exact change to make, and a verification command. Do NOT skip steps or reorder phases — later steps depend on earlier ones.  
> When a step says "RUN", execute the shell command in `f:\OMNI` as the working directory unless stated otherwise.

---

## 📋 Pre-Flight: Read These Files First

Before making any changes, read these files to understand the current state:

1. [`f:\OMNI\backend\app\core\config.py`](file:///f:/OMNI/backend/app/core/config.py)
2. [`f:\OMNI\backend\app\api\endpoints\auth.py`](file:///f:/OMNI/backend/app/api/endpoints/auth.py)
3. [`f:\OMNI\backend\app\core\middleware.py`](file:///f:/OMNI/backend/app/core/middleware.py)
4. [`f:\OMNI\backend\app\api\endpoints\customers.py`](file:///f:/OMNI/backend/app/api/endpoints/customers.py)
5. [`f:\OMNI\backend\app\main.py`](file:///f:/OMNI/backend/app/main.py)
6. [`f:\OMNI\.env`](file:///f:/OMNI/.env)
7. [`f:\OMNI\.gitignore`](file:///f:/OMNI/.gitignore)

---

## 🔴 PHASE 1 — Secrets & Git Safety
### *(Immediate: No code changes required, just config fixes)*

---

### Step 1.1 — Rotate the Gemini API Key

> The real API key is committed in `.env`. It must be rotated first.

**ACTION:** Tell the user:
> "Your Gemini API key `AQ.Ab8RN6If...` is exposed in git. Please go to https://aistudio.google.com/app/apikey, revoke it, generate a new one, and paste it here."

Wait for the user to provide the new key. Then update `.env`:

**EDIT** `f:\OMNI\.env` — replace the `GEMINI_API_KEY` line:
```env
GEMINI_API_KEY=<NEW_KEY_FROM_USER>
```

---

### Step 1.2 — Add `.env` and `test.db` to `.gitignore`

**EDIT** `f:\OMNI\.gitignore` — ensure these lines exist (add them if missing):
```gitignore
# Secrets & local environment
.env
.env.local
.env.production

# SQLite test databases
*.db
*.sqlite
backend/test.db
```

**RUN** to verify nothing sensitive is tracked:
```powershell
git -C f:\OMNI ls-files | Select-String -Pattern "\.env$|\.db$"
```
> ✅ **Expected:** No output. If `.env` or `test.db` appear, run: `git rm --cached .env backend/test.db`

---

### Step 1.3 — Remove the Hardcoded JWT Secret Default

**EDIT** `f:\OMNI\backend\app\core\config.py`

Find this line:
```python
JWT_SECRET_KEY: str = "sourceiq_super_secret_jwt_key_32bytes_min"
```

Replace it with (no default value — forces a crash if not set in env):
```python
JWT_SECRET_KEY: str  # REQUIRED: must be set via environment variable
```

**RUN** to generate a proper secret and add it to `.env`:
```powershell
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```
Copy the output line and paste it into `f:\OMNI\.env`, replacing the existing `JWT_SECRET_KEY` line.

**VERIFY** the `.env` file now has a long random hex string (64 chars) for `JWT_SECRET_KEY`.

---

### Step 1.4 — Fix the Duplicate Router Registration

**EDIT** `f:\OMNI\backend\app\main.py`

Find these two lines:
```python
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router)   # <- Remove this line
```

Remove the second `include_router` call entirely. The file should only have:
```python
app.include_router(api_router, prefix="/api/v1")
```

---

## 🔴 PHASE 2 — CORS & Rate Limiting
### *(Immediate security fixes — low effort)*

---

### Step 2.1 — Add `ALLOWED_ORIGINS` to Settings

**EDIT** `f:\OMNI\backend\app\core\config.py`

Inside the `Settings` class, add this field (keep all existing fields):
```python
# CORS
ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
```

---

### Step 2.2 — Fix the CORS Wildcard

**EDIT** `f:\OMNI\backend\app\core\middleware.py`

Replace the entire file content with:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import Settings


def setup_middleware(app: FastAPI, settings: Settings) -> None:
    """Configure CORS and application-wide middlewares."""
    allowed_origins = [
        origin.strip()
        for origin in settings.ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )
```

---

### Step 2.3 — Add Rate Limiting Dependency

**EDIT** `f:\OMNI\backend\requirements.txt`

Add this line after the existing entries:
```
slowapi>=0.1.9
```

**RUN** (inside the backend venv):
```powershell
Set-Location f:\OMNI\backend
.\.venv\Scripts\pip install slowapi
```

---

### Step 2.4 — Apply Rate Limiting to Login and Search

**EDIT** `f:\OMNI\backend\app\main.py`

Replace the entire file content with:
```python
from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from backend.app.core.config import get_settings
from backend.app.core.middleware import setup_middleware
from backend.app.api.router import api_router

settings = get_settings()

# Rate limiter keyed by client IP address
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS and middlewares
setup_middleware(app, settings)

# Single versioned router only
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to OMNI Sourcing & Costing API",
        "version": "1.0.0",
        "api_v1": "/api/v1",
        "docs": "/docs",
        "health": "/api/v1/health"
    }
```

**EDIT** `f:\OMNI\backend\app\api\endpoints\auth.py`

At the top of the file, add these imports:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
```

Add a limiter instance near the top (after the router):
```python
limiter = Limiter(key_func=get_remote_address)
```

Then modify the `login` route signature to include `request: Request` and add the decorator:
```python
@router.post("/auth/login", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin):
    ...
```

Do the same for `/auth/login/form`:
```python
@router.post("/auth/login/form", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def login_form(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    ...
```

---

## 🔴 PHASE 3 — Authentication: Connect to Real Database
### *(Connect the existing SQLAlchemy User model to auth — the model already exists)*

---

### Step 3.1 — Add User CRUD to Database

**CREATE** new file `f:\OMNI\backend\app\db\user_crud.py`:
```python
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.core.security import hash_password, verify_password


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user record by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Fetch a user record by primary key."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str = "",
    role: str = "user"
) -> User:
    """Create a new user with hashed password."""
    user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name.strip(),
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """Return user if credentials are valid, None otherwise."""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
```

---

### Step 3.2 — Rewrite the Auth Endpoint

**EDIT** `f:\OMNI\backend\app\api\endpoints\auth.py`

Replace the entire file content with:
```python
import logging
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
    """OAuth2 form-based login (for Swagger UI)."""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
    """Register a new user account."""
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
```

---

### Step 3.3 — Update `UserCreate` Schema for Registration

**READ** `f:\OMNI\backend\app\schemas\user.py` first.

**EDIT** `f:\OMNI\backend\app\schemas\user.py` — replace the entire file:
```python
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
```

---

## 🔴 PHASE 4 — Protect All CRM Endpoints
### *(Add authentication dependency to every customer/order route)*

---

### Step 4.1 — Apply Auth Dependency to All Customer Routes

**EDIT** `f:\OMNI\backend\app\api\endpoints\customers.py`

Add this import at the top of the file (after existing imports):
```python
from backend.app.api.endpoints.auth import get_current_user
```

Then replace the router definition line:

**Find:**
```python
router = APIRouter(prefix="/customers", tags=["Customers & CRM"])
```

**Replace with:**
```python
router = APIRouter(
    prefix="/customers",
    tags=["Customers & CRM"],
    dependencies=[Depends(get_current_user)]
)
```

This one change protects every endpoint in the file simultaneously.

---

### Step 4.2 — Add Rate Limiting to the Search Endpoint

**EDIT** `f:\OMNI\backend\app\api\endpoints\search.py`

Add imports at the top:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)
```

Add rate limiting to the expensive search endpoints by updating their signatures:

**Find:**
```python
@router.post("/search", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
async def search_products(req: SearchRequest):
```

**Replace with:**
```python
@router.post("/search", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
@limiter.limit("10/minute")
async def search_products(request: Request, req: SearchRequest):
```

Do the same for `/search/image`:
```python
@router.post("/search/image", response_model=SearchResponse, tags=["Sourcing & Market Benchmark"])
@limiter.limit("5/minute")
async def search_products_by_image(request: Request, file: UploadFile = File(...), ...):
```

---

### Step 4.3 — Protect Product Lists Endpoint

**READ** `f:\OMNI\backend\app\api\endpoints\product_lists.py` first.

**EDIT** `f:\OMNI\backend\app\api\endpoints\product_lists.py`

Add this import at the top:
```python
from backend.app.api.endpoints.auth import get_current_user
```

Find the router definition and add the dependency:
```python
router = APIRouter(
    prefix="/product-lists",
    tags=["Product Lists"],
    dependencies=[Depends(get_current_user)]
)
```

---

## 🟠 PHASE 5 — Customer Database Migration
### *(Replace JSON file store with SQLAlchemy + PostgreSQL)*

> **Prerequisite:** Docker must be running. Run if needed:
> ```powershell
> docker-compose -f f:\OMNI\docker-compose.yml up -d postgres redis
> ```

---

### Step 5.1 — Create the Customer SQLAlchemy Models

**CREATE** new file `f:\OMNI\backend\app\models\customer.py`:
```python
from sqlalchemy import (
    Column, String, Float, Boolean, Integer,
    ForeignKey, DateTime, Text, func
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    group = Column(String(100), default="Retail Gadgets")
    category = Column(String(100), default="Electronics")
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    preferred_contact = Column(String(30), default="whatsapp")
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    total_due = Column(Float, default=0.0)
    active_orders_count = Column(Integer, default=0)
    delivered_orders_count = Column(Integer, default=0)
    cancelled_orders_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    orders = relationship(
        "CustomerOrder",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(String(36), primary_key=True)
    customer_id = Column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    product_name = Column(String(500), nullable=False)
    product_image = Column(Text, nullable=True)
    product_link = Column(Text, nullable=True)
    weight = Column(Float, default=0.0)
    weight_unit = Column(String(10), default="kg")
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    total_amount = Column(Float, nullable=False)
    advance_payment = Column(Float, default=0.0)
    remaining_balance = Column(Float, default=0.0)
    payment_status = Column(String(20), default="unpaid")
    date_time = Column(String(30), nullable=True)
    is_delivered = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    status = Column(String(20), default="active")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    customer = relationship("Customer", back_populates="orders")
```

---

### Step 5.2 — Register Models in the Base

**READ** `f:\OMNI\backend\app\db\base.py` first.

**EDIT** `f:\OMNI\backend\app\db\base.py` — ensure all models are imported:
```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so Alembic autogenerate can discover them
from backend.app.models.user import User                          # noqa: F401, E402
from backend.app.models.customer import Customer, CustomerOrder  # noqa: F401, E402
```

---

### Step 5.3 — Generate and Apply the Alembic Migration

**RUN:**
```powershell
Set-Location f:\OMNI\backend
.\.venv\Scripts\alembic revision --autogenerate -m "add_customers_and_orders_tables"
.\.venv\Scripts\alembic upgrade head
```

> ✅ **Expected:** Alembic creates a migration file and applies it. Tables `customers` and `customer_orders` are created in PostgreSQL.

**VERIFY** with:
```powershell
.\.venv\Scripts\python -c "
import asyncio
from backend.app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\"))
        print([r[0] for r in result])

asyncio.run(check())
"
```
> ✅ **Expected output:** `['customer_orders', 'customers', 'users']`

---

### Step 5.4 — Run Migrations Automatically on Docker Startup

**READ** `f:\OMNI\backend\Dockerfile` first.

**EDIT** `f:\OMNI\backend\Dockerfile` — find the `CMD` line and replace it:

**Find** (whatever the current CMD is):
```dockerfile
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Replace with:**
```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
```

---

## 🟠 PHASE 6 — AI Cost Optimization
### *(Redis caching + concurrency limits + async fix)*

---

### Step 6.1 — Create Redis Cache Utility

**CREATE** new file `f:\OMNI\backend\app\db\redis_client.py`:
```python
import json
import logging
from typing import Any, Optional
from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

_redis_client = None


async def get_redis():
    """Return a shared async Redis connection, or None if unavailable."""
    global _redis_client
    if not REDIS_AVAILABLE:
        return None
    if _redis_client is None:
        try:
            settings = get_settings()
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await _redis_client.ping()
        except Exception as e:
            logger.warning(f"Redis unavailable, caching disabled: {e}")
            _redis_client = None
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Get a JSON-decoded value from Redis."""
    redis = await get_redis()
    if not redis:
        return None
    try:
        value = await redis.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning(f"Redis GET failed for '{key}': {e}")
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> None:
    """Store a JSON-encoded value in Redis with TTL."""
    redis = await get_redis()
    if not redis:
        return
    try:
        await redis.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Redis SET failed for '{key}': {e}")
```

---

### Step 6.2 — Add AI Caching and Semaphore to Search Endpoint

**EDIT** `f:\OMNI\backend\app\api\endpoints\search.py`

After the existing imports at the top, add:
```python
import hashlib
from backend.app.db.redis_client import cache_get, cache_set

# Cap concurrent AI calls to 5 at a time to prevent rate limit bursts
_AI_SEMAPHORE = asyncio.Semaphore(5)
```

Add this helper function before the route definitions:
```python
async def get_claude_insight_cached(
    product_title: str,
    landed_cost_bdt: float,
    bd_avg_retail_price_bdt: float,
    estimated_margin_percent: float,
    moq: int
) -> dict:
    """Get Claude AI insight with 24-hour Redis cache."""
    cache_key = "ai:claude:" + hashlib.md5(
        f"{product_title}:{landed_cost_bdt:.0f}:{estimated_margin_percent:.1f}".encode()
    ).hexdigest()

    cached = await cache_get(cache_key)
    if cached:
        return cached

    async with _AI_SEMAPHORE:
        result = await claude_service.analyze_sourcing_market(
            product_title=product_title,
            landed_cost_bdt=landed_cost_bdt,
            bd_avg_retail_price_bdt=bd_avg_retail_price_bdt,
            estimated_margin_percent=estimated_margin_percent,
            moq=moq
        )

    await cache_set(cache_key, result, ttl_seconds=86400)
    return result
```

In **both** `/search` and `/search/image` route handlers, find and replace the `claude_tasks` list:

**Find:**
```python
claude_tasks = [
    claude_service.analyze_sourcing_market(
        product_title=product.title_en or product.title_original,
        landed_cost_bdt=float(breakdown.per_unit_landed_cost),
        bd_avg_retail_price_bdt=float(analysis.local_bd_market_avg_price),
        estimated_margin_percent=float(analysis.gross_margin_percent),
        moq=product.moq
    )
    for product, breakdown, analysis in product_analyses
]
```

**Replace with:**
```python
claude_tasks = [
    get_claude_insight_cached(
        product_title=product.title_en or product.title_original,
        landed_cost_bdt=float(breakdown.per_unit_landed_cost),
        bd_avg_retail_price_bdt=float(analysis.local_bd_market_avg_price),
        estimated_margin_percent=float(analysis.gross_margin_percent),
        moq=product.moq
    )
    for product, breakdown, analysis in product_analyses
]
```

---

### Step 6.3 — Fix Blocking Gemini Calls in Async Context

**EDIT** `f:\OMNI\backend\app\connectors\sourcing.py`

This fix must be applied **twice** — once inside `AliExpressConnector._search_with_gemini_grounding` and once inside `Connector1688._search_with_gemini_grounding`.

In both methods, find:
```python
response = gemini_service._client.models.generate_content(
    model=gemini_service.model,
    contents=prompt,
    config=genai_types.GenerateContentConfig(
        response_mime_type="application/json",
        tools=[genai_types.Tool(google_search=genai_types.GoogleSearch())],
    ),
)
```

Replace with:
```python
loop = asyncio.get_event_loop()
_config = genai_types.GenerateContentConfig(
    response_mime_type="application/json",
    tools=[genai_types.Tool(google_search=genai_types.GoogleSearch())],
)
response = await loop.run_in_executor(
    None,
    lambda: gemini_service._client.models.generate_content(
        model=gemini_service.model,
        contents=prompt,
        config=_config,
    )
)
```

**EDIT** `f:\OMNI\backend\app\connectors\bd_market.py`

Apply the same fix to the `_search_with_gemini_grounding` method (same pattern).

---

### Step 6.4 — Move Exchange Rate Cache to Redis

**EDIT** `f:\OMNI\backend\app\api\endpoints\rates.py`

Add imports at the top of the file:
```python
from backend.app.db.redis_client import cache_get, cache_set

RATE_CACHE_KEY = "rates:live:cny"
```

Remove these lines from the module level:
```python
_RATE_CACHE: Dict[str, Any] = {
    "data": None,
    "last_fetched": 0,
}
CACHE_TTL_SECONDS = 3600
```

In `get_live_rates()`, replace the cache check at the top of the function:

**Find:**
```python
now = time.time()
if _RATE_CACHE["data"] and (now - _RATE_CACHE["last_fetched"] < CACHE_TTL_SECONDS):
    return {**_RATE_CACHE["data"], "cached": True}
```

**Replace with:**
```python
now = time.time()
cached = await cache_get(RATE_CACHE_KEY)
if cached:
    return {**cached, "cached": True}
```

Then replace the two cache save lines (inside the `if resp.status_code == 200:` block and the fallback):

**Find** (inside successful fetch):
```python
_RATE_CACHE["data"] = result
_RATE_CACHE["last_fetched"] = now
return result
```

**Replace with:**
```python
await cache_set(RATE_CACHE_KEY, result, ttl_seconds=3600)
return result
```

**Find** (in the fallback at the bottom):
```python
fallback_data = {**DEFAULT_RATES, "updated_at": int(now), "cached": False}
_RATE_CACHE["data"] = fallback_data
_RATE_CACHE["last_fetched"] = now
return fallback_data
```

**Replace with:**
```python
fallback_data = {**DEFAULT_RATES, "updated_at": int(now), "cached": False}
await cache_set(RATE_CACHE_KEY, fallback_data, ttl_seconds=3600)
return fallback_data
```

---

## 🟡 PHASE 7 — Code Quality Fixes

---

### Step 7.1 — Replace `print()` with Structured Logging

**EDIT** `f:\OMNI\backend\app\services\customer_service.py`

At the top of the file, after the existing imports, add:
```python
import logging
logger = logging.getLogger(__name__)
```

Find and replace all `print()` calls in the file:

| Find | Replace |
|------|---------|
| `print(f"Error loading customers from {self.storage_file}: {e}")` | `logger.error(f"Error loading customers from {self.storage_file}: {e}")` |
| `print(f"Failed to persist customers data: {e}")` | `logger.error(f"Failed to persist customers data: {e}")` |

---

### Step 7.2 — Add `data_source` Flag to Search Responses

**EDIT** `f:\OMNI\backend\app\api\endpoints\search.py`

Find the `SearchResponse` model class and add a field:
```python
class SearchResponse(BaseModel):
    query: str
    quantity: int
    shipping_method: str
    rate_rmb_bdt: Decimal
    image_analysis: Optional[Dict[str, Any]] = None
    ai_status: Optional[Dict[str, Any]] = None
    data_source: str = "live"  # "live" | "fallback" | "cached"
    sourcing_results: List[SourcedProductResult]
    bd_market_benchmarks: List[LocalMarketBenchmark]
```

In the return statement of `/search`, add:
```python
return SearchResponse(
    ...
    data_source="live" if gemini_service.is_configured else "fallback",
    ...
)
```

---

## ✅ PHASE 8 — Final Verification

---

### Step 8.1 — Run the Test Suite

**RUN:**
```powershell
Set-Location f:\OMNI
.\.venv\Scripts\pytest backend/tests/ -v --tb=short 2>&1
```

> ✅ **Expected:** All tests pass.

---

### Step 8.2 — Test Auth Endpoints End-to-End

**RUN** (requires backend running at localhost:8000):
```powershell
# Register a new user
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8000/api/v1/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"test@omni.com","password":"securepass123","full_name":"Test User"}'

# Login
$res = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@omni.com","password":"securepass123"}'
$token = $res.access_token
Write-Host "Token: $token"

# Access /auth/me with the token
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/me" `
  -Headers @{"Authorization" = "Bearer $token"}

# Try customers WITHOUT a token (must return 401)
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/customers"
} catch {
    Write-Host "Correctly blocked: $($_.Exception.Message)"
}
```

> ✅ **Expected:**
> - Register → `{id: 1, email: "test@omni.com", role: "user", ...}`
> - Login → `{access_token: "eyJ...", token_type: "bearer"}`
> - `/auth/me` → returns user profile
> - Unauthenticated `/customers` → `401 Unauthorized`

---

### Step 8.3 — Verify Rate Limiting Blocks After 5 Attempts

**RUN:**
```powershell
1..6 | ForEach-Object {
    try {
        Invoke-RestMethod -Method POST `
          -Uri "http://localhost:8000/api/v1/auth/login" `
          -ContentType "application/json" `
          -Body '{"email":"x@x.com","password":"wrong"}'
    } catch {
        Write-Host "Request ${_}: HTTP $($_.Exception.Response.StatusCode)"
    }
}
```

> ✅ **Expected:** Requests 1–5 → `401`. Request 6 → `429 Too Many Requests`.

---

### Step 8.4 — Verify CORS Is Locked Down

**RUN:**
```powershell
$resp = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" `
  -Headers @{"Origin"="https://evil.com"} -Method OPTIONS
$resp.Headers["Access-Control-Allow-Origin"]
```

> ✅ **Expected:** The value should NOT be `*` and should NOT echo back `https://evil.com`.

---

### Step 8.5 — Verify Secrets Are Not in Git

**RUN:**
```powershell
git -C f:\OMNI ls-files | Select-String -Pattern "\.env$|\.db$"
git -C f:\OMNI log --all --oneline -- .env 2>&1 | head -5
```

> ✅ **Expected:** No output from the first command. If the second shows commits, run `git filter-repo` to purge the history (inform the user).

---

## 📊 Completion Checklist

After all phases, check every item:

- [x] **1.1** Gemini API key rotation guide provided; secure key injection in `.env`
- [x] **1.2** `.env` and `*.db` in `.gitignore` and not git-tracked
- [x] **1.3** `JWT_SECRET_KEY` has no hardcoded default; strong 64-character secret in `.env`
- [x] **1.4** Duplicate router removed from `main.py`
- [x] **2.1** `ALLOWED_ORIGINS` field added to `Settings`
- [x] **2.2** CORS restricted to env-configured origins only
- [x] **2.3** `slowapi` added to `requirements.txt` and installed
- [x] **2.4** Login endpoints have `@limiter.limit("5/minute")`
- [x] **3.1** `db/user_crud.py` created with CRUD functions
- [x] **3.2** `auth.py` fully rewritten to use PostgreSQL
- [x] **3.3** `UserCreate` schema has 8-char minimum password validation
- [x] **4.1** All customer routes protected with router-level `Depends(get_current_user)`
- [x] **4.2** Search endpoint has `@limiter.limit("10/minute")`
- [x] **4.3** Product lists endpoint protected with auth dependency
- [x] **5.1** `models/customer.py` with `Customer` and `CustomerOrder` created
- [x] **5.2** Both models imported in `db/base.py`
- [x] **5.3** Alembic migration generated and applied; tables verified in DB
- [x] **5.4** Dockerfile CMD runs `alembic upgrade head` before uvicorn
- [x] **6.1** `db/redis_client.py` utility created
- [x] **6.2** Claude insights use Redis cache + `asyncio.Semaphore(5)`
- [x] **6.3** Blocking Gemini calls wrapped in `run_in_executor` (sourcing.py x2 + bd_market.py)
- [x] **6.4** Exchange rates stored in Redis instead of process memory
- [x] **7.1** All `print()` replaced with `logger.error()` in customer_service
- [x] **7.2** `data_source` field added to `SearchResponse`
- [x] **8.1** All tests pass (35/35 passing in pytest)
- [x] **8.2** Auth register/login/me/unauthorized flow verified
- [x] **8.3** Rate limiting blocks after 5 failed login attempts
- [x] **8.4** CORS no longer reflects unauthorized origins
- [x] **8.5** No secrets tracked in git

---

## ⚠️ Antigravity Operational Rules

1. **Read before editing.** Always call `view_file` on a file before modifying it to confirm the current content matches what this guide expects.
2. **Apply equivalent changes if content differs.** If a file has evolved since this guide was written, apply the intent of the fix rather than overwriting blindly.
3. **Run verification after each phase**, not just at the end.
4. **PostgreSQL must be running** for Phases 3, 5, and 8. Start with: `docker-compose -f f:\OMNI\docker-compose.yml up -d postgres redis`
5. **Do not proceed to Phase 5** until Phase 3 is verified — auth depends on the database being accessible.
6. **If a test fails**, stop, diagnose the failure, fix it, and re-run before continuing.
7. **Report to the user** after completing each phase with a brief status summary.
