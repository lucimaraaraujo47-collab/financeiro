# Routers do Backend
from .auth import router as auth_router, get_current_user, verificar_permissao, hash_password, verify_password
from .ordens_servico import router as ordens_servico_router
from .app_tecnico import router as app_tecnico_router

__all__ = [
    "auth_router",
    "ordens_servico_router", 
    "app_tecnico_router",
    "get_current_user",
    "verificar_permissao",
    "hash_password",
    "verify_password"
]
