# Router Financeiro
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from routers.auth import get_current_user

router = APIRouter(tags=["Financeiro"])

# ==================== CATEGORIAS ====================

@router.post("/empresas/{empresa_id}/categorias")
async def criar_categoria(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar categoria financeira"""
    categoria_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    categoria = {
        "id": categoria_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "tipo": data.get("tipo", "despesa"),  # receita, despesa
        "cor": data.get("cor", "#6366f1"),
        "icone": data.get("icone"),
        "ativo": True,
        "created_at": now
    }
    
    await db.categorias.insert_one(categoria)
    return categoria

@router.get("/empresas/{empresa_id}/categorias")
async def listar_categorias(
    empresa_id: str,
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar categorias da empresa"""
    query = {"empresa_id": empresa_id, "ativo": {"$ne": False}}
    if tipo:
        query["tipo"] = tipo
    
    categorias = await db.categorias.find(query, {"_id": 0}).to_list(100)
    return categorias

@router.put("/categorias/{categoria_id}")
async def atualizar_categoria(
    categoria_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar categoria"""
    update = {}
    for campo in ["nome", "tipo", "cor", "icone"]:
        if campo in data:
            update[campo] = data[campo]
    
    if update:
        await db.categorias.update_one({"id": categoria_id}, {"$set": update})
    
    return await db.categorias.find_one({"id": categoria_id}, {"_id": 0})

@router.delete("/categorias/{categoria_id}")
async def excluir_categoria(categoria_id: str, current_user: dict = Depends(get_current_user)):
    """Excluir categoria"""
    await db.categorias.update_one({"id": categoria_id}, {"$set": {"ativo": False}})
    return {"message": "Categoria excluída"}

# ==================== CENTROS DE CUSTO ====================

@router.post("/empresas/{empresa_id}/centros-custo")
async def criar_centro_custo(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar centro de custo"""
    cc_id = str(uuid.uuid4())
    
    centro = {
        "id": cc_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "codigo": data.get("codigo"),
        "area": data.get("area"),
        "responsavel": data.get("responsavel"),
        "orcamento_mensal": data.get("orcamento_mensal", 0),
        "ativo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.centros_custo.insert_one(centro)
    return centro

@router.get("/empresas/{empresa_id}/centros-custo")
async def listar_centros_custo(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar centros de custo"""
    centros = await db.centros_custo.find(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}},
        {"_id": 0}
    ).to_list(100)
    return centros

# ==================== CONTAS BANCÁRIAS ====================

@router.post("/empresas/{empresa_id}/contas")
async def criar_conta(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar conta bancária"""
    conta_id = str(uuid.uuid4())
    
    conta = {
        "id": conta_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "banco": data.get("banco"),
        "agencia": data.get("agencia"),
        "numero": data.get("numero"),
        "tipo": data.get("tipo", "corrente"),
        "saldo_inicial": data.get("saldo_inicial", 0),
        "saldo_atual": data.get("saldo_inicial", 0),
        "cor": data.get("cor", "#3b82f6"),
        "ativo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contas.insert_one(conta)
    return conta

@router.get("/empresas/{empresa_id}/contas")
async def listar_contas(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar contas bancárias"""
    contas = await db.contas.find(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}},
        {"_id": 0}
    ).to_list(50)
    return contas

# ==================== TRANSAÇÕES ====================

@router.post("/empresas/{empresa_id}/transacoes")
async def criar_transacao(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar transação financeira"""
    transacao_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transacao = {
        "id": transacao_id,
        "empresa_id": empresa_id,
        "tipo": data.get("tipo", "despesa"),
        "descricao": data.get("descricao"),
        "valor": data.get("valor", 0),
        "data": data.get("data", now),
        "categoria_id": data.get("categoria_id"),
        "centro_custo_id": data.get("centro_custo_id"),
        "conta_id": data.get("conta_id"),
        "fornecedor_id": data.get("fornecedor_id"),
        "cliente_id": data.get("cliente_id"),
        "status": data.get("status", "confirmada"),
        "observacoes": data.get("observacoes"),
        "anexos": data.get("anexos", []),
        "created_by": current_user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.transacoes.insert_one(transacao)
    
    # Atualizar saldo da conta
    if transacao.get("conta_id") and transacao.get("status") == "confirmada":
        valor = transacao["valor"]
        if transacao["tipo"] == "despesa":
            valor = -valor
        await db.contas.update_one(
            {"id": transacao["conta_id"]},
            {"$inc": {"saldo_atual": valor}}
        )
    
    return transacao

@router.get("/empresas/{empresa_id}/transacoes")
async def listar_transacoes(
    empresa_id: str,
    tipo: Optional[str] = None,
    categoria_id: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limit: int = Query(50, le=500),
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Listar transações"""
    query = {"empresa_id": empresa_id}
    
    if tipo:
        query["tipo"] = tipo
    if categoria_id:
        query["categoria_id"] = categoria_id
    if data_inicio:
        query["data"] = {"$gte": data_inicio}
    if data_fim:
        if "data" not in query:
            query["data"] = {}
        query["data"]["$lte"] = data_fim
    
    transacoes = await db.transacoes.find(query, {"_id": 0})\
        .sort("data", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(limit)
    
    total = await db.transacoes.count_documents(query)
    
    return {
        "transacoes": transacoes,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/transacoes/{transacao_id}")
async def obter_transacao(transacao_id: str, current_user: dict = Depends(get_current_user)):
    """Obter transação por ID"""
    transacao = await db.transacoes.find_one({"id": transacao_id}, {"_id": 0})
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transacao

@router.put("/transacoes/{transacao_id}")
async def atualizar_transacao(
    transacao_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar transação"""
    existing = await db.transacoes.find_one({"id": transacao_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    campos = ["descricao", "valor", "data", "categoria_id", "centro_custo_id", "status", "observacoes"]
    
    for campo in campos:
        if campo in data:
            update[campo] = data[campo]
    
    await db.transacoes.update_one({"id": transacao_id}, {"$set": update})
    return await db.transacoes.find_one({"id": transacao_id}, {"_id": 0})

@router.delete("/transacoes/{transacao_id}")
async def excluir_transacao(transacao_id: str, current_user: dict = Depends(get_current_user)):
    """Excluir transação"""
    transacao = await db.transacoes.find_one({"id": transacao_id})
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Reverter saldo se necessário
    if transacao.get("conta_id") and transacao.get("status") == "confirmada":
        valor = transacao["valor"]
        if transacao["tipo"] == "receita":
            valor = -valor
        await db.contas.update_one(
            {"id": transacao["conta_id"]},
            {"$inc": {"saldo_atual": valor}}
        )
    
    await db.transacoes.delete_one({"id": transacao_id})
    return {"message": "Transação excluída"}

# ==================== DASHBOARD ====================

@router.get("/empresas/{empresa_id}/dashboard")
async def dashboard_financeiro(
    empresa_id: str,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Dashboard financeiro"""
    now = datetime.now(timezone.utc)
    mes = mes or now.month
    ano = ano or now.year
    
    # Definir período
    data_inicio = f"{ano}-{mes:02d}-01"
    if mes == 12:
        data_fim = f"{ano + 1}-01-01"
    else:
        data_fim = f"{ano}-{mes + 1:02d}-01"
    
    # Buscar transações do período
    transacoes = await db.transacoes.find({
        "empresa_id": empresa_id,
        "data": {"$gte": data_inicio, "$lt": data_fim},
        "status": "confirmada"
    }, {"_id": 0}).to_list(1000)
    
    receitas = sum(t["valor"] for t in transacoes if t.get("tipo") == "receita")
    despesas = sum(t["valor"] for t in transacoes if t.get("tipo") == "despesa")
    saldo = receitas - despesas
    
    # Saldos das contas
    contas = await db.contas.find(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}},
        {"_id": 0}
    ).to_list(50)
    
    saldo_total_contas = sum(c.get("saldo_atual", 0) for c in contas)
    
    return {
        "periodo": {"mes": mes, "ano": ano},
        "receitas": receitas,
        "despesas": despesas,
        "saldo_periodo": saldo,
        "saldo_total_contas": saldo_total_contas,
        "total_transacoes": len(transacoes),
        "contas": contas
    }
