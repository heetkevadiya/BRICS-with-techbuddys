import hashlib
import secrets
import string

_ALPHABET = string.ascii_uppercase + string.digits


def new_tracking_code(prefix: str = "GJ") -> str:
    return prefix + "-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))


def citizen_hash(identifier: str | None, salt: str = "brics-dpg") -> str | None:
    """One-way hash of phone/session so analytics can count unique citizens without storing PII."""
    if not identifier:
        return None
    return hashlib.sha256(f"{salt}:{identifier.strip().lower()}".encode()).hexdigest()
