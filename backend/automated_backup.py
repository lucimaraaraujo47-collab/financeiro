#!/usr/bin/env python3
"""
Automated Backup Script for ECHO SHOP FinAI
Runs daily at 3 AM to backup all MongoDB data to Google Drive
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import asyncio

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/backup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "finai_database")

async def get_db():
    """Get database connection"""
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

def get_drive_service():
    """Create and return Google Drive service"""
    service_account_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_PATH", "/app/backend/service_account.json")
    
    if not os.path.exists(service_account_path):
        raise Exception(f"Google Service Account file not found: {service_account_path}")
    
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    credentials = service_account.Credentials.from_service_account_file(
        service_account_path, scopes=SCOPES)
    
    return build('drive', 'v3', credentials=credentials)

async def export_all_data(db):
    """Export all database data to JSON format"""
    logging.info("Starting data export...")
    
    backup_data = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "database": DB_NAME,
        "collections": {}
    }
    
    # Collections to backup
    collections = [
        "empresas", "users", "categorias_financeiras", "centros_custo",
        "transacoes", "contas_bancarias", "investimentos", "cartoes_credito",
        "clientes", "fornecedores", "locais", "categorias_equipamentos",
        "equipamentos", "equipamentos_serializados", "movimentacoes_estoque",
        "contatos_crm", "conversas_crm", "mensagens_crm", "agentes_ia",
        "funil_stages", "templates_mensagem", "automacoes_crm", "auditoria_crm",
        "consentimentos_crm"
    ]
    
    for collection_name in collections:
        try:
            collection = db[collection_name]
            documents = await collection.find().to_list(length=None)
            
            # Convert ObjectId and datetime to strings
            for doc in documents:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                for key, value in doc.items():
                    if isinstance(value, datetime):
                        doc[key] = value.isoformat()
            
            backup_data["collections"][collection_name] = documents
            logging.info(f"Exported {len(documents)} documents from {collection_name}")
        except Exception as e:
            logging.error(f"Error exporting {collection_name}: {e}")
            backup_data["collections"][collection_name] = []
    
    logging.info("Data export completed")
    return backup_data

def upload_to_drive(file_content: bytes, filename: str):
    """Upload file to Google Drive"""
    try:
        logging.info(f"Uploading {filename} to Google Drive...")
        
        service = get_drive_service()
        folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
        
        file_metadata = {
            'name': filename,
            'mimeType': 'application/json'
        }
        
        if folder_id:
            file_metadata['parents'] = [folder_id]
            logging.info(f"Uploading to folder ID: {folder_id}")
        
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype='application/json',
            resumable=True
        )
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,createdTime,size'
        ).execute()
        
        logging.info(f"✓ Upload successful! File: {file.get('name')} (ID: {file.get('id')}, Size: {file.get('size')} bytes)")
        return file
        
    except Exception as e:
        logging.error(f"Error uploading to Drive: {e}")
        raise

def cleanup_old_backups(keep_days: int = 30):
    """Delete backups older than keep_days"""
    try:
        logging.info(f"Cleaning up backups older than {keep_days} days...")
        
        service = get_drive_service()
        folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=keep_days)
        cutoff_str = cutoff_date.isoformat()
        
        query = f"name contains 'backup_' and createdTime < '{cutoff_str}'"
        if folder_id:
            query += f" and '{folder_id}' in parents"
        
        results = service.files().list(
            q=query,
            fields='files(id, name, createdTime)'
        ).execute()
        
        files = results.get('files', [])
        deleted_count = 0
        
        for file in files:
            try:
                service.files().delete(fileId=file['id']).execute()
                deleted_count += 1
                logging.info(f"✓ Deleted old backup: {file['name']}")
            except Exception as e:
                logging.error(f"Error deleting {file['name']}: {e}")
        
        logging.info(f"Cleanup completed. Deleted {deleted_count} old backups.")
        return deleted_count
        
    except Exception as e:
        logging.error(f"Error cleaning up old backups: {e}")
        return 0

async def main():
    """Main backup function"""
    try:
        logging.info("=" * 60)
        logging.info("ECHO SHOP FinAI - Automated Backup Starting")
        logging.info("=" * 60)
        
        # Get database connection
        db = await get_db()
        
        # Export all data
        backup_data = await export_all_data(db)
        
        # Generate filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.json"
        
        # Convert to JSON bytes
        json_content = json.dumps(backup_data, indent=2, ensure_ascii=False).encode('utf-8')
        file_size_mb = len(json_content) / (1024 * 1024)
        logging.info(f"Backup file size: {file_size_mb:.2f} MB")
        
        # Upload to Drive
        file_info = upload_to_drive(json_content, filename)
        
        # Cleanup old backups
        deleted_count = cleanup_old_backups(keep_days=30)
        
        logging.info("=" * 60)
        logging.info("✓ BACKUP COMPLETED SUCCESSFULLY")
        logging.info(f"  File: {file_info.get('name')}")
        logging.info(f"  Drive ID: {file_info.get('id')}")
        logging.info(f"  Old backups deleted: {deleted_count}")
        logging.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logging.error("=" * 60)
        logging.error("✗ BACKUP FAILED")
        logging.error(f"  Error: {str(e)}")
        logging.error("=" * 60)
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
