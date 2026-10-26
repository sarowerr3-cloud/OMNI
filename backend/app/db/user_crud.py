import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user record by email address."""
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
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
        full_name=full_name.strip() if full_name else "",
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
    # Ensure default users exist if database is fresh
    await ensure_seed_users(db)

    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def ensure_seed_users(db: AsyncSession) -> None:
    """Seed initial development users if they do not exist."""
    default_users = [
        ("admin@sourceiq.com", "admin123", "Admin User", "admin"),
        ("user@sourceiq.com", "user123", "Standard User", "user"),
    ]
    for email, pwd, name, role in default_users:
        existing = await get_user_by_email(db, email)
        if not existing:
            try:
                user = User(
                    email=email.lower().strip(),
                    hashed_password=hash_password(pwd),
                    full_name=name,
                    role=role,
                    is_active=True
                )
                db.add(user)
                await db.commit()
                logger.info(f"Seeded default user: {email}")
            except Exception as e:
                await db.rollback()
                logger.debug(f"User {email} might already exist or commit failed: {e}")
