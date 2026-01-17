# Routers do Backend ECHO SHOP
from .auth import router as auth_router, get_current_user, verificar_permissao, hash_password, verify_password
from .usuarios import router as usuarios_router
from .empresas import router as empresas_router
from .financeiro import router as financeiro_router
from .estoque import router as estoque_router
from .vendas import router as vendas_router
from .ordens_servico import router as ordens_servico_router
from .app_tecnico import router as app_tecnico_router

# Lista de todos os routers para fácil inclusão
all_routers = [
    auth_router,
    usuarios_router,
    empresas_router,
    financeiro_router,
    estoque_router,
    vendas_router,
    ordens_servico_router,
    app_tecnico_router
]

__all__ = [
    "auth_router",
    "usuarios_router",
    "empresas_router", 
    "financeiro_router",
    "estoque_router",
    "vendas_router",
    "ordens_servico_router",
    "app_tecnico_router",
    "all_routers",
    "get_current_user",
    "verificar_permissao",
    "hash_password",
    "verify_password"
]
