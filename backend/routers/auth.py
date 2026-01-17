# Router de Autenticação
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import uuid
import logging

from database import db
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, PERFIS_PERMISSOES
from security_utils import log_security_event

router = APIRouter(prefix="/auth", tags=["Autenticação"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== FUNÇÕES AUXILIARES ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verificar_permissao(user: dict, permissao: str) -> bool:
    """Verifica se o usuário tem a permissão necessária"""
    perfil = user.get("perfil", "consulta")
    
    if perfil in ["admin", "admin_master"]:
        return True
    
    permissoes = PERFIS_PERMISSOES.get(perfil, {}).get("permissoes", [])
    return "*" in permissoes or permissao in permissoes

# ==================== ENDPOINTS ====================

@router.post("/login")
async def login(request: Request, email: str = None, senha: str = None, data: dict = None):
    """Login de usuário"""
    # Suportar body JSON ou form
    if data:
        email = data.get("email")
        senha = data.get("senha")
    
    if not email or not senha:
        raise HTTPException(status_code=400, detail="Email e senha são obrigatórios")
    
    # Buscar usuário
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        log_security_event(
            "LOGIN_FAILED",
            user_id=None,
            ip_address=request.client.host if request.client else None,
            details=f"Email não encontrado: {email}"
        )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar senha
    if not verify_password(senha, user.get("senha_hash", "")):
        log_security_event(
            "LOGIN_FAILED",
            user_id=user.get("id"),
            ip_address=request.client.host if request.client else None,
            details=f"Senha incorreta para: {email}"
        )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se está ativo
    if not user.get("ativo", True):
        raise HTTPException(status_code=401, detail="Usuário desativado")
    
    # Gerar token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Log de sucesso
    log_security_event(
        "LOGIN_SUCCESS",
        user_id=user.get("id"),
        ip_address=request.client.host if request.client else None,
        details=f"Email: {email}"
    )
    
    # Remover senha do retorno
    user_response = {k: v for k, v in user.items() if k != "senha_hash"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/register")
async def register(request: Request, data: dict, current_user: dict = Depends(get_current_user)):
    """Registrar novo usuário (apenas admin)"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Apenas administradores podem cadastrar usuários")
    
    email = data.get("email")
    nome = data.get("nome")
    senha = data.get("senha")
    perfil = data.get("perfil", "consulta")
    telefone = data.get("telefone")
    
    if not email or not nome or not senha:
        raise HTTPException(status_code=400, detail="Nome, email e senha são obrigatórios")
    
    # Validar perfil
    if perfil not in PERFIS_PERMISSOES:
        raise HTTPException(status_code=400, detail=f"Perfil inválido. Opções: {', '.join(PERFIS_PERMISSOES.keys())}")
    
    # Verificar se email já existe
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Criar usuário
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "nome": nome,
        "email": email,
        "senha_hash": hash_password(senha),
        "perfil": perfil,
        "telefone": telefone,
        "empresa_ids": data.get("empresa_ids", current_user.get("empresa_ids", [])),
        "ativo": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    log_security_event(
        "USER_REGISTERED",
        user_id=user_id,
        ip_address=request.client.host if request.client else None,
        details=f"User created: {email} by {current_user.get('email')}"
    )
    
    # Retornar sem senha
    del user_doc["senha_hash"]
    return user_doc

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Obter dados do usuário logado"""
    user = {k: v for k, v in current_user.items() if k != "senha_hash"}
    
    # Adicionar permissões do perfil
    perfil = user.get("perfil", "consulta")
    user["permissoes"] = PERFIS_PERMISSOES.get(perfil, {}).get("permissoes", [])
    
    return user

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (apenas para registro)"""
    log_security_event(
        "LOGOUT",
        user_id=current_user.get("id"),
        details=f"User logged out: {current_user.get('email')}"
    )
    return {"message": "Logout realizado com sucesso"}

@router.get("/perfis")
async def list_perfis(current_user: dict = Depends(get_current_user)):
    """Listar perfis disponíveis"""
    return PERFIS_PERMISSOES
