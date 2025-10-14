from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_MINUTES', 43200))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
WHATSAPP_SERVICE_KEY = os.environ.get('WHATSAPP_SERVICE_KEY', 'internal-service-key-123')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    perfil: str  # admin, financeiro, leitura
    empresa_ids: List[str] = []
    senha_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    perfil: str = "financeiro"
    senha: str
    empresa_ids: List[str] = []

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class Empresa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    razao_social: str
    cnpj: str
    contas_bancarias: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmpresaCreate(BaseModel):
    razao_social: str
    cnpj: str
    contas_bancarias: List[str] = []

class Categoria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    tipo: str  # despesa, receita
    descricao: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoriaCreate(BaseModel):
    nome: str
    tipo: str
    descricao: Optional[str] = None

class CentroCusto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    area: Optional[str] = None  # Comercial, Operação, TI, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CentroCustoCreate(BaseModel):
    nome: str
    area: Optional[str] = None

class Transacao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    usuario_id: str
    tipo: str  # despesa, receita
    fornecedor: str
    cnpj_cpf: Optional[str] = None
    descricao: str
    valor_total: float
    data_competencia: str  # ISO date
    data_pagamento: Optional[str] = None  # ISO date
    categoria_id: str
    centro_custo_id: str
    metodo_pagamento: Optional[str] = None
    conta_origem: Optional[str] = None
    impostos: Optional[Dict[str, float]] = {}
    parcelas: Optional[Dict[str, Any]] = None
    comprovante_url: Optional[str] = None
    status: str = "pendente"  # pendente, conciliada, contestada
    origem: str = "manual"  # manual, whatsapp, upload, api
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransacaoCreate(BaseModel):
    tipo: str
    fornecedor: str
    cnpj_cpf: Optional[str] = None
    descricao: str
    valor_total: float
    data_competencia: str
    data_pagamento: Optional[str] = None
    categoria_id: str
    centro_custo_id: str
    metodo_pagamento: Optional[str] = None
    conta_origem: Optional[str] = None
    impostos: Optional[Dict[str, float]] = None
    parcelas: Optional[Dict[str, Any]] = None
    status: str = "pendente"
    origem: str = "manual"

class ClassificacaoSugestao(BaseModel):
    categoria_id: str
    categoria_nome: str
    centro_custo_id: str
    centro_custo_nome: str
    confidence: float
    reasoning: str

class ExtrairTextoRequest(BaseModel):
    texto: str
    empresa_id: str

class ExtrairTextoResponse(BaseModel):
    dados_extraidos: Dict[str, Any]
    classificacao_sugerida: Optional[ClassificacaoSugestao] = None

class DashboardMetrics(BaseModel):
    total_receitas: float
    total_despesas: float
    saldo: float
    despesas_por_categoria: List[Dict[str, Any]]
    despesas_por_centro_custo: List[Dict[str, Any]]
    transacoes_recentes: List[Dict[str, Any]]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AI HELPERS ====================

async def extrair_dados_com_ai(texto: str, empresa_id: str) -> Dict[str, Any]:
    """Extract financial data from text using AI"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"extract-{uuid.uuid4()}",
            system_message="""Você é um assistente financeiro especializado em extrair dados de textos sobre despesas e receitas.
            Extraia as seguintes informações do texto:
            - tipo (despesa ou receita)
            - fornecedor
            - cnpj_cpf (se mencionado)
            - descricao
            - valor_total (apenas número)
            - data_competencia (formato YYYY-MM-DD, se for 'hoje' use a data atual, se for 'ontem' use data de ontem)
            - metodo_pagamento
            
            Retorne APENAS um JSON válido com esses campos. Se algum campo não estiver presente, use null.
            Exemplo: {"tipo": "despesa", "fornecedor": "ENEL", "valor_total": 842.35, "data_competencia": "2025-01-15", ...}
            """
        ).with_model("openai", "gpt-5")
        
        message = UserMessage(text=texto)
        response = await chat.send_message(message)
        
        # Parse the JSON response
        import json
        # Remove markdown code blocks if present
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        if response_text.startswith("json"):
            response_text = response_text[4:].strip()
        
        dados = json.loads(response_text)
        return dados
    except Exception as e:
        logging.error(f"Error extracting data with AI: {e}")
        return {}

async def classificar_com_ai(descricao: str, fornecedor: str, valor: float, empresa_id: str) -> Optional[ClassificacaoSugestao]:
    """Classify transaction using AI"""
    try:
        # Get categories and cost centers
        categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        centros_custo = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        
        if not categorias or not centros_custo:
            return None
        
        cat_list = "\n".join([f"- {c['nome']} (ID: {c['id']}, Tipo: {c['tipo']})" for c in categorias])
        cc_list = "\n".join([f"- {c['nome']} (ID: {c['id']}, Área: {c.get('area', 'N/A')})" for c in centros_custo])
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify-{uuid.uuid4()}",
            system_message=f"""Você é um classificador financeiro. Classifique a transação na melhor categoria e centro de custo.
            
            CATEGORIAS DISPONÍVEIS:
            {cat_list}
            
            CENTROS DE CUSTO DISPONÍVEIS:
            {cc_list}
            
            Analise a descrição, fornecedor e valor, e retorne APENAS um JSON com:
            {{"categoria_id": "...", "categoria_nome": "...", "centro_custo_id": "...", "centro_custo_nome": "...", "confidence": 0.95, "reasoning": "..."}}            
            """
        ).with_model("openai", "gpt-5")
        
        message = UserMessage(text=f"Descrição: {descricao}\nFornecedor: {fornecedor}\nValor: R$ {valor:.2f}")
        response = await chat.send_message(message)
        
        import json
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        if response_text.startswith("json"):
            response_text = response_text[4:].strip()
        
        dados = json.loads(response_text)
        return ClassificacaoSugestao(**dados)
    except Exception as e:
        logging.error(f"Error classifying with AI: {e}")
        return None

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "FinAI API v1.0"}

# AUTH ROUTES
@api_router.post("/auth/register", response_model=UserProfile)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Hash password
    senha_hash = hash_password(user_data.senha)
    
    # Create user
    user_dict = user_data.model_dump(exclude={"senha"})
    user_obj = UserProfile(**user_dict, senha_hash=senha_hash)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.senha, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Create token
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    # Remove sensitive data
    user_data = {k: v for k, v in user.items() if k != "senha_hash"}
    
    return TokenResponse(access_token=token, user=user_data)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = {k: v for k, v in current_user.items() if k != "senha_hash"}
    return user_data

# EMPRESA ROUTES
@api_router.post("/empresas", response_model=Empresa)
async def create_empresa(empresa_data: EmpresaCreate, current_user: dict = Depends(get_current_user)):
    empresa_obj = Empresa(**empresa_data.model_dump())
    doc = empresa_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.empresas.insert_one(doc)
    
    # Add empresa to user's list
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"empresa_ids": empresa_obj.id}}
    )
    
    return empresa_obj

@api_router.get("/empresas", response_model=List[Empresa])
async def get_empresas(current_user: dict = Depends(get_current_user)):
    empresas = await db.empresas.find(
        {"id": {"$in": current_user.get("empresa_ids", [])}},
        {"_id": 0}
    ).to_list(100)
    return empresas

# CATEGORIA ROUTES
@api_router.post("/empresas/{empresa_id}/categorias", response_model=Categoria)
async def create_categoria(empresa_id: str, categoria_data: CategoriaCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    categoria_obj = Categoria(**categoria_data.model_dump(), empresa_id=empresa_id)
    doc = categoria_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.categorias.insert_one(doc)
    return categoria_obj

@api_router.get("/empresas/{empresa_id}/categorias", response_model=List[Categoria])
async def get_categorias(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
    return categorias

@api_router.delete("/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categorias.delete_one({"id": categoria_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria deletada"}

# CENTRO DE CUSTO ROUTES
@api_router.post("/empresas/{empresa_id}/centros-custo", response_model=CentroCusto)
async def create_centro_custo(empresa_id: str, cc_data: CentroCustoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    cc_obj = CentroCusto(**cc_data.model_dump(), empresa_id=empresa_id)
    doc = cc_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.centros_custo.insert_one(doc)
    return cc_obj

@api_router.get("/empresas/{empresa_id}/centros-custo", response_model=List[CentroCusto])
async def get_centros_custo(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    centros = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
    return centros

@api_router.delete("/centros-custo/{cc_id}")
async def delete_centro_custo(cc_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.centros_custo.delete_one({"id": cc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Centro de custo não encontrado")
    return {"message": "Centro de custo deletado"}

# TRANSACAO ROUTES
@api_router.post("/empresas/{empresa_id}/transacoes", response_model=Transacao)
async def create_transacao(empresa_id: str, transacao_data: TransacaoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    transacao_obj = Transacao(**transacao_data.model_dump(), empresa_id=empresa_id, usuario_id=current_user["id"])
    doc = transacao_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transacoes.insert_one(doc)
    return transacao_obj

@api_router.get("/empresas/{empresa_id}/transacoes", response_model=List[Transacao])
async def get_transacoes(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    transacoes = await db.transacoes.find({"empresa_id": empresa_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return transacoes

@api_router.delete("/transacoes/{transacao_id}")
async def delete_transacao(transacao_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.transacoes.delete_one({"id": transacao_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Transação deletada"}

# AI ROUTES
@api_router.post("/ai/extrair-texto", response_model=ExtrairTextoResponse)
async def extrair_texto(request: ExtrairTextoRequest, current_user: dict = Depends(get_current_user)):
    if request.empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Extract data
    dados = await extrair_dados_com_ai(request.texto, request.empresa_id)
    
    if not dados:
        raise HTTPException(status_code=400, detail="Não foi possível extrair dados do texto")
    
    # Classify if we have description and fornecedor
    classificacao = None
    if dados.get("descricao") and dados.get("fornecedor") and dados.get("valor_total"):
        classificacao = await classificar_com_ai(
            dados["descricao"],
            dados["fornecedor"],
            dados["valor_total"],
            request.empresa_id
        )
    
    return ExtrairTextoResponse(dados_extraidos=dados, classificacao_sugerida=classificacao)

@api_router.post("/ai/classificar")
async def classificar_transacao(
    descricao: str = Form(...),
    fornecedor: str = Form(...),
    valor: float = Form(...),
    empresa_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    classificacao = await classificar_com_ai(descricao, fornecedor, valor, empresa_id)
    if not classificacao:
        raise HTTPException(status_code=400, detail="Não foi possível classificar")
    
    return classificacao

# DASHBOARD ROUTES
@api_router.get("/empresas/{empresa_id}/dashboard", response_model=DashboardMetrics)
async def get_dashboard(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Get all transactions
    transacoes = await db.transacoes.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
    total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
    saldo = total_receitas - total_despesas
    
    # Despesas por categoria
    cat_map = {}
    for t in transacoes:
        if t["tipo"] == "despesa":
            cat_id = t.get("categoria_id")
            if cat_id:
                if cat_id not in cat_map:
                    cat = await db.categorias.find_one({"id": cat_id}, {"_id": 0})
                    cat_map[cat_id] = {"nome": cat["nome"] if cat else "Desconhecido", "valor": 0}
                cat_map[cat_id]["valor"] += t["valor_total"]
    
    despesas_por_categoria = [{"categoria": v["nome"], "valor": v["valor"]} for v in cat_map.values()]
    despesas_por_categoria.sort(key=lambda x: x["valor"], reverse=True)
    
    # Despesas por centro de custo
    cc_map = {}
    for t in transacoes:
        if t["tipo"] == "despesa":
            cc_id = t.get("centro_custo_id")
            if cc_id:
                if cc_id not in cc_map:
                    cc = await db.centros_custo.find_one({"id": cc_id}, {"_id": 0})
                    cc_map[cc_id] = {"nome": cc["nome"] if cc else "Desconhecido", "valor": 0}
                cc_map[cc_id]["valor"] += t["valor_total"]
    
    despesas_por_centro_custo = [{"centro_custo": v["nome"], "valor": v["valor"]} for v in cc_map.values()]
    despesas_por_centro_custo.sort(key=lambda x: x["valor"], reverse=True)
    
    # Recent transactions
    transacoes_recentes = sorted(transacoes, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
    
    return DashboardMetrics(
        total_receitas=total_receitas,
        total_despesas=total_despesas,
        saldo=saldo,
        despesas_por_categoria=despesas_por_categoria,
        despesas_por_centro_custo=despesas_por_centro_custo,
        transacoes_recentes=transacoes_recentes
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()