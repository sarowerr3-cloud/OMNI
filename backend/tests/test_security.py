from datetime import timedelta
import pytest
from backend.app.core.config import get_settings
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


def test_password_hashing_and_verification():
    raw_password = "SecurePassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(raw_password, "invalid_hash_string") is False


def test_access_token_creation_and_decoding():
    token = create_access_token(subject="user_test_42", role="admin")
    payload = decode_access_token(token)

    assert payload is not None
    assert payload.get("sub") == "user_test_42"
    assert payload.get("role") == "admin"
    assert "exp" in payload


def test_access_token_expired():
    # Token expired 10 minutes ago
    expired_delta = timedelta(minutes=-10)
    token = create_access_token(subject="expired_user", expires_delta=expired_delta)
    payload = decode_access_token(token)

    assert payload is None


def test_invalid_token_decoding():
    assert decode_access_token("not-a-valid-jwt-token") is None
    assert decode_access_token("") is None


def test_get_settings_caching():
    settings_1 = get_settings()
    settings_2 = get_settings()
    assert settings_1 is settings_2
