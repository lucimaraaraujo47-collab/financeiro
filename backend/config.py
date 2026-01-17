# Configurações do Backend
import os
from datetime import timedelta

# Database
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "finai_db")

# JWT
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

# API
API_PREFIX = "/api"

# Upload
UPLOAD_DIR = "/app/backend/uploads"
APK_UPLOAD_DIR = f"{UPLOAD_DIR}/apk"
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# Asaas (Gateway de pagamento)
ASAAS_API_KEY = os.environ.get("ASAAS_API_KEY", "")
ASAAS_BASE_URL = os.environ.get("ASAAS_BASE_URL", "https://sandbox.asaas.com/api/v3")

# Google Drive Backup
GOOGLE_DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")

# Perfis e Permissões
PERFIS_PERMISSOES = {
    "admin": {
        "nome": "Admin da Empresa",
        "descricao": "Acesso total ao sistema",
        "permissoes": ["*"]
    },
    "admin_master": {
        "nome": "Admin Master",
        "descricao": "Acesso total ao sistema e licenciamento",
        "permissoes": ["*"]
    },
    "tecnico": {
        "nome": "Técnico",
        "descricao": "Acesso ao app técnico, ordens de serviço e equipamentos",
        "permissoes": ["ordens_servico", "equipamentos", "estoque_tecnico", "fotos", "assinaturas"]
    },
    "financeiro": {
        "nome": "Financeiro",
        "descricao": "Acesso a transações, relatórios e contas",
        "permissoes": ["transacoes", "relatorios", "categorias", "contas", "fornecedores", "centros_custo"]
    },
    "vendas": {
        "nome": "Vendas",
        "descricao": "Acesso a vendas, clientes e estoque",
        "permissoes": ["vendas", "clientes", "estoque", "produtos"]
    },
    "operacional": {
        "nome": "Operacional",
        "descricao": "Acesso a estoque e equipamentos",
        "permissoes": ["estoque", "equipamentos", "movimentacoes"]
    },
    "consulta": {
        "nome": "Consulta",
        "descricao": "Apenas visualização",
        "permissoes": ["visualizar"]
    }
}
