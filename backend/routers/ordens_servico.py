# Router de Ordens de Serviço
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import requests

from database import db
from routers.auth import get_current_user

router = APIRouter(prefix="/ordens-servico", tags=["Ordens de Serviço"])

# ==================== FUNÇÕES AUXILIARES ====================

async def _enviar_push_nova_os(os_id: str, tecnico_id: str, os_data: dict):
    """Função interna para enviar push notification quando uma OS é atribuída"""
    try:
        tecnico = await db.users.find_one({"id": tecnico_id})
        if not tecnico or not tecnico.get("push_token"):
            logging.info(f"Técnico {tecnico_id} não tem push token registrado")
            return False
        
        cliente_nome = os_data.get("cliente_nome", "Cliente")
        tipo_os = os_data.get("tipo", "serviço")
        numero_os = os_data.get("numero", "N/A")
        data_agendamento = os_data.get("data_agendamento", "")
        
        message = {
            "to": tecnico["push_token"],
            "title": f"🔔 Nova OS #{numero_os}",
            "body": f"OS de {tipo_os} atribuída para você. Cliente: {cliente_nome}" + (f" - {data_agendamento}" if data_agendamento else ""),
            "data": {
                "osId": os_id,
                "osNumero": numero_os,
                "tipo": "nova_os",
                "screen": "OSDetail"
            },
            "sound": "default",
            "priority": "high",
            "channelId": "os-nova"
        }
        
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=message,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            logging.info(f"✅ Push enviado para técnico {tecnico_id} sobre OS {os_id}")
            return True
        else:
            logging.error(f"❌ Erro ao enviar push: {response.text}")
            return False
            
    except Exception as e:
        logging.error(f"Erro ao enviar push notification: {e}")
        return False

# ==================== ENDPOINTS ====================

@router.get("")
async def listar_os(
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    tecnico_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Listar ordens de serviço"""
    query = {}
    
    # Se for técnico, mostrar apenas suas OS
    if current_user.get("perfil") == "tecnico":
        query["tecnico_id"] = current_user.get("id")
    elif tecnico_id:
        query["tecnico_id"] = tecnico_id
    
    if status:
        query["status"] = status
    if tipo:
        query["tipo"] = tipo
    
    ordens = await db.ordens_servico.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enriquecer com nome do técnico
    for os in ordens:
        if os.get("tecnico_id"):
            tecnico = await db.users.find_one({"id": os["tecnico_id"]}, {"_id": 0, "nome": 1})
            os["tecnico_nome"] = tecnico.get("nome") if tecnico else None
    
    return ordens

@router.get("/{os_id}")
async def obter_os(os_id: str, current_user: dict = Depends(get_current_user)):
    """Obter detalhes de uma OS"""
    os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    # Enriquecer com nome do técnico
    if os.get("tecnico_id"):
        tecnico = await db.users.find_one({"id": os["tecnico_id"]}, {"_id": 0, "nome": 1})
        os["tecnico_nome"] = tecnico.get("nome") if tecnico else None
    
    return os

@router.patch("/{os_id}/atribuir")
async def atribuir_tecnico_os(
    os_id: str, 
    data: Dict[str, str] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Atribui um técnico à OS"""
    import asyncio
    
    os_doc = await db.ordens_servico.find_one({"id": os_id})
    if not os_doc:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    tecnico_id = data.get("tecnico_id")
    data_agendamento = data.get("data_agendamento")
    horario_previsto = data.get("horario_previsto")
    
    update = {
        "tecnico_id": tecnico_id,
        "status": "agendada",
        "updated_at": datetime.now(timezone.utc)
    }
    
    if data_agendamento:
        update["data_agendamento"] = data_agendamento
    if horario_previsto:
        update["horario_previsto"] = horario_previsto
    
    await db.ordens_servico.update_one({"id": os_id}, {"$set": update})
    
    # Enviar push notification para o técnico
    if tecnico_id:
        os_doc.update(update)
        asyncio.create_task(_enviar_push_nova_os(os_id, tecnico_id, os_doc))
    
    return {"message": "Técnico atribuído com sucesso"}

@router.patch("/{os_id}/status")
async def atualizar_status_os(
    os_id: str, 
    data: Dict[str, Any] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Atualiza o status de uma OS"""
    os = await db.ordens_servico.find_one({"id": os_id})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    novo_status = data.get("status")
    observacoes = data.get("observacoes_tecnico")
    
    if not novo_status:
        raise HTTPException(status_code=400, detail="Status é obrigatório")
    
    status_validos = ["aberta", "agendada", "em_andamento", "concluida", "cancelada"]
    if novo_status not in status_validos:
        raise HTTPException(status_code=400, detail=f"Status inválido. Opções: {', '.join(status_validos)}")
    
    update = {
        "status": novo_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if novo_status == "em_andamento":
        update["iniciada_em"] = datetime.now(timezone.utc).isoformat()
    elif novo_status == "concluida":
        update["concluida_em"] = datetime.now(timezone.utc).isoformat()
    
    if observacoes:
        update["observacoes_tecnico"] = observacoes
    
    await db.ordens_servico.update_one({"id": os_id}, {"$set": update})
    return {"message": f"Status atualizado para {novo_status}"}

@router.patch("/{os_id}/observacoes")
async def atualizar_observacoes_os(
    os_id: str, 
    data: Dict[str, Any] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Atualiza observações do técnico na OS"""
    os = await db.ordens_servico.find_one({"id": os_id})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    observacoes = data.get("observacoes_tecnico", "")
    
    await db.ordens_servico.update_one(
        {"id": os_id}, 
        {"$set": {
            "observacoes_tecnico": observacoes,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Observações atualizadas com sucesso", "observacoes_tecnico": observacoes}

@router.patch("/{os_id}/checklist")
async def atualizar_checklist_os(
    os_id: str, 
    data: Dict[str, Any] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Atualiza item do checklist"""
    os = await db.ordens_servico.find_one({"id": os_id})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    item_index = data.get("item_index")
    concluido = data.get("concluido", False)
    
    if item_index is None:
        raise HTTPException(status_code=400, detail="item_index é obrigatório")
    
    checklist = os.get("checklist", [])
    if item_index < 0 or item_index >= len(checklist):
        raise HTTPException(status_code=400, detail="item_index inválido")
    
    checklist[item_index]["concluido"] = concluido
    checklist[item_index]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ordens_servico.update_one(
        {"id": os_id}, 
        {"$set": {
            "checklist": checklist,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Checklist atualizado", "checklist": checklist}

@router.post("/{os_id}/fotos")
async def adicionar_foto_os(
    os_id: str, 
    data: Dict[str, Any] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Adiciona foto à OS"""
    os = await db.ordens_servico.find_one({"id": os_id})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    foto_url = data.get("foto_url")
    descricao = data.get("descricao", "")
    
    if not foto_url:
        raise HTTPException(status_code=400, detail="foto_url é obrigatório")
    
    fotos = os.get("fotos", [])
    fotos.append({
        "id": str(uuid.uuid4()),
        "url": foto_url,
        "descricao": descricao,
        "uploaded_by": current_user.get("id"),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.ordens_servico.update_one(
        {"id": os_id}, 
        {"$set": {
            "fotos": fotos,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Foto adicionada", "fotos": fotos}

@router.post("/{os_id}/assinatura")
async def salvar_assinatura_os(
    os_id: str, 
    data: Dict[str, Any] = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    """Salva assinatura digital na OS"""
    os = await db.ordens_servico.find_one({"id": os_id})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    assinatura_base64 = data.get("assinatura")
    tipo = data.get("tipo", "cliente")  # cliente ou tecnico
    
    if not assinatura_base64:
        raise HTTPException(status_code=400, detail="assinatura é obrigatório")
    
    assinatura_field = f"assinatura_{tipo}"
    
    await db.ordens_servico.update_one(
        {"id": os_id}, 
        {"$set": {
            assinatura_field: assinatura_base64,
            f"{assinatura_field}_data": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": f"Assinatura do {tipo} salva com sucesso"}
