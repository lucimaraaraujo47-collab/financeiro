# Router de Vendas e Serviços
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from database import db
from routers.auth import get_current_user

router = APIRouter(tags=["Vendas"])

# ==================== CLIENTES DE VENDA ====================

@router.post("/empresas/{empresa_id}/clientes-venda")
async def criar_cliente_venda(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar cliente para vendas"""
    cliente_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    cliente = {
        "id": cliente_id,
        "empresa_id": empresa_id,
        "nome_completo": data.get("nome_completo"),
        "cpf": data.get("cpf"),
        "cnpj": data.get("cnpj"),
        "email": data.get("email"),
        "telefone": data.get("telefone"),
        "celular": data.get("celular"),
        "logradouro": data.get("logradouro"),
        "numero": data.get("numero"),
        "complemento": data.get("complemento"),
        "bairro": data.get("bairro"),
        "cidade": data.get("cidade"),
        "estado": data.get("estado"),
        "cep": data.get("cep"),
        "referencia": data.get("referencia"),
        "observacoes": data.get("observacoes"),
        "ativo": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clientes_venda.insert_one(cliente)
    return cliente

@router.get("/empresas/{empresa_id}/clientes-venda")
async def listar_clientes_venda(
    empresa_id: str,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Listar clientes de venda"""
    query = {"empresa_id": empresa_id, "ativo": {"$ne": False}}
    
    if search:
        query["$or"] = [
            {"nome_completo": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search}},
            {"cnpj": {"$regex": search}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    clientes = await db.clientes_venda.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return clientes

@router.get("/clientes-venda/{cliente_id}")
async def obter_cliente_venda(cliente_id: str, current_user: dict = Depends(get_current_user)):
    """Obter cliente por ID"""
    cliente = await db.clientes_venda.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

@router.put("/clientes-venda/{cliente_id}")
async def atualizar_cliente_venda(
    cliente_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar cliente"""
    existing = await db.clientes_venda.find_one({"id": cliente_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    campos = ["nome_completo", "cpf", "cnpj", "email", "telefone", "celular",
              "logradouro", "numero", "complemento", "bairro", "cidade", 
              "estado", "cep", "referencia", "observacoes"]
    
    for campo in campos:
        if campo in data:
            update[campo] = data[campo]
    
    await db.clientes_venda.update_one({"id": cliente_id}, {"$set": update})
    return await db.clientes_venda.find_one({"id": cliente_id}, {"_id": 0})

# ==================== PLANOS DE SERVIÇO ====================

@router.post("/empresas/{empresa_id}/planos-servico")
async def criar_plano_servico(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar plano de serviço"""
    plano_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    plano = {
        "id": plano_id,
        "empresa_id": empresa_id,
        "nome": data.get("nome"),
        "descricao": data.get("descricao"),
        "valor_mensal": data.get("valor_mensal", 0),
        "valor_instalacao": data.get("valor_instalacao", 0),
        "velocidade_download": data.get("velocidade_download"),
        "velocidade_upload": data.get("velocidade_upload"),
        "franquia_dados": data.get("franquia_dados"),
        "inclui_equipamentos": data.get("inclui_equipamentos", []),
        "fidelidade_meses": data.get("fidelidade_meses", 0),
        "multa_cancelamento": data.get("multa_cancelamento", 0),
        "ativo": True,
        "created_at": now
    }
    
    await db.planos_servico.insert_one(plano)
    return plano

@router.get("/empresas/{empresa_id}/planos-servico")
async def listar_planos_servico(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Listar planos de serviço"""
    planos = await db.planos_servico.find(
        {"empresa_id": empresa_id, "ativo": {"$ne": False}},
        {"_id": 0}
    ).to_list(100)
    return planos

@router.get("/planos-servico/{plano_id}")
async def obter_plano_servico(plano_id: str, current_user: dict = Depends(get_current_user)):
    """Obter plano por ID"""
    plano = await db.planos_servico.find_one({"id": plano_id}, {"_id": 0})
    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return plano

# ==================== VENDAS DE SERVIÇO ====================

@router.post("/empresas/{empresa_id}/vendas-servico")
async def criar_venda_servico(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar venda de serviço"""
    venda_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Gerar número da venda
    count = await db.vendas_servico.count_documents({"empresa_id": empresa_id})
    numero = f"V-{datetime.now().year}-{count + 1:04d}"
    
    venda = {
        "id": venda_id,
        "empresa_id": empresa_id,
        "numero": numero,
        "cliente_id": data.get("cliente_id"),
        "plano_id": data.get("plano_id"),
        "vendedor_id": current_user.get("id"),
        "valor_mensal": data.get("valor_mensal", 0),
        "valor_instalacao": data.get("valor_instalacao", 0),
        "desconto": data.get("desconto", 0),
        "dia_vencimento": data.get("dia_vencimento", 10),
        "data_inicio": data.get("data_inicio", now),
        "fidelidade_ate": data.get("fidelidade_ate"),
        "status": "pendente",  # pendente, ativa, cancelada
        "observacoes": data.get("observacoes"),
        "contrato_id": None,
        "os_instalacao_id": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.vendas_servico.insert_one(venda)
    
    # Buscar dados do cliente para retorno
    cliente = await db.clientes_venda.find_one({"id": venda["cliente_id"]}, {"_id": 0, "nome_completo": 1})
    venda["cliente_nome"] = cliente.get("nome_completo") if cliente else None
    
    return venda

@router.get("/empresas/{empresa_id}/vendas-servico")
async def listar_vendas_servico(
    empresa_id: str,
    status: Optional[str] = None,
    cliente_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Listar vendas de serviço"""
    query = {"empresa_id": empresa_id}
    
    if status:
        query["status"] = status
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    vendas = await db.vendas_servico.find(query, {"_id": 0})\
        .sort("created_at", -1)\
        .limit(limit)\
        .to_list(limit)
    
    # Enriquecer com nome do cliente
    for v in vendas:
        if v.get("cliente_id"):
            cliente = await db.clientes_venda.find_one({"id": v["cliente_id"]}, {"nome_completo": 1})
            v["cliente_nome"] = cliente.get("nome_completo") if cliente else None
    
    return vendas

@router.get("/vendas-servico/{venda_id}")
async def obter_venda_servico(venda_id: str, current_user: dict = Depends(get_current_user)):
    """Obter venda por ID"""
    venda = await db.vendas_servico.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Buscar cliente
    if venda.get("cliente_id"):
        cliente = await db.clientes_venda.find_one({"id": venda["cliente_id"]}, {"_id": 0})
        venda["cliente"] = cliente
    
    # Buscar plano
    if venda.get("plano_id"):
        plano = await db.planos_servico.find_one({"id": venda["plano_id"]}, {"_id": 0})
        venda["plano"] = plano
    
    return venda

@router.patch("/vendas-servico/{venda_id}/status")
async def atualizar_status_venda(
    venda_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar status da venda"""
    venda = await db.vendas_servico.find_one({"id": venda_id})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    novo_status = data.get("status")
    if novo_status not in ["pendente", "ativa", "cancelada", "suspensa"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    update = {
        "status": novo_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if novo_status == "ativa" and not venda.get("data_ativacao"):
        update["data_ativacao"] = datetime.now(timezone.utc).isoformat()
    
    if novo_status == "cancelada":
        update["data_cancelamento"] = datetime.now(timezone.utc).isoformat()
        update["motivo_cancelamento"] = data.get("motivo")
    
    await db.vendas_servico.update_one({"id": venda_id}, {"$set": update})
    return {"message": f"Status atualizado para {novo_status}"}

# ==================== ORDENS DE SERVIÇO (via Empresa) ====================

@router.post("/empresas/{empresa_id}/ordens-servico")
async def criar_os_empresa(
    empresa_id: str,
    data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Criar ordem de serviço"""
    os_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Gerar número da OS
    count = await db.ordens_servico.count_documents({"empresa_id": empresa_id})
    numero = f"OS-{datetime.now().year}-{count + 1:04d}"
    
    # Buscar dados do cliente
    cliente = await db.clientes_venda.find_one({"id": data.get("cliente_id")}, {"_id": 0})
    
    os_doc = {
        "id": os_id,
        "empresa_id": empresa_id,
        "numero": numero,
        "tipo": data.get("tipo", "instalacao"),
        "cliente_id": data.get("cliente_id"),
        "cliente_nome": cliente.get("nome_completo") if cliente else data.get("cliente_nome"),
        "cliente_telefone": cliente.get("telefone") if cliente else data.get("cliente_telefone"),
        "venda_id": data.get("venda_id"),
        "endereco_servico": data.get("endereco_servico") or (
            f"{cliente.get('logradouro', '')}, {cliente.get('numero', '')} - {cliente.get('bairro', '')}, {cliente.get('cidade', '')}/{cliente.get('estado', '')}"
            if cliente else ""
        ),
        "descricao": data.get("descricao"),
        "observacoes": data.get("observacoes"),
        "status": "aberta",
        "tecnico_id": data.get("tecnico_id"),
        "data_agendamento": data.get("data_agendamento"),
        "horario_previsto": data.get("horario_previsto"),
        "checklist": data.get("checklist", []),
        "fotos": [],
        "assinatura_cliente": None,
        "assinatura_tecnico": None,
        "created_by": current_user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.ordens_servico.insert_one(os_doc)
    
    return {"id": os_id, "numero": numero, "message": "OS criada com sucesso"}

@router.get("/empresas/{empresa_id}/ordens-servico")
async def listar_os_empresa(
    empresa_id: str,
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    tecnico_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Listar ordens de serviço da empresa"""
    query = {"empresa_id": empresa_id}
    
    if status:
        query["status"] = status
    if tipo:
        query["tipo"] = tipo
    if tecnico_id:
        query["tecnico_id"] = tecnico_id
    
    ordens = await db.ordens_servico.find(query, {"_id": 0})\
        .sort("created_at", -1)\
        .limit(limit)\
        .to_list(limit)
    
    # Enriquecer com nome do técnico
    for os in ordens:
        if os.get("tecnico_id"):
            tecnico = await db.users.find_one({"id": os["tecnico_id"]}, {"nome": 1})
            os["tecnico_nome"] = tecnico.get("nome") if tecnico else None
    
    return ordens
