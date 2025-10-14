"""
Script to create initial admin user for ECHO SHOP
Run this script once to create the owner/admin account
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Create admin user if it doesn't exist"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin already exists
    admin_email = "admin@echoshop.com"
    existing = await db.users.find_one({"email": admin_email})
    
    if existing:
        print(f"⚠️  Admin user already exists: {admin_email}")
        print(f"   User ID: {existing['id']}")
        print(f"   Name: {existing['nome']}")
        return
    
    # Create admin user
    admin_data = {
        "id": str(uuid.uuid4()),
        "nome": "Administrador ECHO SHOP",
        "email": admin_email,
        "telefone": "(11) 99999-9999",
        "perfil": "admin",
        "empresa_ids": [],
        "senha_hash": pwd_context.hash("EchoShop@2025!"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_data)
    
    print("✅ Admin user created successfully!")
    print(f"   Email: {admin_email}")
    print(f"   Senha: EchoShop@2025!")
    print(f"   Perfil: admin")
    print(f"\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
    
    # Create default company for admin
    empresa_data = {
        "id": str(uuid.uuid4()),
        "razao_social": "ECHO SHOP LTDA",
        "cnpj": "12.345.678/0001-90",
        "contas_bancarias": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.empresas.insert_one(empresa_data)
    
    # Link empresa to admin
    await db.users.update_one(
        {"id": admin_data["id"]},
        {"$set": {"empresa_ids": [empresa_data["id"]]}}
    )
    
    print(f"✅ Default company created: {empresa_data['razao_social']}")
    print(f"   CNPJ: {empresa_data['cnpj']}")
    
    client.close()

if __name__ == "__main__":
    print("🚀 Creating ECHO SHOP admin user...\n")
    asyncio.run(create_admin_user())
