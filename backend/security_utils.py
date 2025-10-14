"""
Security utilities for FinAI system
"""
import re
import logging
from datetime import datetime, timezone
from typing import Optional
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "A senha deve ter no mínimo 8 caracteres"
    
    if not re.search(r"[a-z]", password):
        return False, "A senha deve conter pelo menos uma letra minúscula"
    
    if not re.search(r"[A-Z]", password):
        return False, "A senha deve conter pelo menos uma letra maiúscula"
    
    if not re.search(r"\d", password):
        return False, "A senha deve conter pelo menos um número"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "A senha deve conter pelo menos um caractere especial (!@#$%^&*...)"
    
    # Check for common passwords
    common_passwords = [
        "password", "123456", "12345678", "qwerty", "abc123",
        "monkey", "1234567", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "senha123", "senha", "admin", "root"
    ]
    
    if password.lower() in common_passwords:
        return False, "Esta senha é muito comum. Escolha uma senha mais segura"
    
    return True, ""

def sanitize_string(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks
    """
    if not text:
        return ""
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Limit length
    text = text[:max_length]
    
    # Remove suspicious patterns (basic XSS prevention)
    suspicious_patterns = [
        r'<script',
        r'javascript:',
        r'onerror=',
        r'onload=',
        r'onclick=',
        r'eval\(',
        r'expression\(',
    ]
    
    for pattern in suspicious_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    return text.strip()

def validate_cnpj(cnpj: str) -> bool:
    """Validate Brazilian CNPJ"""
    if not cnpj:
        return True  # Optional field
    
    # Remove non-digits
    cnpj = re.sub(r'\D', '', cnpj)
    
    # Check length
    if len(cnpj) != 14:
        return False
    
    # Check if all digits are the same
    if cnpj == cnpj[0] * 14:
        return False
    
    # Validate check digits (simplified)
    return True

def validate_cpf(cpf: str) -> bool:
    """Validate Brazilian CPF"""
    if not cpf:
        return True  # Optional field
    
    # Remove non-digits
    cpf = re.sub(r'\D', '', cpf)
    
    # Check length
    if len(cpf) != 11:
        return False
    
    # Check if all digits are the same
    if cpf == cpf[0] * 11:
        return False
    
    return True

def log_security_event(
    event_type: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[str] = None
):
    """
    Log security-related events for audit trail
    """
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "user_id": user_id,
        "ip_address": ip_address,
        "details": details
    }
    
    logger.warning(f"SECURITY_EVENT: {log_entry}")

def check_sql_injection(text: str) -> bool:
    """
    Check for SQL injection patterns
    Returns True if suspicious pattern found
    """
    if not text:
        return False
    
    sql_patterns = [
        r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)",
        r"(--|;|\/\*|\*\/)",
        r"(\bOR\b.*=.*|\bAND\b.*=.*)",
        r"'.*(\bOR\b|\bAND\b).*'",
    ]
    
    for pattern in sql_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    
    return False

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format"""
    if not phone:
        return True
    
    # Remove non-digits
    phone = re.sub(r'\D', '', phone)
    
    # Brazilian phone: 10-11 digits
    if len(phone) < 10 or len(phone) > 11:
        return False
    
    return True

class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded"""
    pass

# Store for tracking failed login attempts (in production, use Redis)
failed_login_attempts = {}

def check_brute_force(identifier: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
    """
    Check if identifier (IP or email) has exceeded login attempts
    Returns True if rate limit exceeded
    """
    now = datetime.now(timezone.utc)
    
    if identifier not in failed_login_attempts:
        failed_login_attempts[identifier] = []
    
    # Clean old attempts
    failed_login_attempts[identifier] = [
        attempt for attempt in failed_login_attempts[identifier]
        if (now - attempt).total_seconds() < window_minutes * 60
    ]
    
    # Check if exceeded
    if len(failed_login_attempts[identifier]) >= max_attempts:
        return True
    
    return False

def record_failed_login(identifier: str):
    """Record a failed login attempt"""
    if identifier not in failed_login_attempts:
        failed_login_attempts[identifier] = []
    
    failed_login_attempts[identifier].append(datetime.now(timezone.utc))

def clear_failed_logins(identifier: str):
    """Clear failed login attempts for identifier"""
    if identifier in failed_login_attempts:
        del failed_login_attempts[identifier]
