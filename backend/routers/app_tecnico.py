# Router do App Técnico
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import os
import json
import logging

from database import db
from routers.auth import get_current_user
from config import APK_UPLOAD_DIR

router = APIRouter(prefix="/app-tecnico", tags=["App Técnico"])

# ==================== APK MANAGEMENT ====================

@router.get("/apk/info")
async def get_apk_info():
    """Obtém informações do APK disponível para download"""
    metadata_path = f"{APK_UPLOAD_DIR}/metadata.json"
    
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        return {
            "available": True,
            "version": metadata.get("version", "1.0.0"),
            "filename": metadata.get("filename", "app-tecnico.apk"),
            "size_mb": metadata.get("size_mb", 0),
            "upload_date": metadata.get("upload_date"),
            "changelog": metadata.get("changelog", []),
            "download_url": "/api/app-tecnico/apk/download",
            "uploaded_by": metadata.get("uploaded_by")
        }
    
    # Fallback: procurar APK no diretório
    if os.path.exists(APK_UPLOAD_DIR):
        apk_files = [f for f in os.listdir(APK_UPLOAD_DIR) if f.endswith('.apk')]
        if apk_files:
            apk_file = sorted(apk_files)[-1]  # Pega o mais recente
            file_path = f"{APK_UPLOAD_DIR}/{apk_file}"
            file_size = os.path.getsize(file_path) / (1024 * 1024)
            return {
                "available": True,
                "version": "1.0.0",
                "filename": apk_file,
                "size_mb": round(file_size, 2),
                "download_url": "/api/app-tecnico/apk/download"
            }
    
    return {"available": False, "message": "Nenhum APK disponível"}

@router.get("/apk/download")
async def download_apk():
    """Download do APK"""
    metadata_path = f"{APK_UPLOAD_DIR}/metadata.json"
    
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        filename = metadata.get("filename", "app-tecnico.apk")
    else:
        # Fallback: procurar APK no diretório
        if os.path.exists(APK_UPLOAD_DIR):
            apk_files = [f for f in os.listdir(APK_UPLOAD_DIR) if f.endswith('.apk')]
            if apk_files:
                filename = sorted(apk_files)[-1]
            else:
                raise HTTPException(status_code=404, detail="APK não encontrado")
        else:
            raise HTTPException(status_code=404, detail="APK não encontrado")
    
    file_path = f"{APK_UPLOAD_DIR}/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo APK não encontrado")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.android.package-archive"
    )

@router.post("/apk/upload")
async def upload_apk(
    file: UploadFile = File(...),
    version: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de novo APK (apenas admin)"""
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Apenas administradores podem fazer upload de APK")
    
    if not file.filename.endswith('.apk'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser um APK")
    
    # Criar diretório se não existir
    os.makedirs(APK_UPLOAD_DIR, exist_ok=True)
    
    # Salvar arquivo
    filename = f"app-tecnico-v{version}.apk"
    file_path = f"{APK_UPLOAD_DIR}/{filename}"
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Atualizar metadata
    file_size = len(content) / (1024 * 1024)
    metadata = {
        "version": version,
        "filename": filename,
        "size_mb": round(file_size, 2),
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": current_user.get("nome", "Admin"),
        "changelog": []
    }
    
    with open(f"{APK_UPLOAD_DIR}/metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    logging.info(f"APK v{version} uploaded by {current_user.get('email')}")
    
    return {
        "message": "APK uploaded com sucesso",
        "version": version,
        "filename": filename,
        "size_mb": round(file_size, 2)
    }

# ==================== PUSH NOTIFICATIONS ====================

@router.post("/users/{user_id}/push-token")
async def register_push_token(
    user_id: str,
    data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Registra push token do dispositivo"""
    push_token = data.get("push_token")
    platform = data.get("platform", "android")
    device_name = data.get("device_name")
    
    if not push_token:
        raise HTTPException(status_code=400, detail="push_token é obrigatório")
    
    # Atualizar usuário com push token
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "push_token": push_token,
            "push_platform": platform,
            "push_device_name": device_name,
            "push_token_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logging.info(f"Push token registrado para usuário {user_id}")
    
    return {"success": True, "message": "Token registrado com sucesso"}

@router.post("/notifications/send")
async def send_push_notifications(
    data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Envia push notifications em massa (admin)"""
    import requests
    
    if current_user.get("perfil") not in ["admin", "admin_master"]:
        raise HTTPException(status_code=403, detail="Apenas administradores podem enviar notificações")
    
    title = data.get("title", "ECHO SHOP")
    body = data.get("body", "")
    user_ids = data.get("user_ids", [])  # Se vazio, envia para todos
    
    # Buscar usuários com push token
    query = {"push_token": {"$exists": True, "$ne": None}}
    if user_ids:
        query["id"] = {"$in": user_ids}
    
    users = await db.users.find(query, {"_id": 0, "id": 1, "push_token": 1}).to_list(1000)
    
    if not users:
        return {"success": False, "message": "Nenhum usuário com push token encontrado"}
    
    # Preparar mensagens
    messages = []
    for user in users:
        messages.append({
            "to": user["push_token"],
            "title": title,
            "body": body,
            "sound": "default"
        })
    
    # Enviar via Expo Push API
    try:
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=messages,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            return {
                "success": True,
                "message": f"Notificações enviadas para {len(users)} usuários",
                "total_users": len(users)
            }
        else:
            logging.error(f"Erro ao enviar notificações: {response.text}")
            return {"success": False, "message": "Erro ao enviar notificações"}
    except Exception as e:
        logging.error(f"Erro ao enviar push: {e}")
        return {"success": False, "message": str(e)}
