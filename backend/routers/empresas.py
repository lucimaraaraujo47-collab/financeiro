# Router de Empresas
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from database import db
from routers.auth import get_current_user

router = APIRouter(prefix="/empresas", tags=["Empresas"])

# ==================== ENDPOINTS ====================

@router.post("")
async def criar_empresa(
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar nova empresa"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    empresa_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    empresa = {
        "id": empresa_id,
        "nome": data.get("nome"),
        "cnpj": data.get("cnpj"),
        "email": data.get("email"),
        "telefone": data.get("telefone"),
        "endereco": data.get("endereco"),
        "cidade": data.get("cidade"),
        "estado": data.get("estado"),
        "cep": data.get("cep"),
        "logo_url": data.get("logo_url"),
        "ativo": True,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id")
    }
    
    await db.empresas.insert_one(empresa)
    
    # Adicionar empresa ao usuário criador
    await db.users.update_one(
        {"id": current_user.get("id")},
        {"$addToSet": {"empresa_ids": empresa_id}}
    )
    
    # Remover _id do retorno
    empresa.pop("_id", None)
    return empresa

@router.get("")
async def listar_empresas(
    ativo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar empresas"""
    query = {}
    
    # Admin master vê todas, outros veem apenas suas empresas
    if current_user.get("perfil") != "admin_master":
        empresa_ids = current_user.get("empresa_ids", [])
        if empresa_ids:
            query["id"] = {"$in": empresa_ids}
        else:
            return []
    
    if ativo is not None:
        query["ativo"] = ativo
    
    empresas = await db.empresas.find(query, {"_id": 0}).to_list(100)
    return empresas

@router.get("/{empresa_id}")
async def obter_empresa(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Obter empresa por ID"""
    empresa = await db.empresas.find_one({"id": empresa_id}, {"_id": 0})
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Verificar acesso
    if current_user.get("perfil") != "admin_master":
        if empresa_id not in current_user.get("empresa_ids", []):
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    return empresa

@router.put("/{empresa_id}")
async def atualizar_empresa(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar empresa"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    existing = await db.empresas.find_one({"id": empresa_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    campos_permitidos = ["nome", "cnpj", "email", "telefone", "endereco", "cidade", "estado", "cep", "logo_url"]
    for campo in campos_permitidos:
        if campo in data:
            update_data[campo] = data[campo]
    
    await db.empresas.update_one({"id": empresa_id}, {"$set": update_data})
    
    updated = await db.empresas.find_one({"id": empresa_id}, {"_id": 0})
    return updated

@router.patch("/{empresa_id}/status")
async def alterar_status_empresa(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Ativar/desativar empresa"""
    if current_user.get("perfil") != "admin_master":
        raise HTTPException(status_code=403, detail="Apenas admin_master pode alterar status")
    
    existing = await db.empresas.find_one({"id": empresa_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    ativo = data.get("ativo", True)
    
    await db.empresas.update_one(
        {"id": empresa_id},
        {"$set": {"ativo": ativo, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Empresa {'ativada' if ativo else 'desativada'} com sucesso"}

@router.delete("/{empresa_id}")
async def excluir_empresa(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Excluir empresa (desativar)"""
    if current_user.get("perfil") != "admin_master":
        raise HTTPException(status_code=403, detail="Apenas admin_master pode excluir empresas")
    
    existing = await db.empresas.find_one({"id": empresa_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Desativar em vez de excluir
    await db.empresas.update_one(
        {"id": empresa_id},
        {"$set": {"ativo": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Empresa excluída com sucesso"}

# ==================== SUB-RECURSOS DA EMPRESA ====================

@router.get("/{empresa_id}/usuarios")
async def listar_usuarios_empresa(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar usuários de uma empresa"""
    users = await db.users.find(
        {"empresa_ids": empresa_id},
        {"_id": 0, "senha_hash": 0}
    ).to_list(100)
    return users

@router.get("/{empresa_id}/tecnicos")
async def listar_tecnicos_empresa(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar técnicos de uma empresa"""
    users = await db.users.find(
        {
            "empresa_ids": empresa_id,
            "perfil": {"$in": ["tecnico", "operacional"]},
            "ativo": True
        },
        {"_id": 0, "senha_hash": 0}
    ).to_list(100)
    return users
