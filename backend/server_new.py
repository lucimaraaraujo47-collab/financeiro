# ECHO SHOP - Backend Server (Refatorado)
# Este é o novo server.py que utiliza a estrutura modular de routers

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from database import db, client
from config import API_PREFIX, UPLOAD_DIR
from routers import all_routers

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Iniciando ECHO SHOP Backend...")
    logger.info(f"📁 Upload dir: {UPLOAD_DIR}")
    
    # Criar diretórios necessários
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(f"{UPLOAD_DIR}/apk", exist_ok=True)
    
    # Criar índices no MongoDB
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.empresas.create_index("id", unique=True)
        await db.ordens_servico.create_index("id", unique=True)
        await db.ordens_servico.create_index("numero", unique=True)
        await db.equipamentos_tecnicos.create_index("id", unique=True)
        logger.info("✅ Índices do MongoDB criados/verificados")
    except Exception as e:
        logger.warning(f"⚠️ Erro ao criar índices: {e}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Encerrando ECHO SHOP Backend...")
    client.close()

# Criar app
app = FastAPI(
    title="ECHO SHOP API",
    description="Sistema de Gestão Empresarial - Backend",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router principal com prefixo /api
api_router = APIRouter(prefix=API_PREFIX)

# Registrar todos os routers
for router in all_routers:
    api_router.include_router(router)
    logger.info(f"📌 Router registrado: {router.prefix}")

# Incluir router principal no app
app.include_router(api_router)

# Health check
@app.get("/api/health")
async def health_check():
    from datetime import datetime, timezone
    return {
        "status": "healthy",
        "service": "echoshop-backend",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Servir arquivos estáticos (uploads)
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
