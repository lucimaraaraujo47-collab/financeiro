# Router de Usuários
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from database import db
from routers.auth import get_current_user, hash_password
from config import PERFIS_PERMISSOES

router = APIRouter(prefix="/users", tags=["Usuários"])

# ==================== ENDPOINTS ====================

@router.get("")
async def list_users(
    perfil: Optional[str] = None,
    ativo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar todos os usuários (admin only)"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {}
    if perfil:
        query["perfil"] = perfil
    if ativo is not None:
        query["ativo"] = ativo
    
    users = await db.users.find(query, {"_id": 0, "senha_hash": 0}).to_list(500)
    return users

@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Obter usuário por ID"""
    if current_user.get("perfil") not in ["admin", "admin_master"] and current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "senha_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return user

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar usuário"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.get("nome"):
        update_data["nome"] = data["nome"]
    if data.get("telefone") is not None:
        update_data["telefone"] = data["telefone"]
    if data.get("email"):
        # Verificar se email já existe
        email_exists = await db.users.find_one({"email": data["email"], "id": {"$ne": user_id}})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        update_data["email"] = data["email"]
    
    if data.get("perfil"):
        perfil = data["perfil"]
        if perfil not in PERFIS_PERMISSOES:
            raise HTTPException(status_code=400, detail=f"Perfil inválido. Opções: {', '.join(PERFIS_PERMISSOES.keys())}")
        if perfil == "admin_master" and current_user.get("perfil") != "admin_master":
            raise HTTPException(status_code=403, detail="Apenas admin_master pode definir este perfil")
        update_data["perfil"] = perfil
    
    if data.get("ativo") is not None:
        update_data["ativo"] = data["ativo"]
    
    if data.get("senha"):
        update_data["senha_hash"] = hash_password(data["senha"])
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "senha_hash": 0})
    return updated

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Excluir/desativar usuário"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if user_id == current_user.get("id"):
        raise HTTPException(status_code=400, detail="Não é possível excluir seu próprio usuário")
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Desativar em vez de excluir
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"ativo": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Usuário desativado com sucesso"}

@router.post("/{user_id}/push-token")
async def save_push_token(
    user_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Salvar push token do usuário"""
    push_token = data.get("push_token")
    platform = data.get("platform", "android")
    device_name = data.get("device_name")
    
    if not push_token:
        raise HTTPException(status_code=400, detail="push_token é obrigatório")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "push_token": push_token,
            "push_platform": platform,
            "push_device_name": device_name,
            "push_token_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Token registrado com sucesso"}

@router.get("/{user_id}/permissions")
async def get_user_permissions(user_id: str, current_user: dict = Depends(get_current_user)):
    """Obter permissões do usuário"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "perfil": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    perfil = user.get("perfil", "consulta")
    permissoes = PERFIS_PERMISSOES.get(perfil, {})
    
    return {
        "user_id": user_id,
        "perfil": perfil,
        "permissoes": permissoes.get("permissoes", []),
        "descricao": permissoes.get("descricao", "")
    }
