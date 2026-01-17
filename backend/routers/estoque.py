# Router de Estoque e Equipamentos
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from database import db
from routers.auth import get_current_user

router = APIRouter(tags=["Estoque"])

# ==================== CATEGORIAS DE EQUIPAMENTOS ====================

@router.post("/empresas/{empresa_id}/categorias-equipamentos")
async def criar_categoria_equipamento(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar categoria de equipamento"""
    categoria_id = str(uuid.uuid4())
    
    categoria = {
        "id": categoria_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "descricao": data.get("descricao"),
        "ativo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categorias_equipamentos.insert_one(categoria)
    return categoria

@router.get("/empresas/{empresa_id}/categorias-equipamentos")
async def listar_categorias_equipamentos(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar categorias de equipamentos"""
    categorias = await db.categorias_equipamentos.find(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}},
        {"_id": 0}
    ).to_list(100)
    return categorias

# ==================== TIPOS DE EQUIPAMENTO ====================

@router.post("/empresas/{empresa_id}/tipos-equipamento")
async def criar_tipo_equipamento(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar tipo de equipamento"""
    tipo_id = str(uuid.uuid4())
    
    tipo = {
        "id": tipo_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "categoria_id": data.get("categoria_id"),
        "descricao": data.get("descricao"),
        "marca": data.get("marca"),
        "modelo": data.get("modelo"),
        "valor_referencia": data.get("valor_referencia", 0),
        "ativo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tipos_equipamento.insert_one(tipo)
    return tipo

@router.get("/empresas/{empresa_id}/tipos-equipamento")
async def listar_tipos_equipamento(
    empresa_id: str,
    categoria_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar tipos de equipamentos"""
    query = {"empresa_id": empresa_id, "ativo": {"$ne": False}}
    if categoria_id:
        query["categoria_id"] = categoria_id
    
    tipos = await db.tipos_equipamento.find(query, {"_id": 0}).to_list(100)
    return tipos

# ==================== EQUIPAMENTOS ====================

@router.post("/empresas/{empresa_id}/equipamentos")
async def criar_equipamento(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar equipamento"""
    equip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    equipamento = {
        "id": equip_id,
        "empresa_id": empresa_id,
        "tipo_id": data.get("tipo_id"),
        "numero_serie": data.get("numero_serie"),
        "patrimonio": data.get("patrimonio"),
        "nome": data.get("nome"),
        "descricao": data.get("descricao"),
        "marca": data.get("marca"),
        "modelo": data.get("modelo"),
        "status": data.get("status", "disponivel"),  # disponivel, em_uso, manutencao, baixa
        "localizacao": data.get("localizacao", "estoque"),  # estoque, tecnico, cliente
        "tecnico_id": data.get("tecnico_id"),
        "cliente_id": data.get("cliente_id"),
        "os_id": data.get("os_id"),
        "data_aquisicao": data.get("data_aquisicao"),
        "valor_aquisicao": data.get("valor_aquisicao", 0),
        "garantia_ate": data.get("garantia_ate"),
        "observacoes": data.get("observacoes"),
        "ativo": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.equipamentos_tecnicos.insert_one(equipamento)
    
    # Registrar histórico
    await _registrar_historico_equipamento(
        equip_id, "CRIACAO", 
        f"Equipamento cadastrado", 
        current_user.get("id")
    )
    
    return equipamento

@router.get("/empresas/{empresa_id}/equipamentos-tecnicos")
async def listar_equipamentos(
    empresa_id: str,
    status: Optional[str] = None,
    localizacao: Optional[str] = None,
    tecnico_id: Optional[str] = None,
    tipo_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Listar equipamentos"""
    query = {"empresa_id": empresa_id, "ativo": {"$ne": False}}
    
    if status:
        query["status"] = status
    if localizacao:
        query["localizacao"] = localizacao
    if tecnico_id:
        query["tecnico_id"] = tecnico_id
    if tipo_id:
        query["tipo_id"] = tipo_id
    
    equipamentos = await db.equipamentos_tecnicos.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    # Enriquecer com nome do técnico
    for eq in equipamentos:
        if eq.get("tecnico_id"):
            tecnico = await db.users.find_one({"id": eq["tecnico_id"]}, {"_id": 0, "nome": 1})
            eq["tecnico_nome"] = tecnico.get("nome") if tecnico else None
    
    return equipamentos

@router.get("/equipamentos/{equipamento_id}")
async def obter_equipamento(equipamento_id: str, current_user: dict = Depends(get_current_user)):
    """Obter equipamento por ID"""
    equipamento = await db.equipamentos_tecnicos.find_one({"id": equipamento_id}, {"_id": 0})
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    # Buscar histórico
    historico = await db.historico_equipamentos.find(
        {"equipamento_id": equipamento_id},
        {"_id": 0}
    ).sort("data", -1).limit(50).to_list(50)
    
    equipamento["historico"] = historico
    return equipamento

@router.put("/equipamentos/{equipamento_id}")
async def atualizar_equipamento(
    equipamento_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar equipamento"""
    existing = await db.equipamentos_tecnicos.find_one({"id": equipamento_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    campos = ["nome", "descricao", "marca", "modelo", "status", "localizacao", 
              "tecnico_id", "cliente_id", "observacoes", "garantia_ate"]
    
    for campo in campos:
        if campo in data:
            update[campo] = data[campo]
    
    # Registrar mudança de status/localizacao no histórico
    if "status" in data and data["status"] != existing.get("status"):
        await _registrar_historico_equipamento(
            equipamento_id, "MUDANCA_STATUS",
            f"Status alterado de {existing.get('status')} para {data['status']}",
            current_user.get("id")
        )
    
    if "localizacao" in data and data["localizacao"] != existing.get("localizacao"):
        await _registrar_historico_equipamento(
            equipamento_id, "MOVIMENTACAO",
            f"Movido de {existing.get('localizacao')} para {data['localizacao']}",
            current_user.get("id")
        )
    
    await db.equipamentos_tecnicos.update_one({"id": equipamento_id}, {"$set": update})
    return await db.equipamentos_tecnicos.find_one({"id": equipamento_id}, {"_id": 0})

@router.post("/equipamentos/{equipamento_id}/transferir")
async def transferir_equipamento(
    equipamento_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Transferir equipamento para técnico ou estoque"""
    equipamento = await db.equipamentos_tecnicos.find_one({"id": equipamento_id})
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    destino = data.get("destino", "estoque")  # estoque, tecnico, cliente
    tecnico_id = data.get("tecnico_id")
    cliente_id = data.get("cliente_id")
    motivo = data.get("motivo", "")
    
    update = {
        "localizacao": destino,
        "tecnico_id": tecnico_id if destino == "tecnico" else None,
        "cliente_id": cliente_id if destino == "cliente" else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.equipamentos_tecnicos.update_one({"id": equipamento_id}, {"$set": update})
    
    # Registrar no histórico
    destino_nome = destino
    if tecnico_id:
        tecnico = await db.users.find_one({"id": tecnico_id}, {"nome": 1})
        destino_nome = f"técnico {tecnico.get('nome', tecnico_id)}"
    
    await _registrar_historico_equipamento(
        equipamento_id, "TRANSFERENCIA",
        f"Transferido para {destino_nome}. {motivo}",
        current_user.get("id")
    )
    
    return {"message": f"Equipamento transferido para {destino_nome}"}

# ==================== HISTÓRICO DE EQUIPAMENTOS ====================

async def _registrar_historico_equipamento(equipamento_id: str, tipo: str, descricao: str, user_id: str):
    """Registrar evento no histórico do equipamento"""
    historico = {
        "id": str(uuid.uuid4()),
        "equipamento_id": equipamento_id,
        "tipo": tipo,
        "descricao": descricao,
        "user_id": user_id,
        "data": datetime.now(timezone.utc).isoformat()
    }
    await db.historico_equipamentos.insert_one(historico)

@router.get("/equipamentos/{equipamento_id}/historico")
async def obter_historico_equipamento(
    equipamento_id: str, 
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Obter histórico completo do equipamento"""
    historico = await db.historico_equipamentos.find(
        {"equipamento_id": equipamento_id},
        {"_id": 0}
    ).sort("data", -1).limit(limit).to_list(limit)
    
    # Enriquecer com nome do usuário
    for h in historico:
        if h.get("user_id"):
            user = await db.users.find_one({"id": h["user_id"]}, {"nome": 1})
            h["user_nome"] = user.get("nome") if user else None
    
    return historico

# ==================== DASHBOARD DE ESTOQUE ====================

@router.get("/empresas/{empresa_id}/equipamentos-tecnicos/dashboard")
async def dashboard_estoque(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Dashboard de estoque"""
    # Total por status
    pipeline = [
        {"$match": {"empresa_id": empresa_id, "ativo": {"$ne": False}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.equipamentos_tecnicos.aggregate(pipeline).to_list(10)
    
    # Total por localização
    pipeline = [
        {"$match": {"empresa_id": empresa_id, "ativo": {"$ne": False}}},
        {"$group": {"_id": "$localizacao", "count": {"$sum": 1}}}
    ]
    localizacao_counts = await db.equipamentos_tecnicos.aggregate(pipeline).to_list(10)
    
    # Total geral
    total = await db.equipamentos_tecnicos.count_documents(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}}
    )
    
    return {
        "total": total,
        "por_status": {s["_id"]: s["count"] for s in status_counts},
        "por_localizacao": {l["_id"]: l["count"] for l in localizacao_counts}
    }
