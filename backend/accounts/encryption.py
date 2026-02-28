# ============================================================================
# accounts/encryption.py — Field-level AES-256 encryption utility
# ============================================================================
# Uses the `cryptography` library (Fernet symmetric encryption).
# Sensitive financial fields (unit prices, totals) are encrypted at rest.
#
# Usage:
#   from accounts.encryption import encrypt_value, decrypt_value
#   cipher_text = encrypt_value("123.45")
#   plain_text  = decrypt_value(cipher_text)  # "123.45"
# ============================================================================

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _get_fernet():
    """Return a Fernet instance using the project encryption key."""
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        raise ValueError(
            "FIELD_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_value(plain_text: str) -> str:
    """Encrypt a plaintext string and return a URL-safe base64 token."""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_value(cipher_text: str) -> str:
    """Decrypt a Fernet token back to plaintext."""
    f = _get_fernet()
    try:
        return f.decrypt(cipher_text.encode()).decode()
    except InvalidToken:
        raise ValueError("Decryption failed — invalid token or wrong key.")
