from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Body
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
import csv
import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import pandas as pd
from ofxparse import OfxParser
from PyPDF2 import PdfReader
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
import json
import tempfile
from security_utils import (
    validate_password_strength,
    sanitize_string,
    validate_cnpj,
    validate_cpf,
    validate_phone_number,
    log_security_event,
    check_sql_injection,
    check_brute_force,
    record_failed_login,
    clear_failed_logins
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI()

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_MINUTES', 43200))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
WHATSAPP_SERVICE_KEY = os.environ.get('WHATSAPP_SERVICE_KEY', 'internal-service-key-123')

# API Router
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

class UserResponse(BaseModel):
    """User response without password hash"""
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    perfil: str
    empresa_ids: List[str] = []
    created_at: datetime

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    perfil: str = "financeiro"
    senha: str
    empresa_ids: List[str] = []
    
    @validator('nome')
    def sanitize_nome(cls, v):
        return sanitize_string(v, max_length=100)
    
    @validator('telefone')
    def validate_telefone(cls, v):
        if v and not validate_phone_number(v):
            raise ValueError('Número de telefone inválido')
        return v
    
    @validator('senha')
    def validate_senha_strength(cls, v):
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

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
    
    @validator('razao_social')
    def sanitize_razao_social(cls, v):
        return sanitize_string(v, max_length=200)
    
    @validator('cnpj')
    def validate_cnpj_format(cls, v):
        if not validate_cnpj(v):
            raise ValueError('CNPJ inválido')
        return v

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

# CONTAS BANCÁRIAS
class ContaBancaria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    tipo: str  # corrente, poupanca, caixa
    banco: str
    agencia: Optional[str] = None
    numero_conta: Optional[str] = None
    saldo_inicial: float
    saldo_atual: float
    ativa: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContaBancariaCreate(BaseModel):
    nome: str
    tipo: str
    banco: str
    agencia: Optional[str] = None
    numero_conta: Optional[str] = None
    saldo_inicial: float

# INVESTIMENTOS
class Investimento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    tipo: str  # renda_fixa, renda_variavel, fundos, outros
    valor_investido: float
    valor_atual: float
    data_aplicacao: str
    data_vencimento: Optional[str] = None
    rentabilidade_percentual: float = 0.0
    instituicao: Optional[str] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvestimentoCreate(BaseModel):
    nome: str
    tipo: str
    valor_investido: float
    valor_atual: float
    data_aplicacao: str
    data_vencimento: Optional[str] = None
    rentabilidade_percentual: float = 0.0
    instituicao: Optional[str] = None

# CARTÕES DE CRÉDITO
class CartaoCredito(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    bandeira: str  # Visa, Mastercard, Elo, etc
    limite_total: float
    limite_disponivel: float
    dia_fechamento: int  # 1-31
    dia_vencimento: int  # 1-31
    fatura_atual: float = 0.0
    conta_debito_id: Optional[str] = None  # Conta para débito automático
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartaoCreditoCreate(BaseModel):
    nome: str
    bandeira: str
    limite_total: float
    dia_fechamento: int
    dia_vencimento: int
    conta_debito_id: Optional[str] = None

# FATURAS DE CARTÃO
class FaturaCartao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cartao_id: str
    empresa_id: str
    mes_referencia: str  # YYYY-MM
    valor_total: float
    valor_pago: float = 0.0
    data_fechamento: str
    data_vencimento: str
    status: str = "aberta"  # aberta, paga, vencida
    transacoes_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== ESTOQUE MODELS ====================

# CLIENTES
class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    tipo: str  # fisica, juridica
    cnpj_cpf: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    status: str = "ativo"  # ativo, inativo
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClienteCreate(BaseModel):
    nome: str
    tipo: str
    cnpj_cpf: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    observacoes: Optional[str] = None

# FORNECEDORES
class Fornecedor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    cnpj: str
    contato: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    status: str = "ativo"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FornecedorCreate(BaseModel):
    nome: str
    cnpj: str
    contato: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None

# LOCAIS/DEPÓSITOS
class LocalDeposito(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    descricao: Optional[str] = None
    responsavel: Optional[str] = None
    endereco: Optional[str] = None
    status: str = "ativo"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocalDepositoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    responsavel: Optional[str] = None
    endereco: Optional[str] = None

# CATEGORIAS DE EQUIPAMENTOS
class CategoriaEquipamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    descricao: Optional[str] = None
    tipo_controle: str  # serializado, nao_serializado
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoriaEquipamentoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    tipo_controle: str

# EQUIPAMENTOS (PRODUTOS)
class Equipamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    categoria_id: str
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    descricao: Optional[str] = None
    custo_aquisicao: float = 0.0
    valor_venda: float = 0.0
    valor_locacao_mensal: float = 0.0
    tipo_controle: str  # serializado, nao_serializado
    foto_url: Optional[str] = None
    fornecedor_id: Optional[str] = None
    # Para não-serializados
    quantidade_estoque: int = 0
    estoque_minimo: int = 0
    status: str = "ativo"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EquipamentoCreate(BaseModel):
    nome: str
    categoria_id: str
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    descricao: Optional[str] = None
    custo_aquisicao: float = 0.0
    valor_venda: float = 0.0
    valor_locacao_mensal: float = 0.0
    tipo_controle: str
    foto_url: Optional[str] = None
    fornecedor_id: Optional[str] = None
    estoque_minimo: int = 0

# EQUIPAMENTOS SERIALIZADOS (INSTÂNCIAS)
class EquipamentoSerializado(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    equipamento_id: str
    numero_serie: str
    numero_linha: Optional[str] = None
    numero_simcard: Optional[str] = None
    historico_simcards: List[Dict[str, str]] = []  # [{"numero": "123", "data_troca": "2024-01-01"}]
    status: str = "disponivel"  # disponivel, em_cliente, em_manutencao, vendido, baixado
    cliente_id: Optional[str] = None
    tipo_vinculo: Optional[str] = None  # venda, locacao, comodato
    local_id: Optional[str] = None
    data_aquisicao: Optional[str] = None
    data_garantia: Optional[str] = None
    custo_especifico: Optional[float] = None
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EquipamentoSerializadoCreate(BaseModel):
    equipamento_id: str
    numero_serie: str
    numero_linha: Optional[str] = None
    numero_simcard: Optional[str] = None
    local_id: Optional[str] = None
    data_aquisicao: Optional[str] = None
    data_garantia: Optional[str] = None
    custo_especifico: Optional[float] = None
    observacoes: Optional[str] = None

# MOVIMENTAÇÕES DE ESTOQUE
class MovimentacaoEstoque(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    tipo: str  # entrada, saida_venda, saida_locacao, devolucao, transferencia, perda, manutencao
    data: str  # ISO date
    equipamento_id: str
    equipamento_serializado_id: Optional[str] = None  # Para serializados
    quantidade: int = 1  # Para não-serializados
    cliente_id: Optional[str] = None
    local_origem_id: Optional[str] = None
    local_destino_id: Optional[str] = None
    observacoes: Optional[str] = None
    usuario_id: str
    valor_financeiro: Optional[float] = None
    criar_transacao_financeira: bool = False
    transacao_id: Optional[str] = None  # ID da transação financeira criada
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovimentacaoEstoqueCreate(BaseModel):
    tipo: str
    data: str
    equipamento_id: str
    equipamento_serializado_id: Optional[str] = None
    quantidade: int = 1
    cliente_id: Optional[str] = None
    local_origem_id: Optional[str] = None
    local_destino_id: Optional[str] = None
    observacoes: Optional[str] = None
    valor_financeiro: Optional[float] = None
    criar_transacao_financeira: bool = False
    categoria_financeira_id: Optional[str] = None  # Para criação de transação
    centro_custo_id: Optional[str] = None

# ==================== END ESTOQUE MODELS ====================

# ==================== CRM MODELS ====================

# LEADS / CONTATOS
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    telefone: str
    email: Optional[str] = None
    origem: str = "manual"  # whatsapp, manual, importacao, landing, indicacao
    status_funil: str = "novo"  # novo, contatado, qualificado, proposta, negociacao, ganho, perdido
    tags: List[str] = []
    valor_estimado: float = 0.0
    assigned_to: Optional[str] = None  # user_id do vendedor
    whatsapp_phone: Optional[str] = None  # Número formatado do WhatsApp
    last_contact_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    nome: str
    telefone: str
    email: Optional[str] = None
    origem: str = "manual"
    tags: List[str] = []
    valor_estimado: float = 0.0
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[List[str]] = None
    valor_estimado: Optional[float] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

# ATIVIDADES DO CRM
class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    empresa_id: str
    tipo: str  # note, call, email, whatsapp, status_change, assignment
    descricao: str
    user_id: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# TEMPLATES DE MENSAGEM
class MessageTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    conteudo: str  # Pode ter variáveis: {nome}, {valor}, {empresa}
    tipo: str = "whatsapp"  # whatsapp, email, sms
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageTemplateCreate(BaseModel):
    nome: str
    conteudo: str
    tipo: str = "whatsapp"

# REGRAS DE AUTOMAÇÃO
class AutomationRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    gatilho: str  # novo_lead, mudanca_status, sem_resposta
    condicoes: Dict[str, Any] = {}  # {"origem": "whatsapp", "status": "novo"}
    acoes: List[Dict[str, Any]] = []  # [{"tipo": "enviar_template", "template_id": "xxx"}]
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomationRuleCreate(BaseModel):
    nome: str
    gatilho: str
    condicoes: Dict[str, Any] = {}
    acoes: List[Dict[str, Any]] = []

# CONFIGURAÇÃO DE ROTEAMENTO
class RoutingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    tipo: str = "round_robin"  # round_robin, por_tag, manual
    usuarios_ativos: List[str] = []  # Lista de user_ids
    ultimo_atribuido: Optional[str] = None
    regras_por_tag: Dict[str, str] = {}  # {"tag": "user_id"}
    ativo: bool = True

# AGENTE IA
class AIAgent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    prompt_sistema: str
    palavras_chave_ativacao: List[str] = []  # ["orçamento", "preço", "quanto custa"]
    horario_ativo: Dict[str, Any] = {"inicio": "09:00", "fim": "18:00"}
    autonomia: str = "baixa"  # baixa, media, alta
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAgentCreate(BaseModel):
    nome: str
    prompt_sistema: str
    palavras_chave_ativacao: List[str] = []
    horario_ativo: Dict[str, Any] = {"inicio": "09:00", "fim": "18:00"}
    autonomia: str = "baixa"

# SEQUÊNCIAS DE AUTOMAÇÃO
class FollowUpSequence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    nome: str
    gatilho_status: str  # Status que ativa a sequência
    steps: List[Dict[str, Any]] = []  # [{"dia": 1, "template_id": "xxx", "tipo": "whatsapp"}]
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FollowUpSequenceCreate(BaseModel):
    nome: str
    gatilho_status: str
    steps: List[Dict[str, Any]] = []

# MÉTRICAS E RELATÓRIOS
class CRMMetrics(BaseModel):
    total_leads: int
    leads_por_status: Dict[str, int]
    leads_por_origem: Dict[str, int]
    taxa_conversao: Dict[str, float]
    tempo_medio_por_etapa: Dict[str, float]
    valor_total_pipeline: float
    leads_vencidos_mes: int
    leads_perdidos_mes: int
    desempenho_vendedores: List[Dict[str, Any]]

# ==================== END CRM MODELS ====================

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
    conta_bancaria_id: Optional[str] = None  # Vinculo com conta bancária
    cartao_credito_id: Optional[str] = None  # Vinculo com cartão
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
    conta_bancaria_id: Optional[str] = None
    cartao_credito_id: Optional[str] = None
    impostos: Optional[Dict[str, float]] = None
    parcelas: Optional[Dict[str, Any]] = None
    status: str = "pendente"
    origem: str = "manual"
    
    @validator('fornecedor', 'descricao', 'metodo_pagamento', 'conta_origem')
    def sanitize_text_fields(cls, v):
        if v:
            return sanitize_string(v, max_length=500)
        return v
    
    @validator('cnpj_cpf')
    def validate_document(cls, v):
        if v:
            if not (validate_cnpj(v) or validate_cpf(v)):
                raise ValueError('CNPJ/CPF inválido')
        return v
    
    @validator('valor_total')
    def validate_valor(cls, v):
        if v <= 0:
            raise ValueError('Valor deve ser maior que zero')
        if v > 999999999.99:
            raise ValueError('Valor muito alto')
        return v

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
    saldo_contas: float = 0.0
    saldo_cartoes: float = 0.0
    num_contas: int = 0
    num_cartoes: int = 0
    despesas_por_categoria: List[Dict[str, Any]]
    despesas_por_centro_custo: List[Dict[str, Any]]
    transacoes_recentes: List[Dict[str, Any]]

class CentroCustoMetrics(BaseModel):
    centro_custo_id: str
    centro_custo_nome: str
    total_receitas: float
    total_despesas: float
    lucro: float
    num_transacoes: int
    percentual_total: float

class CategoriaMetrics(BaseModel):
    categoria_id: str
    categoria_nome: str
    total_receitas: float
    total_despesas: float
    num_transacoes: int
    percentual_despesas: float
    percentual_receitas: float

class RelatorioDetalhado(BaseModel):
    periodo_inicio: str
    periodo_fim: str
    resumo_geral: Dict[str, Any]
    por_centro_custo: List[CentroCustoMetrics]
    por_categoria: List[CategoriaMetrics]
    transacoes: List[Dict[str, Any]]

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
        import re
        from datetime import date
        
        # Simple regex extraction as fallback/primary method
        dados = {
            "tipo": "despesa",
            "fornecedor": None,
            "cnpj_cpf": None,
            "descricao": texto,
            "valor_total": None,
            "data_competencia": date.today().isoformat(),
            "metodo_pagamento": None
        }
        
        # Extract valor (R$ 100,00 or R$ 100.00 or 100,00 or 100.00)
        valor_match = re.search(r'R?\$?\s*(\d+[\.,]\d{2})', texto.replace('.', '').replace(',', '.'))
        if valor_match:
            valor_str = valor_match.group(1).replace(',', '.')
            dados["valor_total"] = float(valor_str)
        
        # Extract fornecedor (words after "de/da/do/para/no/na")
        fornecedor_match = re.search(r'(?:de|da|do|para|no|na)\s+([A-Z][A-Za-z\s]+?)(?:\s*[,.]|\s+R\$|\s+\d)', texto, re.IGNORECASE)
        if fornecedor_match:
            dados["fornecedor"] = fornecedor_match.group(1).strip()
        
        # Detect tipo
        if any(word in texto.lower() for word in ['recebi', 'recebimento', 'venda', 'pagamento de cliente']):
            dados["tipo"] = "receita"
        
        # Extract date
        if 'hoje' in texto.lower():
            dados["data_competencia"] = date.today().isoformat()
        elif 'ontem' in texto.lower():
            from datetime import timedelta
            dados["data_competencia"] = (date.today() - timedelta(days=1)).isoformat()
        
        # Extract payment method
        if any(word in texto.lower() for word in ['pix', 'cartão', 'boleto', 'dinheiro', 'débito', 'crédito']):
            metodo_match = re.search(r'(pix|cartão|boleto|dinheiro|débito|crédito)', texto, re.IGNORECASE)
            if metodo_match:
                dados["metodo_pagamento"] = metodo_match.group(1).capitalize()
        
        return dados
    except Exception as e:
        logging.error(f"Error extracting data: {e}")
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
    return {"message": "ECHO SHOP Financial API v1.0"}

# AUTH ROUTES
@api_router.post("/auth/register", response_model=UserProfile)
@limiter.limit("5/hour")
async def register(request: Request, user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """
    Register new user - ADMIN ONLY
    Only administrators can create new users
    Rate limited to 5 registrations per hour per IP
    """
    # Check if current user is admin
    if current_user.get("perfil") != "admin":
        log_security_event(
            "UNAUTHORIZED_USER_CREATION_ATTEMPT",
            user_id=current_user.get("id"),
            ip_address=request.client.host if request.client else None,
            details=f"Non-admin tried to create user: {user_data.email}"
        )
        raise HTTPException(status_code=403, detail="Apenas administradores podem cadastrar usuários")
    # Log registration attempt
    log_security_event(
        "USER_REGISTRATION_ATTEMPT",
        user_id=None,
        ip_address=request.client.host if request.client else None,
        details=f"Email: {user_data.email}"
    )
    
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
    
    # Log successful registration
    log_security_event(
        "USER_REGISTERED",
        user_id=user_obj.id,
        ip_address=request.client.host if request.client else None,
        details=f"User created: {user_data.email}"
    )
    
    return user_obj

@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """
    List all users - ADMIN ONLY
    """
    if current_user.get("perfil") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem listar usuários."
        )
    
    users = await db.users.find({}, {"_id": 0, "senha_hash": 0}).to_list(100)
    return users

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    """
    Login with brute force protection
    Rate limited to 10 attempts per minute per IP
    """
    ip_address = request.client.host if request.client else "unknown"
    
    # Check for brute force attempts
    if check_brute_force(credentials.email):
        log_security_event(
            "BRUTE_FORCE_DETECTED",
            user_id=None,
            ip_address=ip_address,
            details=f"Email: {credentials.email}"
        )
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Tente novamente em 15 minutos."
        )
    
    if check_brute_force(ip_address):
        log_security_event(
            "BRUTE_FORCE_DETECTED_IP",
            user_id=None,
            ip_address=ip_address,
            details="Too many failed attempts from this IP"
        )
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de login. Tente novamente em 15 minutos."
        )
    
    # Check for SQL injection
    if check_sql_injection(credentials.email):
        log_security_event(
            "SQL_INJECTION_ATTEMPT",
            user_id=None,
            ip_address=ip_address,
            details=f"Suspicious email: {credentials.email}"
        )
        raise HTTPException(status_code=400, detail="Entrada inválida")
    
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        record_failed_login(credentials.email)
        record_failed_login(ip_address)
        log_security_event(
            "LOGIN_FAILED_USER_NOT_FOUND",
            user_id=None,
            ip_address=ip_address,
            details=f"Email: {credentials.email}"
        )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.senha, user["senha_hash"]):
        record_failed_login(credentials.email)
        record_failed_login(ip_address)
        log_security_event(
            "LOGIN_FAILED_WRONG_PASSWORD",
            user_id=user["id"],
            ip_address=ip_address,
            details=f"Email: {credentials.email}"
        )
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Clear failed attempts on successful login
    clear_failed_logins(credentials.email)
    clear_failed_logins(ip_address)
    
    # Create token
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    # Log successful login
    log_security_event(
        "LOGIN_SUCCESS",
        user_id=user["id"],
        ip_address=ip_address,
        details=f"Email: {credentials.email}"
    )
    
    # Remove sensitive data
    user_data = {k: v for k, v in user.items() if k != "senha_hash"}
    
    return TokenResponse(access_token=token, user=user_data)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = {k: v for k, v in current_user.items() if k != "senha_hash"}
    return user_data

@api_router.get("/users", response_model=List[UserProfile])
async def list_users(current_user: dict = Depends(get_current_user)):
    """
    List all users - ADMIN ONLY
    """
    if current_user.get("perfil") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem listar usuários")
    
    users = await db.users.find({}, {"_id": 0, "senha_hash": 0}).to_list(1000)
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a user - ADMIN ONLY
    """
    if current_user.get("perfil") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar usuários")
    
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Você não pode deletar sua própria conta")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Delete user
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Log the deletion
    log_security_event(
        "USER_DELETED",
        user_id=current_user["id"],
        ip_address="system",
        details=f"Deleted user: {user['email']}"
    )
    
    return {"message": f"Usuário {user['nome']} deletado com sucesso"}

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

# CONTAS BANCÁRIAS ROUTES
@api_router.post("/empresas/{empresa_id}/contas", response_model=ContaBancaria)
async def create_conta(empresa_id: str, conta_data: ContaBancariaCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    conta_obj = ContaBancaria(**conta_data.model_dump(), empresa_id=empresa_id, saldo_atual=conta_data.saldo_inicial)
    doc = conta_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contas_bancarias.insert_one(doc)
    return conta_obj

@api_router.get("/empresas/{empresa_id}/contas", response_model=List[ContaBancaria])
async def get_contas(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    contas = await db.contas_bancarias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
    return contas

@api_router.put("/contas/{conta_id}", response_model=ContaBancaria)
async def update_conta(conta_id: str, conta_data: ContaBancariaCreate, current_user: dict = Depends(get_current_user)):
    conta = await db.contas_bancarias.find_one({"id": conta_id}, {"_id": 0})
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    update_data = conta_data.model_dump()
    update_data['saldo_atual'] = conta['saldo_atual']  # Preservar saldo atual
    await db.contas_bancarias.update_one({"id": conta_id}, {"$set": update_data})
    
    updated_conta = await db.contas_bancarias.find_one({"id": conta_id}, {"_id": 0})
    return updated_conta

@api_router.delete("/contas/{conta_id}")
async def delete_conta(conta_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contas_bancarias.delete_one({"id": conta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta deletada"}

# INVESTIMENTOS ROUTES
@api_router.post("/empresas/{empresa_id}/investimentos", response_model=Investimento)
async def create_investimento(empresa_id: str, inv_data: InvestimentoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    inv_obj = Investimento(**inv_data.model_dump(), empresa_id=empresa_id)
    doc = inv_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.investimentos.insert_one(doc)
    return inv_obj

@api_router.get("/empresas/{empresa_id}/investimentos", response_model=List[Investimento])
async def get_investimentos(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    investimentos = await db.investimentos.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
    return investimentos

@api_router.put("/investimentos/{inv_id}", response_model=Investimento)
async def update_investimento(inv_id: str, inv_data: InvestimentoCreate, current_user: dict = Depends(get_current_user)):
    inv = await db.investimentos.find_one({"id": inv_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    
    update_data = inv_data.model_dump()
    await db.investimentos.update_one({"id": inv_id}, {"$set": update_data})
    
    updated_inv = await db.investimentos.find_one({"id": inv_id}, {"_id": 0})
    return updated_inv

@api_router.delete("/investimentos/{inv_id}")
async def delete_investimento(inv_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.investimentos.delete_one({"id": inv_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    return {"message": "Investimento deletado"}

# CARTÕES DE CRÉDITO ROUTES
@api_router.post("/empresas/{empresa_id}/cartoes", response_model=CartaoCredito)
async def create_cartao(empresa_id: str, cartao_data: CartaoCreditoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    cartao_obj = CartaoCredito(**cartao_data.model_dump(), empresa_id=empresa_id, limite_disponivel=cartao_data.limite_total)
    doc = cartao_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.cartoes_credito.insert_one(doc)
    return cartao_obj

@api_router.get("/empresas/{empresa_id}/cartoes", response_model=List[CartaoCredito])
async def get_cartoes(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    cartoes = await db.cartoes_credito.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
    return cartoes

@api_router.put("/cartoes/{cartao_id}", response_model=CartaoCredito)
async def update_cartao(cartao_id: str, cartao_data: CartaoCreditoCreate, current_user: dict = Depends(get_current_user)):
    cartao = await db.cartoes_credito.find_one({"id": cartao_id}, {"_id": 0})
    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    
    update_data = cartao_data.model_dump()
    update_data['limite_disponivel'] = cartao['limite_disponivel']  # Preservar limite disponível
    update_data['fatura_atual'] = cartao['fatura_atual']  # Preservar fatura
    await db.cartoes_credito.update_one({"id": cartao_id}, {"$set": update_data})
    
    updated_cartao = await db.cartoes_credito.find_one({"id": cartao_id}, {"_id": 0})
    return updated_cartao

@api_router.delete("/cartoes/{cartao_id}")
async def delete_cartao(cartao_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cartoes_credito.delete_one({"id": cartao_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return {"message": "Cartão deletado"}

# ==================== ESTOQUE ROUTES ====================

# CLIENTES ROUTES
@api_router.post("/empresas/{empresa_id}/clientes", response_model=Cliente)
async def create_cliente(empresa_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    cliente_obj = Cliente(**cliente_data.model_dump(), empresa_id=empresa_id)
    doc = cliente_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.clientes.insert_one(doc)
    return cliente_obj

@api_router.get("/empresas/{empresa_id}/clientes", response_model=List[Cliente])
async def get_clientes(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    clientes = await db.clientes.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return clientes

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def get_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = cliente_data.model_dump()
    await db.clientes.update_one({"id": cliente_id}, {"$set": update_data})
    
    updated_cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    return updated_cliente

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente deletado"}

# FORNECEDORES ROUTES
@api_router.post("/empresas/{empresa_id}/fornecedores", response_model=Fornecedor)
async def create_fornecedor(empresa_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    fornecedor_obj = Fornecedor(**fornecedor_data.model_dump(), empresa_id=empresa_id)
    doc = fornecedor_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.fornecedores.insert_one(doc)
    return fornecedor_obj

@api_router.get("/empresas/{empresa_id}/fornecedores", response_model=List[Fornecedor])
async def get_fornecedores(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    fornecedores = await db.fornecedores.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return fornecedores

@api_router.put("/fornecedores/{fornecedor_id}", response_model=Fornecedor)
async def update_fornecedor(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    update_data = fornecedor_data.model_dump()
    await db.fornecedores.update_one({"id": fornecedor_id}, {"$set": update_data})
    
    updated_fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    return updated_fornecedor

@api_router.delete("/fornecedores/{fornecedor_id}")
async def delete_fornecedor(fornecedor_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fornecedores.delete_one({"id": fornecedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return {"message": "Fornecedor deletado"}

# LOCAIS/DEPÓSITOS ROUTES
@api_router.post("/empresas/{empresa_id}/locais", response_model=LocalDeposito)
async def create_local(empresa_id: str, local_data: LocalDepositoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    local_obj = LocalDeposito(**local_data.model_dump(), empresa_id=empresa_id)
    doc = local_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.locais_deposito.insert_one(doc)
    return local_obj

@api_router.get("/empresas/{empresa_id}/locais", response_model=List[LocalDeposito])
async def get_locais(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    locais = await db.locais_deposito.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return locais

@api_router.put("/locais/{local_id}", response_model=LocalDeposito)
async def update_local(local_id: str, local_data: LocalDepositoCreate, current_user: dict = Depends(get_current_user)):
    local = await db.locais_deposito.find_one({"id": local_id}, {"_id": 0})
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    
    update_data = local_data.model_dump()
    await db.locais_deposito.update_one({"id": local_id}, {"$set": update_data})
    
    updated_local = await db.locais_deposito.find_one({"id": local_id}, {"_id": 0})
    return updated_local

@api_router.delete("/locais/{local_id}")
async def delete_local(local_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.locais_deposito.delete_one({"id": local_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    return {"message": "Local deletado"}

# CATEGORIAS DE EQUIPAMENTOS ROUTES
@api_router.post("/empresas/{empresa_id}/categorias-equipamentos", response_model=CategoriaEquipamento)
async def create_categoria_equipamento(empresa_id: str, categoria_data: CategoriaEquipamentoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    categoria_obj = CategoriaEquipamento(**categoria_data.model_dump(), empresa_id=empresa_id)
    doc = categoria_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.categorias_equipamentos.insert_one(doc)
    return categoria_obj

@api_router.get("/empresas/{empresa_id}/categorias-equipamentos", response_model=List[CategoriaEquipamento])
async def get_categorias_equipamentos(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    categorias = await db.categorias_equipamentos.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return categorias

@api_router.put("/categorias-equipamentos/{categoria_id}", response_model=CategoriaEquipamento)
async def update_categoria_equipamento(categoria_id: str, categoria_data: CategoriaEquipamentoCreate, current_user: dict = Depends(get_current_user)):
    categoria = await db.categorias_equipamentos.find_one({"id": categoria_id}, {"_id": 0})
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    update_data = categoria_data.model_dump()
    await db.categorias_equipamentos.update_one({"id": categoria_id}, {"$set": update_data})
    
    updated_categoria = await db.categorias_equipamentos.find_one({"id": categoria_id}, {"_id": 0})
    return updated_categoria

@api_router.delete("/categorias-equipamentos/{categoria_id}")
async def delete_categoria_equipamento(categoria_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categorias_equipamentos.delete_one({"id": categoria_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria deletada"}

# EQUIPAMENTOS ROUTES
@api_router.post("/empresas/{empresa_id}/equipamentos", response_model=Equipamento)
async def create_equipamento(empresa_id: str, equipamento_data: EquipamentoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    equipamento_obj = Equipamento(**equipamento_data.model_dump(), empresa_id=empresa_id)
    doc = equipamento_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.equipamentos.insert_one(doc)
    return equipamento_obj

@api_router.get("/empresas/{empresa_id}/equipamentos", response_model=List[Equipamento])
async def get_equipamentos(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    equipamentos = await db.equipamentos.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return equipamentos

@api_router.get("/equipamentos/{equipamento_id}", response_model=Equipamento)
async def get_equipamento(equipamento_id: str, current_user: dict = Depends(get_current_user)):
    equipamento = await db.equipamentos.find_one({"id": equipamento_id}, {"_id": 0})
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    return equipamento

@api_router.put("/equipamentos/{equipamento_id}", response_model=Equipamento)
async def update_equipamento(equipamento_id: str, equipamento_data: EquipamentoCreate, current_user: dict = Depends(get_current_user)):
    equipamento = await db.equipamentos.find_one({"id": equipamento_id}, {"_id": 0})
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    update_data = equipamento_data.model_dump()
    # Preservar quantidade_estoque atual
    update_data['quantidade_estoque'] = equipamento['quantidade_estoque']
    
    await db.equipamentos.update_one({"id": equipamento_id}, {"$set": update_data})
    
    updated_equipamento = await db.equipamentos.find_one({"id": equipamento_id}, {"_id": 0})
    return updated_equipamento

@api_router.delete("/equipamentos/{equipamento_id}")
async def delete_equipamento(equipamento_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.equipamentos.delete_one({"id": equipamento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    return {"message": "Equipamento deletado"}

# EQUIPAMENTOS SERIALIZADOS ROUTES
@api_router.post("/empresas/{empresa_id}/equipamentos-serializados", response_model=EquipamentoSerializado)
async def create_equipamento_serializado(empresa_id: str, eq_serial_data: EquipamentoSerializadoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Verificar se número de série já existe
    existing = await db.equipamentos_serializados.find_one({"numero_serie": eq_serial_data.numero_serie, "empresa_id": empresa_id})
    if existing:
        raise HTTPException(status_code=400, detail="Número de série já cadastrado")
    
    eq_serial_obj = EquipamentoSerializado(**eq_serial_data.model_dump(), empresa_id=empresa_id)
    doc = eq_serial_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.equipamentos_serializados.insert_one(doc)
    return eq_serial_obj

@api_router.get("/empresas/{empresa_id}/equipamentos-serializados", response_model=List[EquipamentoSerializado])
async def get_equipamentos_serializados(
    empresa_id: str, 
    status: Optional[str] = None,
    cliente_id: Optional[str] = None,
    equipamento_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"empresa_id": empresa_id}
    if status:
        query["status"] = status
    if cliente_id:
        query["cliente_id"] = cliente_id
    if equipamento_id:
        query["equipamento_id"] = equipamento_id
    
    equipamentos = await db.equipamentos_serializados.find(query, {"_id": 0}).to_list(1000)
    return equipamentos

@api_router.get("/equipamentos-serializados/{eq_serial_id}", response_model=EquipamentoSerializado)
async def get_equipamento_serializado(eq_serial_id: str, current_user: dict = Depends(get_current_user)):
    eq_serial = await db.equipamentos_serializados.find_one({"id": eq_serial_id}, {"_id": 0})
    if not eq_serial:
        raise HTTPException(status_code=404, detail="Equipamento serializado não encontrado")
    return eq_serial

@api_router.put("/equipamentos-serializados/{eq_serial_id}", response_model=EquipamentoSerializado)
async def update_equipamento_serializado(eq_serial_id: str, eq_serial_data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    eq_serial = await db.equipamentos_serializados.find_one({"id": eq_serial_id}, {"_id": 0})
    if not eq_serial:
        raise HTTPException(status_code=404, detail="Equipamento serializado não encontrado")
    
    # Se mudou o SIM card, adicionar ao histórico
    if 'numero_simcard' in eq_serial_data and eq_serial_data['numero_simcard'] != eq_serial.get('numero_simcard'):
        if 'historico_simcards' not in eq_serial:
            eq_serial['historico_simcards'] = []
        
        if eq_serial.get('numero_simcard'):
            eq_serial['historico_simcards'].append({
                "numero": eq_serial['numero_simcard'],
                "data_troca": datetime.now(timezone.utc).isoformat()
            })
        eq_serial_data['historico_simcards'] = eq_serial['historico_simcards']
    
    await db.equipamentos_serializados.update_one({"id": eq_serial_id}, {"$set": eq_serial_data})
    
    updated_eq_serial = await db.equipamentos_serializados.find_one({"id": eq_serial_id}, {"_id": 0})
    return updated_eq_serial

@api_router.delete("/equipamentos-serializados/{eq_serial_id}")
async def delete_equipamento_serializado(eq_serial_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.equipamentos_serializados.delete_one({"id": eq_serial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipamento serializado não encontrado")
    return {"message": "Equipamento serializado deletado"}

# MOVIMENTAÇÕES DE ESTOQUE ROUTES
@api_router.post("/empresas/{empresa_id}/movimentacoes", response_model=MovimentacaoEstoque)
async def create_movimentacao(empresa_id: str, mov_data: MovimentacaoEstoqueCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar equipamento
    equipamento = await db.equipamentos.find_one({"id": mov_data.equipamento_id}, {"_id": 0})
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    mov_obj = MovimentacaoEstoque(
        **mov_data.model_dump(exclude={'categoria_financeira_id', 'centro_custo_id'}),
        empresa_id=empresa_id,
        usuario_id=current_user["id"]
    )
    doc = mov_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Processar movimentação baseado no tipo
    if equipamento['tipo_controle'] == 'serializado':
        # Para serializados, atualizar status do equipamento
        if mov_data.equipamento_serializado_id:
            eq_serial = await db.equipamentos_serializados.find_one({"id": mov_data.equipamento_serializado_id}, {"_id": 0})
            if not eq_serial:
                raise HTTPException(status_code=404, detail="Equipamento serializado não encontrado")
            
            update_data = {}
            if mov_data.tipo == "saida_venda":
                update_data = {"status": "vendido", "cliente_id": mov_data.cliente_id, "tipo_vinculo": "venda"}
            elif mov_data.tipo == "saida_locacao":
                update_data = {"status": "em_cliente", "cliente_id": mov_data.cliente_id, "tipo_vinculo": "locacao"}
            elif mov_data.tipo == "devolucao":
                update_data = {"status": "disponivel", "cliente_id": None, "tipo_vinculo": None}
            elif mov_data.tipo == "manutencao":
                update_data = {"status": "em_manutencao"}
            elif mov_data.tipo == "perda":
                update_data = {"status": "baixado"}
            
            if update_data:
                await db.equipamentos_serializados.update_one({"id": mov_data.equipamento_serializado_id}, {"$set": update_data})
    
    else:
        # Para não-serializados, atualizar quantidade em estoque
        if mov_data.tipo == "entrada":
            await db.equipamentos.update_one(
                {"id": mov_data.equipamento_id},
                {"$inc": {"quantidade_estoque": mov_data.quantidade}}
            )
        elif mov_data.tipo in ["saida_venda", "saida_locacao", "perda"]:
            # Verificar se há estoque suficiente
            if equipamento['quantidade_estoque'] < mov_data.quantidade:
                raise HTTPException(status_code=400, detail="Estoque insuficiente")
            
            await db.equipamentos.update_one(
                {"id": mov_data.equipamento_id},
                {"$inc": {"quantidade_estoque": -mov_data.quantidade}}
            )
        elif mov_data.tipo == "devolucao":
            await db.equipamentos.update_one(
                {"id": mov_data.equipamento_id},
                {"$inc": {"quantidade_estoque": mov_data.quantidade}}
            )
    
    # Criar transação financeira se solicitado
    if mov_data.criar_transacao_financeira and mov_data.valor_financeiro and mov_data.categoria_financeira_id and mov_data.centro_custo_id:
        transacao_tipo = "receita" if mov_data.tipo in ["saida_venda", "saida_locacao"] else "despesa"
        
        transacao_obj = Transacao(
            empresa_id=empresa_id,
            usuario_id=current_user["id"],
            tipo=transacao_tipo,
            fornecedor=mov_data.cliente_id or "Sistema de Estoque",
            descricao=f"Movimentação estoque: {mov_data.tipo} - {equipamento['nome']}",
            valor_total=mov_data.valor_financeiro,
            data_competencia=mov_data.data,
            categoria_id=mov_data.categoria_financeira_id,
            centro_custo_id=mov_data.centro_custo_id,
            status="conciliada",
            origem="estoque"
        )
        
        trans_doc = transacao_obj.model_dump()
        trans_doc['created_at'] = trans_doc['created_at'].isoformat()
        
        await db.transacoes.insert_one(trans_doc)
        mov_obj.transacao_id = transacao_obj.id
        doc['transacao_id'] = transacao_obj.id
    
    await db.movimentacoes_estoque.insert_one(doc)
    return mov_obj

@api_router.get("/empresas/{empresa_id}/movimentacoes", response_model=List[MovimentacaoEstoque])
async def get_movimentacoes(
    empresa_id: str,
    tipo: Optional[str] = None,
    equipamento_id: Optional[str] = None,
    cliente_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"empresa_id": empresa_id}
    if tipo:
        query["tipo"] = tipo
    if equipamento_id:
        query["equipamento_id"] = equipamento_id
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    movimentacoes = await db.movimentacoes_estoque.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return movimentacoes

# ==================== END ESTOQUE ROUTES ====================

# ==================== CRM ROUTES ====================

# LEADS ROUTES
@api_router.post("/empresas/{empresa_id}/leads", response_model=Lead)
async def create_lead(empresa_id: str, lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    lead_obj = Lead(**lead_data.model_dump(), empresa_id=empresa_id)
    doc = lead_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_contact_at'):
        doc['last_contact_at'] = doc['last_contact_at'].isoformat()
    
    await db.leads.insert_one(doc)
    
    # Registrar atividade
    activity = Activity(
        lead_id=lead_obj.id,
        empresa_id=empresa_id,
        tipo="note",
        descricao=f"Lead criado: {lead_obj.nome}",
        user_id=current_user["id"]
    )
    activity_doc = activity.model_dump()
    activity_doc['created_at'] = activity_doc['created_at'].isoformat()
    await db.activities.insert_one(activity_doc)
    
    return lead_obj

@api_router.get("/empresas/{empresa_id}/leads", response_model=List[Lead])
async def get_leads(
    empresa_id: str,
    status_funil: Optional[str] = None,
    assigned_to: Optional[str] = None,
    origem: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {"empresa_id": empresa_id}
    if status_funil:
        query["status_funil"] = status_funil
    if assigned_to:
        query["assigned_to"] = assigned_to
    if origem:
        query["origem"] = origem
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return lead

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_data: LeadUpdate, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    update_data = {k: v for k, v in lead_data.model_dump(exclude_unset=True).items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    
    # Registrar atividade
    activity = Activity(
        lead_id=lead_id,
        empresa_id=lead['empresa_id'],
        tipo="note",
        descricao=f"Lead atualizado",
        user_id=current_user["id"],
        metadata=update_data
    )
    activity_doc = activity.model_dump()
    activity_doc['created_at'] = activity_doc['created_at'].isoformat()
    await db.activities.insert_one(activity_doc)
    
    updated_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated_lead

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"message": "Lead deletado"}

@api_router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Atualizar status do lead no funil (para Kanban drag-and-drop)"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    old_status = lead.get('status_funil')
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status_funil": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Registrar atividade
    activity = Activity(
        lead_id=lead_id,
        empresa_id=lead['empresa_id'],
        tipo="status_change",
        descricao=f"Status alterado de '{old_status}' para '{status}'",
        user_id=current_user["id"],
        metadata={"old_status": old_status, "new_status": status}
    )
    activity_doc = activity.model_dump()
    activity_doc['created_at'] = activity_doc['created_at'].isoformat()
    await db.activities.insert_one(activity_doc)
    
    return {"message": "Status atualizado", "new_status": status}

@api_router.patch("/leads/{lead_id}/assign")
async def assign_lead(lead_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Atribuir lead a um vendedor"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    old_assigned = lead.get('assigned_to')
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "assigned_to": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Registrar atividade
    activity = Activity(
        lead_id=lead_id,
        empresa_id=lead['empresa_id'],
        tipo="assignment",
        descricao=f"Lead atribuído ao usuário {user_id}",
        user_id=current_user["id"],
        metadata={"old_assigned": old_assigned, "new_assigned": user_id}
    )
    activity_doc = activity.model_dump()
    activity_doc['created_at'] = activity_doc['created_at'].isoformat()
    await db.activities.insert_one(activity_doc)
    
    return {"message": "Lead atribuído", "assigned_to": user_id}

@api_router.get("/leads/{lead_id}/activities", response_model=List[Activity])
async def get_lead_activities(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Obter histórico de atividades do lead"""
    activities = await db.activities.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return activities

@api_router.get("/leads/{lead_id}/whatsapp-messages")
async def get_lead_whatsapp_messages(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Obter histórico de mensagens WhatsApp do lead"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Buscar transações do WhatsApp com o telefone do lead
    telefone = lead.get('whatsapp_phone') or lead.get('telefone')
    transacoes = await db.transacoes.find({
        "empresa_id": lead['empresa_id'],
        "origem": {"$in": ["whatsapp", "whatsapp_bot"]}
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Filtrar por telefone se disponível
    # Note: Isso é uma aproximação. Idealmente teríamos uma coleção separada de mensagens
    return {
        "lead_id": lead_id,
        "telefone": telefone,
        "messages": [],  # TODO: Implementar busca real de mensagens WhatsApp
        "transacoes_relacionadas": transacoes[:10]
    }

# TEMPLATES ROUTES
@api_router.post("/empresas/{empresa_id}/templates", response_model=MessageTemplate)
async def create_template(empresa_id: str, template_data: MessageTemplateCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    template_obj = MessageTemplate(**template_data.model_dump(), empresa_id=empresa_id)
    doc = template_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.message_templates.insert_one(doc)
    return template_obj

@api_router.get("/empresas/{empresa_id}/templates", response_model=List[MessageTemplate])
async def get_templates(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    templates = await db.message_templates.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return templates

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.message_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return {"message": "Template deletado"}

@api_router.post("/leads/{lead_id}/send-message")
async def send_message_to_lead(
    lead_id: str,
    message: str,
    template_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Enviar mensagem para lead via WhatsApp"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    telefone = lead.get('whatsapp_phone') or lead.get('telefone')
    if not telefone:
        raise HTTPException(status_code=400, detail="Lead não possui telefone cadastrado")
    
    # Se template_id fornecido, buscar e interpolar variáveis
    if template_id:
        template = await db.message_templates.find_one({"id": template_id}, {"_id": 0})
        if template:
            message = template['conteudo']
            # Interpolar variáveis
            message = message.replace('{nome}', lead.get('nome', ''))
            message = message.replace('{valor}', str(lead.get('valor_estimado', 0)))
            empresa = await db.empresas.find_one({"id": lead['empresa_id']}, {"_id": 0})
            if empresa:
                message = message.replace('{empresa}', empresa.get('razao_social', ''))
    
    # TODO: Integrar com serviço WhatsApp para enviar mensagem real
    # Por enquanto, apenas registrar atividade
    activity = Activity(
        lead_id=lead_id,
        empresa_id=lead['empresa_id'],
        tipo="whatsapp",
        descricao=f"Mensagem enviada: {message[:50]}...",
        user_id=current_user["id"],
        metadata={"telefone": telefone, "message": message}
    )
    activity_doc = activity.model_dump()
    activity_doc['created_at'] = activity_doc['created_at'].isoformat()
    await db.activities.insert_one(activity_doc)
    
    return {"message": "Mensagem enviada", "telefone": telefone, "conteudo": message}

# AUTOMAÇÃO ROUTES
@api_router.post("/empresas/{empresa_id}/automation-rules", response_model=AutomationRule)
async def create_automation_rule(empresa_id: str, rule_data: AutomationRuleCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    rule_obj = AutomationRule(**rule_data.model_dump(), empresa_id=empresa_id)
    doc = rule_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.automation_rules.insert_one(doc)
    return rule_obj

@api_router.get("/empresas/{empresa_id}/automation-rules", response_model=List[AutomationRule])
async def get_automation_rules(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    rules = await db.automation_rules.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return rules

# ROTEAMENTO ROUTES
@api_router.get("/empresas/{empresa_id}/routing-config", response_model=RoutingConfig)
async def get_routing_config(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    config = await db.routing_configs.find_one({"empresa_id": empresa_id}, {"_id": 0})
    if not config:
        # Criar configuração padrão
        config_obj = RoutingConfig(empresa_id=empresa_id)
        doc = config_obj.model_dump()
        await db.routing_configs.insert_one(doc)
        return config_obj
    return config

@api_router.put("/empresas/{empresa_id}/routing-config", response_model=RoutingConfig)
async def update_routing_config(
    empresa_id: str,
    tipo: str,
    usuarios_ativos: List[str],
    current_user: dict = Depends(get_current_user)
):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    await db.routing_configs.update_one(
        {"empresa_id": empresa_id},
        {"$set": {"tipo": tipo, "usuarios_ativos": usuarios_ativos, "ativo": True}},
        upsert=True
    )
    
    config = await db.routing_configs.find_one({"empresa_id": empresa_id}, {"_id": 0})
    return config

async def apply_routing(empresa_id: str, lead_id: str):
    """Aplicar roteamento automático ao lead"""
    config = await db.routing_configs.find_one({"empresa_id": empresa_id, "ativo": True}, {"_id": 0})
    if not config or not config.get('usuarios_ativos'):
        return None
    
    if config['tipo'] == 'round_robin':
        usuarios = config['usuarios_ativos']
        ultimo = config.get('ultimo_atribuido')
        
        # Encontrar próximo usuário
        if not ultimo or ultimo not in usuarios:
            proximo = usuarios[0]
        else:
            idx = usuarios.index(ultimo)
            proximo = usuarios[(idx + 1) % len(usuarios)]
        
        # Atualizar lead e config
        await db.leads.update_one({"id": lead_id}, {"$set": {"assigned_to": proximo}})
        await db.routing_configs.update_one(
            {"empresa_id": empresa_id},
            {"$set": {"ultimo_atribuido": proximo}}
        )
        
        return proximo
    
    return None

# AGENTE IA ROUTES
@api_router.post("/empresas/{empresa_id}/ai-agents", response_model=AIAgent)
async def create_ai_agent(empresa_id: str, agent_data: AIAgentCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    agent_obj = AIAgent(**agent_data.model_dump(), empresa_id=empresa_id)
    doc = agent_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.ai_agents.insert_one(doc)
    return agent_obj

@api_router.get("/empresas/{empresa_id}/ai-agents", response_model=List[AIAgent])
async def get_ai_agents(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    agents = await db.ai_agents.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return agents

@api_router.put("/ai-agents/{agent_id}", response_model=AIAgent)
async def update_ai_agent(agent_id: str, agent_data: AIAgentCreate, current_user: dict = Depends(get_current_user)):
    agent = await db.ai_agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    
    update_data = agent_data.model_dump()
    await db.ai_agents.update_one({"id": agent_id}, {"$set": update_data})
    
    updated_agent = await db.ai_agents.find_one({"id": agent_id}, {"_id": 0})
    return updated_agent

@api_router.delete("/ai-agents/{agent_id}")
async def delete_ai_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.ai_agents.delete_one({"id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return {"message": "Agente deletado"}

async def process_ai_response(empresa_id: str, lead_id: str, message: str):
    """Processar mensagem com agente de IA e gerar resposta"""
    # Buscar agente ativo
    agent = await db.ai_agents.find_one({"empresa_id": empresa_id, "ativo": True}, {"_id": 0})
    if not agent:
        return None
    
    # Verificar palavras-chave de ativação
    palavras_chave = agent.get('palavras_chave_ativacao', [])
    if palavras_chave:
        message_lower = message.lower()
        if not any(palavra.lower() in message_lower for palavra in palavras_chave):
            return None
    
    # Buscar lead
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    
    # TODO: Integrar com Emergent LLM para resposta real
    # Por enquanto, resposta simples baseada em regras
    prompt = f"{agent['prompt_sistema']}\n\nMensagem do cliente: {message}\nNome: {lead.get('nome', 'Cliente')}"
    
    # Resposta padrão por enquanto
    if any(palavra in message.lower() for palavra in ['preço', 'valor', 'quanto', 'orçamento']):
        resposta = f"Olá {lead.get('nome', 'Cliente')}! Obrigado pelo interesse. Nossa equipe entrará em contato em breve com um orçamento personalizado. Poderia me informar mais detalhes sobre suas necessidades?"
    elif any(palavra in message.lower() for palavra in ['horário', 'atendimento', 'funciona']):
        resposta = "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Como posso ajudá-lo?"
    else:
        resposta = f"Olá! Recebi sua mensagem. Um de nossos consultores entrará em contato em breve. Há algo específico que gostaria de saber?"
    
    return resposta

# MÉTRICAS E DASHBOARD CRM
@api_router.get("/empresas/{empresa_id}/crm/metrics", response_model=CRMMetrics)
async def get_crm_metrics(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Obter métricas e KPIs do CRM"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar todos os leads
    leads = await db.leads.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(10000)
    
    # Total de leads
    total_leads = len(leads)
    
    # Leads por status
    leads_por_status = {}
    for lead in leads:
        status = lead.get('status_funil', 'novo')
        leads_por_status[status] = leads_por_status.get(status, 0) + 1
    
    # Leads por origem
    leads_por_origem = {}
    for lead in leads:
        origem = lead.get('origem', 'manual')
        leads_por_origem[origem] = leads_por_origem.get(origem, 0) + 1
    
    # Taxa de conversão por etapa
    taxa_conversao = {}
    total = total_leads if total_leads > 0 else 1
    for status, count in leads_por_status.items():
        taxa_conversao[status] = (count / total) * 100
    
    # Valor total do pipeline
    valor_total_pipeline = sum(lead.get('valor_estimado', 0) for lead in leads if lead.get('status_funil') not in ['ganho', 'perdido'])
    
    # Leads ganhos e perdidos no mês atual
    now = datetime.now(timezone.utc)
    mes_atual = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    leads_vencidos_mes = len([l for l in leads if l.get('status_funil') == 'ganho' and l.get('updated_at', '') >= mes_atual])
    leads_perdidos_mes = len([l for l in leads if l.get('status_funil') == 'perdido' and l.get('updated_at', '') >= mes_atual])
    
    # Desempenho por vendedor
    vendedores_stats = {}
    for lead in leads:
        assigned_to = lead.get('assigned_to')
        if assigned_to:
            if assigned_to not in vendedores_stats:
                vendedores_stats[assigned_to] = {
                    'user_id': assigned_to,
                    'total_leads': 0,
                    'leads_ganhos': 0,
                    'leads_perdidos': 0,
                    'valor_ganho': 0
                }
            vendedores_stats[assigned_to]['total_leads'] += 1
            if lead.get('status_funil') == 'ganho':
                vendedores_stats[assigned_to]['leads_ganhos'] += 1
                vendedores_stats[assigned_to]['valor_ganho'] += lead.get('valor_estimado', 0)
            elif lead.get('status_funil') == 'perdido':
                vendedores_stats[assigned_to]['leads_perdidos'] += 1
    
    desempenho_vendedores = list(vendedores_stats.values())
    
    # Tempo médio por etapa (simplificado)
    tempo_medio_por_etapa = {
        "novo": 1.5,
        "contatado": 2.0,
        "qualificado": 3.5,
        "proposta": 5.0,
        "negociacao": 7.0
    }
    
    return CRMMetrics(
        total_leads=total_leads,
        leads_por_status=leads_por_status,
        leads_por_origem=leads_por_origem,
        taxa_conversao=taxa_conversao,
        tempo_medio_por_etapa=tempo_medio_por_etapa,
        valor_total_pipeline=valor_total_pipeline,
        leads_vencidos_mes=leads_vencidos_mes,
        leads_perdidos_mes=leads_perdidos_mes,
        desempenho_vendedores=desempenho_vendedores
    )

# RELATÓRIOS EXPORTÁVEIS
@api_router.get("/empresas/{empresa_id}/crm/export/leads")
async def export_leads_csv(empresa_id: str, current_user: dict = Depends(get_current_user)):
    """Exportar leads para CSV"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    leads = await db.leads.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(10000)
    
    # Criar CSV
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['id', 'nome', 'telefone', 'email', 'origem', 'status_funil', 'valor_estimado', 'assigned_to', 'created_at'])
    writer.writeheader()
    
    for lead in leads:
        writer.writerow({
            'id': lead.get('id'),
            'nome': lead.get('nome'),
            'telefone': lead.get('telefone'),
            'email': lead.get('email', ''),
            'origem': lead.get('origem'),
            'status_funil': lead.get('status_funil'),
            'valor_estimado': lead.get('valor_estimado', 0),
            'assigned_to': lead.get('assigned_to', ''),
            'created_at': lead.get('created_at')
        })
    
    output.seek(0)
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=leads.csv"})

# SEQUÊNCIAS DE FOLLOW-UP
@api_router.post("/empresas/{empresa_id}/follow-up-sequences", response_model=FollowUpSequence)
async def create_sequence(empresa_id: str, sequence_data: FollowUpSequenceCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    sequence_obj = FollowUpSequence(**sequence_data.model_dump(), empresa_id=empresa_id)
    doc = sequence_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.follow_up_sequences.insert_one(doc)
    return sequence_obj

@api_router.get("/empresas/{empresa_id}/follow-up-sequences", response_model=List[FollowUpSequence])
async def get_sequences(empresa_id: str, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    sequences = await db.follow_up_sequences.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(1000)
    return sequences

@api_router.delete("/follow-up-sequences/{sequence_id}")
async def delete_sequence(sequence_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.follow_up_sequences.delete_one({"id": sequence_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sequência não encontrada")
    return {"message": "Sequência deletada"}

# COMPLIANCE LGPD
@api_router.get("/leads/{lead_id}/export-data")
async def export_lead_data(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Exportar todos os dados de um lead (LGPD)"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Buscar atividades
    activities = await db.activities.find({"lead_id": lead_id}, {"_id": 0}).to_list(1000)
    
    # Montar pacote de dados
    export_data = {
        "lead": lead,
        "activities": activities,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data_subject_rights": "Este é seu pacote completo de dados conforme LGPD"
    }
    
    return export_data

@api_router.delete("/leads/{lead_id}/gdpr-delete")
async def delete_lead_gdpr(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar permanentemente todos os dados de um lead (LGPD)"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Deletar lead
    await db.leads.delete_one({"id": lead_id})
    
    # Deletar atividades
    await db.activities.delete_many({"lead_id": lead_id})
    
    # Registrar log de exclusão
    logging.info(f"LGPD: Lead {lead_id} deletado permanentemente por {current_user['id']}")
    
    return {
        "message": "Todos os dados do lead foram deletados permanentemente",
        "lead_id": lead_id,
        "deleted_at": datetime.now(timezone.utc).isoformat()
    }

# ==================== END CRM ROUTES ====================

# TRANSACAO ROUTES
@api_router.post("/empresas/{empresa_id}/transacoes", response_model=Transacao)
async def create_transacao(empresa_id: str, transacao_data: TransacaoCreate, current_user: dict = Depends(get_current_user)):
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    transacao_obj = Transacao(**transacao_data.model_dump(), empresa_id=empresa_id, usuario_id=current_user["id"])
    doc = transacao_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transacoes.insert_one(doc)
    
    # Atualizar saldo da conta bancária se vinculado
    if transacao_data.conta_bancaria_id:
        if transacao_data.tipo == "receita":
            await db.contas_bancarias.update_one(
                {"id": transacao_data.conta_bancaria_id},
                {"$inc": {"saldo_atual": transacao_data.valor_total}}
            )
        else:  # despesa
            await db.contas_bancarias.update_one(
                {"id": transacao_data.conta_bancaria_id},
                {"$inc": {"saldo_atual": -transacao_data.valor_total}}
            )
    
    # Atualizar fatura do cartão se vinculado
    if transacao_data.cartao_credito_id and transacao_data.tipo == "despesa":
        await db.cartoes_credito.update_one(
            {"id": transacao_data.cartao_credito_id},
            {
                "$inc": {
                    "fatura_atual": transacao_data.valor_total,
                    "limite_disponivel": -transacao_data.valor_total
                }
            }
        )
    
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

@api_router.patch("/transacoes/{transacao_id}/status")
async def update_transacao_status(
    transacao_id: str, 
    status: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Update transaction status (pendente, concluido, cancelado)"""
    if status not in ["pendente", "concluido", "cancelado"]:
        raise HTTPException(status_code=400, detail="Status inválido. Use: pendente, concluido ou cancelado")
    
    # Check if transaction exists and user has access
    transacao = await db.transacoes.find_one({"id": transacao_id}, {"_id": 0})
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transacao["empresa_id"] not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Update status
    result = await db.transacoes.update_one(
        {"id": transacao_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Não foi possível atualizar o status")
    
    return {"message": f"Status atualizado para {status}", "transacao_id": transacao_id, "status": status}

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
    
    # Get bank accounts balance
    contas = await db.contas_bancarias.find({"empresa_id": empresa_id, "ativa": True}, {"_id": 0}).to_list(1000)
    saldo_contas = sum(c.get("saldo_atual", 0) for c in contas)
    num_contas = len(contas)
    
    # Get credit cards balance
    cartoes = await db.cartoes_credito.find({"empresa_id": empresa_id, "ativo": True}, {"_id": 0}).to_list(1000)
    saldo_cartoes = sum(c.get("limite_disponivel", 0) for c in cartoes)
    num_cartoes = len(cartoes)
    
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
        saldo_contas=saldo_contas,
        saldo_cartoes=saldo_cartoes,
        num_contas=num_contas,
        num_cartoes=num_cartoes,
        despesas_por_categoria=despesas_por_categoria,
        despesas_por_centro_custo=despesas_por_centro_custo,
        transacoes_recentes=transacoes_recentes
    )

@api_router.get("/empresas/{empresa_id}/relatorios", response_model=RelatorioDetalhado)
async def get_relatorio_detalhado(
    empresa_id: str,
    periodo_inicio: Optional[str] = None,
    periodo_fim: Optional[str] = None,
    tipo_periodo: str = "mensal",  # mensal, anual, personalizado
    current_user: dict = Depends(get_current_user)
):
    """
    Gerar relatório detalhado com análise por centro de custo e categoria
    """
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Definir período baseado no tipo
    hoje = datetime.now(timezone.utc)
    if tipo_periodo == "mensal":
        periodo_inicio = hoje.replace(day=1).isoformat()
        periodo_fim = hoje.isoformat()
    elif tipo_periodo == "anual":
        periodo_inicio = hoje.replace(month=1, day=1).isoformat()
        periodo_fim = hoje.isoformat()
    # Para personalizado, usar os parâmetros fornecidos
    
    # Buscar transações do período
    query = {"empresa_id": empresa_id}
    if periodo_inicio and periodo_fim:
        query["data_competencia"] = {
            "$gte": periodo_inicio.split("T")[0],
            "$lte": periodo_fim.split("T")[0]
        }
    
    transacoes = await db.transacoes.find(query, {"_id": 0}).to_list(10000)
    
    # Calcular resumo geral
    total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
    total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
    lucro = total_receitas - total_despesas
    
    resumo_geral = {
        "total_receitas": total_receitas,
        "total_despesas": total_despesas,
        "lucro": lucro,
        "num_transacoes": len(transacoes),
        "ticket_medio": (total_receitas + total_despesas) / len(transacoes) if transacoes else 0
    }
    
    # Análise por Centro de Custo
    cc_map = {}
    for t in transacoes:
        cc_id = t.get("centro_custo_id")
        if cc_id:
            if cc_id not in cc_map:
                cc = await db.centros_custo.find_one({"id": cc_id}, {"_id": 0})
                cc_map[cc_id] = {
                    "id": cc_id,
                    "nome": cc["nome"] if cc else "Desconhecido",
                    "receitas": 0,
                    "despesas": 0,
                    "num_transacoes": 0
                }
            
            cc_map[cc_id]["num_transacoes"] += 1
            if t["tipo"] == "receita":
                cc_map[cc_id]["receitas"] += t["valor_total"]
            else:
                cc_map[cc_id]["despesas"] += t["valor_total"]
    
    por_centro_custo = []
    for cc_id, data in cc_map.items():
        lucro_cc = data["receitas"] - data["despesas"]
        percentual = ((data["receitas"] + data["despesas"]) / (total_receitas + total_despesas) * 100) if (total_receitas + total_despesas) > 0 else 0
        
        por_centro_custo.append(CentroCustoMetrics(
            centro_custo_id=cc_id,
            centro_custo_nome=data["nome"],
            total_receitas=data["receitas"],
            total_despesas=data["despesas"],
            lucro=lucro_cc,
            num_transacoes=data["num_transacoes"],
            percentual_total=round(percentual, 2)
        ))
    
    por_centro_custo.sort(key=lambda x: abs(x.total_receitas + x.total_despesas), reverse=True)
    
    # Análise por Categoria
    cat_map = {}
    for t in transacoes:
        cat_id = t.get("categoria_id")
        if cat_id:
            if cat_id not in cat_map:
                cat = await db.categorias.find_one({"id": cat_id}, {"_id": 0})
                cat_map[cat_id] = {
                    "id": cat_id,
                    "nome": cat["nome"] if cat else "Desconhecido",
                    "receitas": 0,
                    "despesas": 0,
                    "num_transacoes": 0
                }
            
            cat_map[cat_id]["num_transacoes"] += 1
            if t["tipo"] == "receita":
                cat_map[cat_id]["receitas"] += t["valor_total"]
            else:
                cat_map[cat_id]["despesas"] += t["valor_total"]
    
    por_categoria = []
    for cat_id, data in cat_map.items():
        perc_despesas = (data["despesas"] / total_despesas * 100) if total_despesas > 0 else 0
        perc_receitas = (data["receitas"] / total_receitas * 100) if total_receitas > 0 else 0
        
        por_categoria.append(CategoriaMetrics(
            categoria_id=cat_id,
            categoria_nome=data["nome"],
            total_receitas=data["receitas"],
            total_despesas=data["despesas"],
            num_transacoes=data["num_transacoes"],
            percentual_despesas=round(perc_despesas, 2),
            percentual_receitas=round(perc_receitas, 2)
        ))
    
    por_categoria.sort(key=lambda x: x.total_despesas + x.total_receitas, reverse=True)
    
    return RelatorioDetalhado(
        periodo_inicio=periodo_inicio or hoje.isoformat(),
        periodo_fim=periodo_fim or hoje.isoformat(),
        resumo_geral=resumo_geral,
        por_centro_custo=por_centro_custo,
        por_categoria=por_categoria,
        transacoes=transacoes[:100]  # Limitar a 100 transações para performance
    )

@api_router.get("/empresas/{empresa_id}/relatorios/export/csv")
async def export_relatorio_csv(
    empresa_id: str,
    periodo_inicio: Optional[str] = None,
    periodo_fim: Optional[str] = None,
    tipo_periodo: str = "mensal",
    current_user: dict = Depends(get_current_user)
):
    """Export relatório para CSV"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Reutilizar lógica do endpoint de relatórios
    hoje = datetime.now(timezone.utc)
    if tipo_periodo == "mensal":
        periodo_inicio = hoje.replace(day=1).isoformat()
        periodo_fim = hoje.isoformat()
    elif tipo_periodo == "anual":
        periodo_inicio = hoje.replace(month=1, day=1).isoformat()
        periodo_fim = hoje.isoformat()
    
    query = {"empresa_id": empresa_id}
    if periodo_inicio and periodo_fim:
        query["data_competencia"] = {
            "$gte": periodo_inicio.split("T")[0],
            "$lte": periodo_fim.split("T")[0]
        }
    
    transacoes = await db.transacoes.find(query, {"_id": 0}).to_list(10000)
    
    # Criar CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Cabeçalho
    writer.writerow(['ID', 'Data', 'Tipo', 'Fornecedor', 'Categoria', 'Centro de Custo', 'Valor', 'Status', 'Origem'])
    
    # Dados
    for t in transacoes:
        writer.writerow([
            t.get('id', ''),
            t.get('data_competencia', ''),
            t.get('tipo', ''),
            t.get('fornecedor', ''),
            t.get('categoria_id', ''),
            t.get('centro_custo_id', ''),
            t.get('valor_total', 0),
            t.get('status', ''),
            t.get('origem', '')
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{tipo_periodo}.csv"}
    )

@api_router.get("/empresas/{empresa_id}/relatorios/export/excel")
async def export_relatorio_excel(
    empresa_id: str,
    periodo_inicio: Optional[str] = None,
    periodo_fim: Optional[str] = None,
    tipo_periodo: str = "mensal",
    current_user: dict = Depends(get_current_user)
):
    """Export relatório para Excel"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Reutilizar lógica do endpoint de relatórios
    hoje = datetime.now(timezone.utc)
    if tipo_periodo == "mensal":
        periodo_inicio = hoje.replace(day=1).isoformat()
        periodo_fim = hoje.isoformat()
    elif tipo_periodo == "anual":
        periodo_inicio = hoje.replace(month=1, day=1).isoformat()
        periodo_fim = hoje.isoformat()
    
    query = {"empresa_id": empresa_id}
    if periodo_inicio and periodo_fim:
        query["data_competencia"] = {
            "$gte": periodo_inicio.split("T")[0],
            "$lte": periodo_fim.split("T")[0]
        }
    
    transacoes = await db.transacoes.find(query, {"_id": 0}).to_list(10000)
    
    # Calcular métricas
    total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
    total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
    
    # Criar workbook
    wb = Workbook()
    
    # Sheet 1: Resumo
    ws_resumo = wb.active
    ws_resumo.title = "Resumo"
    
    # Título
    ws_resumo['A1'] = 'RELATÓRIO FINANCEIRO'
    ws_resumo['A1'].font = Font(size=16, bold=True)
    ws_resumo.merge_cells('A1:D1')
    
    ws_resumo['A3'] = 'Total de Receitas:'
    ws_resumo['B3'] = f'R$ {total_receitas:,.2f}'
    ws_resumo['B3'].font = Font(color="008000")
    
    ws_resumo['A4'] = 'Total de Despesas:'
    ws_resumo['B4'] = f'R$ {total_despesas:,.2f}'
    ws_resumo['B4'].font = Font(color="FF0000")
    
    ws_resumo['A5'] = 'Lucro/Prejuízo:'
    ws_resumo['B5'] = f'R$ {(total_receitas - total_despesas):,.2f}'
    ws_resumo['B5'].font = Font(color="008000" if (total_receitas - total_despesas) >= 0 else "FF0000", bold=True)
    
    # Sheet 2: Transações
    ws_trans = wb.create_sheet("Transações")
    
    # Cabeçalho
    headers = ['ID', 'Data', 'Tipo', 'Fornecedor', 'Categoria', 'Centro Custo', 'Valor', 'Status', 'Origem']
    ws_trans.append(headers)
    
    # Estilo do cabeçalho
    for cell in ws_trans[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")
    
    # Dados
    for t in transacoes:
        ws_trans.append([
            t.get('id', '')[:8] + '...',
            t.get('data_competencia', ''),
            t.get('tipo', ''),
            t.get('fornecedor', ''),
            t.get('categoria_id', '')[:8] + '...' if t.get('categoria_id') else '',
            t.get('centro_custo_id', '')[:8] + '...' if t.get('centro_custo_id') else '',
            t.get('valor_total', 0),
            t.get('status', ''),
            t.get('origem', '')
        ])
    
    # Salvar em memória
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{tipo_periodo}.xlsx"}
    )

@api_router.get("/empresas/{empresa_id}/relatorios/export/pdf")
async def export_relatorio_pdf(
    empresa_id: str,
    periodo_inicio: Optional[str] = None,
    periodo_fim: Optional[str] = None,
    tipo_periodo: str = "mensal",
    current_user: dict = Depends(get_current_user)
):
    """Export relatório para PDF"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Reutilizar lógica do endpoint de relatórios
    hoje = datetime.now(timezone.utc)
    if tipo_periodo == "mensal":
        periodo_inicio = hoje.replace(day=1).isoformat()
        periodo_fim = hoje.isoformat()
    elif tipo_periodo == "anual":
        periodo_inicio = hoje.replace(month=1, day=1).isoformat()
        periodo_fim = hoje.isoformat()
    
    query = {"empresa_id": empresa_id}
    if periodo_inicio and periodo_fim:
        query["data_competencia"] = {
            "$gte": periodo_inicio.split("T")[0],
            "$lte": periodo_fim.split("T")[0]
        }
    
    transacoes = await db.transacoes.find(query, {"_id": 0}).to_list(10000)
    
    # Calcular métricas
    total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
    total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
    lucro = total_receitas - total_despesas
    
    # Criar PDF
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4))
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Título
    elements.append(Paragraph("RELATÓRIO FINANCEIRO - ECHO SHOP", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Resumo
    resumo_data = [
        ['RESUMO FINANCEIRO', ''],
        ['Total de Receitas', f'R$ {total_receitas:,.2f}'],
        ['Total de Despesas', f'R$ {total_despesas:,.2f}'],
        ['Lucro/Prejuízo', f'R$ {lucro:,.2f}'],
        ['Número de Transações', str(len(transacoes))]
    ]
    
    resumo_table = Table(resumo_data, colWidths=[3*inch, 2*inch])
    resumo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(resumo_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Transações (primeiras 50)
    if transacoes:
        elements.append(Paragraph("TRANSAÇÕES (Primeiras 50)", styles['Heading2']))
        elements.append(Spacer(1, 0.2*inch))
        
        trans_data = [['Data', 'Tipo', 'Fornecedor', 'Valor', 'Status']]
        for t in transacoes[:50]:
            trans_data.append([
                t.get('data_competencia', '')[:10],
                t.get('tipo', ''),
                t.get('fornecedor', '')[:20],
                f'R$ {t.get("valor_total", 0):,.2f}',
                t.get('status', '')
            ])
        
        trans_table = Table(trans_data, colWidths=[1.2*inch, 1*inch, 2.5*inch, 1.3*inch, 1*inch])
        trans_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        
        elements.append(trans_table)
    
    doc.build(elements)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{tipo_periodo}.pdf"}
    )

# IMPORT ROUTES
@api_router.post("/empresas/{empresa_id}/transacoes/import/csv")
async def import_csv(
    empresa_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar transações de arquivo CSV"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser CSV")
    
    try:
        # Ler CSV
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validar colunas esperadas
        required_columns = ['data', 'tipo', 'fornecedor', 'valor']
        if not all(col in df.columns for col in required_columns):
            return {
                "status": "error",
                "message": f"CSV deve conter as colunas: {', '.join(required_columns)}",
                "columns_found": list(df.columns)
            }
        
        # Buscar categorias e centros de custo default
        categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        centros_custo = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        
        default_categoria_id = categorias[0]["id"] if categorias else None
        default_centro_custo_id = centros_custo[0]["id"] if centros_custo else None
        
        # Processar cada linha
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                transacao = {
                    "id": str(uuid.uuid4()),
                    "empresa_id": empresa_id,
                    "usuario_id": current_user["id"],
                    "tipo": str(row['tipo']).lower(),
                    "fornecedor": str(row['fornecedor']),
                    "valor_total": float(row['valor']),
                    "data_competencia": str(row['data']),
                    "categoria_id": str(row.get('categoria_id', default_categoria_id)) if 'categoria_id' in row else default_categoria_id,
                    "centro_custo_id": str(row.get('centro_custo_id', default_centro_custo_id)) if 'centro_custo_id' in row else default_centro_custo_id,
                    "descricao": str(row.get('descricao', '')),
                    "status": "concluido",
                    "origem": "import_csv",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.transacoes.insert_one(transacao)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Linha {index + 2}: {str(e)}")
        
        return {
            "status": "success",
            "imported": imported_count,
            "total": len(df),
            "errors": errors[:10]  # Limitar a 10 erros
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar CSV: {str(e)}")

@api_router.post("/empresas/{empresa_id}/transacoes/import/excel")
async def import_excel(
    empresa_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar transações de arquivo Excel"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Arquivo deve ser Excel (.xlsx ou .xls)")
    
    try:
        # Ler Excel
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validar colunas esperadas
        required_columns = ['data', 'tipo', 'fornecedor', 'valor']
        if not all(col in df.columns for col in required_columns):
            return {
                "status": "error",
                "message": f"Excel deve conter as colunas: {', '.join(required_columns)}",
                "columns_found": list(df.columns)
            }
        
        # Buscar categorias e centros de custo default
        categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        centros_custo = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        
        default_categoria_id = categorias[0]["id"] if categorias else None
        default_centro_custo_id = centros_custo[0]["id"] if centros_custo else None
        
        # Processar cada linha
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                transacao = {
                    "id": str(uuid.uuid4()),
                    "empresa_id": empresa_id,
                    "usuario_id": current_user["id"],
                    "tipo": str(row['tipo']).lower(),
                    "fornecedor": str(row['fornecedor']),
                    "valor_total": float(row['valor']),
                    "data_competencia": str(row['data'])[:10],
                    "categoria_id": str(row.get('categoria_id', default_categoria_id)) if 'categoria_id' in row else default_categoria_id,
                    "centro_custo_id": str(row.get('centro_custo_id', default_centro_custo_id)) if 'centro_custo_id' in row else default_centro_custo_id,
                    "descricao": str(row.get('descricao', '')),
                    "status": "concluido",
                    "origem": "import_excel",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.transacoes.insert_one(transacao)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Linha {index + 2}: {str(e)}")
        
        return {
            "status": "success",
            "imported": imported_count,
            "total": len(df),
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar Excel: {str(e)}")

@api_router.post("/empresas/{empresa_id}/transacoes/import/ofx")
async def import_ofx(
    empresa_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar transações de arquivo OFX (extrato bancário)"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not file.filename.endswith('.ofx'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser OFX")
    
    try:
        # Ler OFX
        contents = await file.read()
        ofx = OfxParser.parse(io.BytesIO(contents))
        
        # Buscar categorias e centros de custo default
        categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        centros_custo = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        
        default_categoria_id = categorias[0]["id"] if categorias else None
        default_centro_custo_id = centros_custo[0]["id"] if centros_custo else None
        
        # Processar transações
        imported_count = 0
        errors = []
        
        account = ofx.account
        for transaction in account.statement.transactions:
            try:
                # Determinar tipo baseado no valor
                tipo = "receita" if transaction.amount > 0 else "despesa"
                valor_abs = abs(transaction.amount)
                
                transacao = {
                    "id": str(uuid.uuid4()),
                    "empresa_id": empresa_id,
                    "usuario_id": current_user["id"],
                    "tipo": tipo,
                    "fornecedor": transaction.payee or "Não informado",
                    "valor_total": valor_abs,
                    "data_competencia": transaction.date.strftime("%Y-%m-%d"),
                    "categoria_id": default_categoria_id,
                    "centro_custo_id": default_centro_custo_id,
                    "descricao": transaction.memo or "",
                    "status": "concluido",
                    "origem": "import_ofx",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.transacoes.insert_one(transacao)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Transação {transaction.id}: {str(e)}")
        
        return {
            "status": "success",
            "imported": imported_count,
            "account": account.number if hasattr(account, 'number') else "N/A",
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar OFX: {str(e)}")

@api_router.post("/empresas/{empresa_id}/transacoes/import/pdf")
async def import_pdf(
    empresa_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar transações de arquivo PDF (usando OCR via IA)"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser PDF")
    
    try:
        # Ler PDF
        contents = await file.read()
        pdf_reader = PdfReader(io.BytesIO(contents))
        
        # Extrair texto de todas as páginas
        texto_completo = ""
        for page in pdf_reader.pages:
            texto_completo += page.extract_text() + "\n"
        
        if not texto_completo.strip():
            raise HTTPException(status_code=400, detail="Não foi possível extrair texto do PDF")
        
        # Usar IA para extrair dados financeiros
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            raise HTTPException(status_code=500, detail="Chave de IA não configurada")
        
        llm = LlmChat(
            platform="openai",
            model="gpt-4o-mini",
            api_key=emergent_key
        )
        
        prompt = f"""Analise este extrato/fatura e extraia todas as transações financeiras.
        
Texto do PDF:
{texto_completo[:3000]}

Retorne um JSON com lista de transações no formato:
{{
  "transacoes": [
    {{
      "data": "YYYY-MM-DD",
      "tipo": "receita" ou "despesa",
      "fornecedor": "nome do fornecedor/cliente",
      "valor": número (apenas valor numérico),
      "descricao": "descrição breve"
    }}
  ]
}}

Retorne APENAS o JSON, sem texto adicional."""

        response = llm.run([UserMessage(content=prompt)])
        
        # Parse resposta
        import json
        try:
            # Tentar extrair JSON da resposta
            resposta_texto = response.content[0]["text"]
            # Remover markdown se presente
            if "```json" in resposta_texto:
                resposta_texto = resposta_texto.split("```json")[1].split("```")[0]
            elif "```" in resposta_texto:
                resposta_texto = resposta_texto.split("```")[1].split("```")[0]
            
            dados = json.loads(resposta_texto.strip())
            transacoes_extraidas = dados.get("transacoes", [])
        except:
            raise HTTPException(status_code=500, detail="Não foi possível processar resposta da IA")
        
        # Buscar categorias e centros de custo default
        categorias = await db.categorias.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        centros_custo = await db.centros_custo.find({"empresa_id": empresa_id}, {"_id": 0}).to_list(100)
        
        default_categoria_id = categorias[0]["id"] if categorias else None
        default_centro_custo_id = centros_custo[0]["id"] if centros_custo else None
        
        # Inserir transações
        imported_count = 0
        errors = []
        
        for trans in transacoes_extraidas:
            try:
                transacao = {
                    "id": str(uuid.uuid4()),
                    "empresa_id": empresa_id,
                    "usuario_id": current_user["id"],
                    "tipo": trans.get("tipo", "despesa"),
                    "fornecedor": trans.get("fornecedor", "Não informado"),
                    "valor_total": float(trans.get("valor", 0)),
                    "data_competencia": trans.get("data", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                    "categoria_id": default_categoria_id,
                    "centro_custo_id": default_centro_custo_id,
                    "descricao": trans.get("descricao", ""),
                    "status": "pendente",  # Pendente para revisão
                    "origem": "import_pdf",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.transacoes.insert_one(transacao)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Erro: {str(e)}")
        
        return {
            "status": "success",
            "imported": imported_count,
            "total": len(transacoes_extraidas),
            "errors": errors[:10],
            "message": "Transações importadas como 'pendente' para revisão"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar PDF: {str(e)}")

# AI ANALYSIS ROUTES
@api_router.get("/empresas/{empresa_id}/ai/analise-financeira")
async def analise_financeira_ai(
    empresa_id: str,
    periodo_dias: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Análise financeira completa com IA: padrões, sugestões e insights"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        # Buscar dados dos últimos N dias
        data_inicio = (datetime.now(timezone.utc) - timedelta(days=periodo_dias)).strftime("%Y-%m-%d")
        
        transacoes = await db.transacoes.find({
            "empresa_id": empresa_id,
            "data_competencia": {"$gte": data_inicio}
        }, {"_id": 0}).to_list(1000)
        
        if not transacoes:
            return {
                "status": "no_data",
                "message": "Não há transações suficientes para análise"
            }
        
        # Calcular métricas básicas
        total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
        total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
        
        # Agrupar por categoria
        despesas_por_categoria = {}
        for t in transacoes:
            if t["tipo"] == "despesa":
                cat_id = t.get("categoria_id", "sem_categoria")
                if cat_id not in despesas_por_categoria:
                    cat = await db.categorias.find_one({"id": cat_id}, {"_id": 0})
                    despesas_por_categoria[cat_id] = {
                        "nome": cat["nome"] if cat else "Sem categoria",
                        "valor": 0,
                        "transacoes": 0
                    }
                despesas_por_categoria[cat_id]["valor"] += t["valor_total"]
                despesas_por_categoria[cat_id]["transacoes"] += 1
        
        # Preparar dados para IA
        resumo_financeiro = f"""
Análise Financeira - Últimos {periodo_dias} dias:

RESUMO GERAL:
- Total de Receitas: R$ {total_receitas:,.2f}
- Total de Despesas: R$ {total_despesas:,.2f}
- Saldo: R$ {(total_receitas - total_despesas):,.2f}
- Total de Transações: {len(transacoes)}

DESPESAS POR CATEGORIA:
"""
        for cat_data in sorted(despesas_por_categoria.values(), key=lambda x: x["valor"], reverse=True):
            percentual = (cat_data["valor"] / total_despesas * 100) if total_despesas > 0 else 0
            resumo_financeiro += f"- {cat_data['nome']}: R$ {cat_data['valor']:,.2f} ({percentual:.1f}%) - {cat_data['transacoes']} transações\n"
        
        # Tentar usar IA, mas fornecer fallback se falhar
        analise_texto = ""
        ia_disponivel = False
        
        try:
            emergent_key = os.environ.get("EMERGENT_LLM_KEY")
            if emergent_key:
                llm = LlmChat(
                    api_key=emergent_key,
                    session_id=f"analise-{empresa_id}",
                    system_message="Você é um consultor financeiro especializado."
                ).with_model("openai", "gpt-4o-mini")
                
                prompt = f"""{resumo_financeiro}

Como consultor financeiro especializado, analise estes dados e forneça:

1. **PADRÕES IDENTIFICADOS**: Principais tendências de gastos
2. **OPORTUNIDADES DE OTIMIZAÇÃO**: 3-5 sugestões práticas para reduzir custos
3. **ALERTAS**: Categorias com gastos acima do esperado
4. **RECOMENDAÇÕES**: Ações prioritárias para melhorar a saúde financeira

Seja objetivo, prático e focado em ações concretas. Use formato claro com bullets."""

                user_message = UserMessage(text=prompt)
                response = await llm.send_message(user_message)
                analise_texto = response
                ia_disponivel = True
        except Exception as ia_error:
            # Fallback: Análise estatística básica
            analise_texto = f"""**ANÁLISE ESTATÍSTICA AUTOMÁTICA**

**RESUMO FINANCEIRO:**
- Receitas: R$ {total_receitas:,.2f}
- Despesas: R$ {total_despesas:,.2f}
- Saldo: R$ {(total_receitas - total_despesas):,.2f}
- Status: {"✅ Positivo" if total_receitas > total_despesas else "⚠️ Negativo"}

**PRINCIPAIS CATEGORIAS DE DESPESAS:**
"""
            top_categorias = sorted(despesas_por_categoria.values(), key=lambda x: x["valor"], reverse=True)[:5]
            for i, cat in enumerate(top_categorias, 1):
                percentual = (cat["valor"] / total_despesas * 100) if total_despesas > 0 else 0
                analise_texto += f"\n{i}. {cat['nome']}: R$ {cat['valor']:,.2f} ({percentual:.1f}%)"
            
            analise_texto += "\n\n**ALERTAS:**"
            if total_despesas > total_receitas:
                deficit = total_despesas - total_receitas
                analise_texto += f"\n- ⚠️ Déficit de R$ {deficit:,.2f} no período"
            
            if despesas_por_categoria:
                maior_cat = max(despesas_por_categoria.values(), key=lambda x: x["valor"])
                percentual_maior = (maior_cat["valor"] / total_despesas * 100) if total_despesas > 0 else 0
                if percentual_maior > 40:
                    analise_texto += f"\n- ⚠️ Categoria '{maior_cat['nome']}' representa {percentual_maior:.1f}% das despesas"
            
            analise_texto += "\n\n**RECOMENDAÇÕES:**"
            analise_texto += "\n- Revisar as 3 maiores categorias de despesas"
            analise_texto += "\n- Buscar alternativas para reduzir custos recorrentes"
            if total_receitas > 0:
                analise_texto += f"\n- Manter controle para não exceder receitas (margem: {((total_receitas - total_despesas) / total_receitas * 100):.1f}%)"
            
            analise_texto += "\n\n_Nota: Análise com IA temporariamente indisponível. Usando análise estatística._"
        
        return {
            "status": "success",
            "periodo_dias": periodo_dias,
            "metricas": {
                "total_receitas": total_receitas,
                "total_despesas": total_despesas,
                "saldo": total_receitas - total_despesas,
                "num_transacoes": len(transacoes)
            },
            "analise_ia": analise_texto,
            "despesas_por_categoria": despesas_por_categoria
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

@api_router.get("/empresas/{empresa_id}/ai/anomalias")
async def detectar_anomalias(
    empresa_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Detectar anomalias e gastos incomuns usando IA"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        # Buscar últimos 60 dias de transações
        data_inicio = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%d")
        
        transacoes = await db.transacoes.find({
            "empresa_id": empresa_id,
            "tipo": "despesa",
            "data_competencia": {"$gte": data_inicio}
        }, {"_id": 0}).to_list(1000)
        
        if len(transacoes) < 10:
            return {
                "status": "insufficient_data",
                "message": "Necessário pelo menos 10 transações para análise de anomalias",
                "anomalias": []
            }
        
        # Calcular estatísticas por categoria
        stats_por_categoria = {}
        for t in transacoes:
            cat_id = t.get("categoria_id", "sem_categoria")
            if cat_id not in stats_por_categoria:
                stats_por_categoria[cat_id] = []
            stats_por_categoria[cat_id].append(t["valor_total"])
        
        # Detectar valores outliers (acima de 2 desvios padrão)
        import statistics
        anomalias = []
        
        for cat_id, valores in stats_por_categoria.items():
            if len(valores) < 3:
                continue
            
            media = statistics.mean(valores)
            desvio = statistics.stdev(valores) if len(valores) > 1 else 0
            
            for t in transacoes:
                if t.get("categoria_id") == cat_id:
                    if t["valor_total"] > media + (2 * desvio) and desvio > 0:
                        cat = await db.categorias.find_one({"id": cat_id}, {"_id": 0})
                        anomalias.append({
                            "transacao_id": t["id"],
                            "data": t["data_competencia"],
                            "fornecedor": t["fornecedor"],
                            "valor": t["valor_total"],
                            "categoria": cat["nome"] if cat else "Sem categoria",
                            "media_categoria": round(media, 2),
                            "desvio": round((t["valor_total"] - media) / desvio, 2) if desvio > 0 else 0,
                            "tipo_alerta": "valor_acima_media"
                        })
        
        # Ordenar por desvio (mais críticos primeiro)
        anomalias.sort(key=lambda x: x["desvio"], reverse=True)
        
        return {
            "status": "success",
            "num_anomalias": len(anomalias),
            "anomalias": anomalias[:10],  # Top 10
            "message": f"Encontradas {len(anomalias)} transações com valores acima do padrão"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na detecção: {str(e)}")

@api_router.get("/empresas/{empresa_id}/ai/previsao-fluxo")
async def previsao_fluxo_caixa(
    empresa_id: str,
    dias_futuros: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Prever fluxo de caixa futuro usando IA"""
    if empresa_id not in current_user.get("empresa_ids", []):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        # Buscar histórico dos últimos 90 dias
        data_inicio = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
        
        transacoes = await db.transacoes.find({
            "empresa_id": empresa_id,
            "data_competencia": {"$gte": data_inicio}
        }, {"_id": 0}).to_list(1000)
        
        if len(transacoes) < 15:
            return {
                "status": "insufficient_data",
                "message": "Necessário pelo menos 15 transações para previsão"
            }
        
        # Calcular médias mensais
        total_receitas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "receita")
        total_despesas = sum(t["valor_total"] for t in transacoes if t["tipo"] == "despesa")
        
        media_receitas_mensal = (total_receitas / 90) * 30
        media_despesas_mensal = (total_despesas / 90) * 30
        
        # Preparar dados para IA
        resumo = f"""
HISTÓRICO FINANCEIRO (últimos 90 dias):
- Total Receitas: R$ {total_receitas:,.2f}
- Total Despesas: R$ {total_despesas:,.2f}
- Média Mensal Receitas: R$ {media_receitas_mensal:,.2f}
- Média Mensal Despesas: R$ {media_despesas_mensal:,.2f}
- Total de Transações: {len(transacoes)}
"""
        
        # Tentar usar IA com fallback
        previsao_texto = ""
        
        try:
            emergent_key = os.environ.get("EMERGENT_LLM_KEY")
            if emergent_key:
                llm = LlmChat(
                    api_key=emergent_key,
                    session_id=f"analise-{empresa_id}",
                    system_message="Você é um consultor financeiro especializado."
                ).with_model("openai", "gpt-4o-mini")
                
                prompt = f"""{resumo}

Como analista financeiro, baseado neste histórico, forneça uma previsão para os próximos {dias_futuros} dias:

1. **CENÁRIO PROVÁVEL**: Estimativa de receitas e despesas
2. **FATORES DE RISCO**: O que pode impactar negativamente
3. **OPORTUNIDADES**: O que pode melhorar os resultados
4. **RECOMENDAÇÕES**: Ações para os próximos {dias_futuros} dias

Seja realista e baseie-se nos dados históricos."""

                response = llm.run([UserMessage(content=prompt)])
                previsao_texto = response.content[0]["text"]
        except Exception:
            # Fallback: Análise baseada em médias
            # Calcular previsão simples (proporcional)
            fator_dias = dias_futuros / 30
            previsao_receitas = media_receitas_mensal * fator_dias
            previsao_despesas = media_despesas_mensal * fator_dias
            
            previsao_texto = f"""**PREVISÃO ESTATÍSTICA - Próximos {dias_futuros} dias**

**CENÁRIO PROVÁVEL (baseado em médias):**
- Receitas Estimadas: R$ {previsao_receitas:,.2f}
- Despesas Estimadas: R$ {previsao_despesas:,.2f}
- Saldo Projetado: R$ {(previsao_receitas - previsao_despesas):,.2f}

**TENDÊNCIA:**
"""
            if previsao_receitas > previsao_despesas:
                margem = ((previsao_receitas - previsao_despesas) / previsao_receitas * 100)
                previsao_texto += f"- ✅ Projeção positiva com margem de {margem:.1f}%"
            else:
                deficit = previsao_despesas - previsao_receitas
                previsao_texto += f"- ⚠️ Projeção de déficit de R$ {deficit:,.2f}"
            
            previsao_texto += f"""

**FATORES A CONSIDERAR:**
- Baseado em média de {len(transacoes)} transações dos últimos 90 dias
- Sazonalidade e eventos específicos não considerados
- Recomenda-se revisão quinzenal da previsão

**RECOMENDAÇÕES:**
- Manter reserva de emergência equivalente a 1 mês de despesas
- Monitorar receitas semanalmente
- Revisar despesas fixas mensalmente

_Nota: Análise com IA temporariamente indisponível. Usando projeção estatística simples._"""
        
        # Calcular previsão simples (proporcional) para retorno
        fator_dias = dias_futuros / 30
        previsao_receitas = media_receitas_mensal * fator_dias
        previsao_despesas = media_despesas_mensal * fator_dias
        
        return {
            "status": "success",
            "periodo_analise_dias": 90,
            "dias_futuros": dias_futuros,
            "previsao_numerica": {
                "receitas_estimadas": round(previsao_receitas, 2),
                "despesas_estimadas": round(previsao_despesas, 2),
                "saldo_estimado": round(previsao_receitas - previsao_despesas, 2)
            },
            "previsao_ia": previsao_texto,
            "historico": {
                "media_receitas_mensal": round(media_receitas_mensal, 2),
                "media_despesas_mensal": round(media_despesas_mensal, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na previsão: {str(e)}")

# WHATSAPP MESSAGE PROCESSING (internal service)
class WhatsAppMessageRequest(BaseModel):
    phone_number: str
    sender_name: str
    message: str

class WhatsAppAudioRequest(BaseModel):
    audio_base64: str

@api_router.post("/whatsapp/transcribe")
async def transcribe_audio(request: WhatsAppAudioRequest):
    """Transcribe audio - placeholder for now"""
    try:
        # For MVP, return a message asking to send text
        # In production, integrate with Whisper API or Speech-to-Text service
        return {
            "transcription": "Por favor, envie mensagem de texto com: fornecedor, valor e descrição. Exemplo: Paguei R$ 100 para a empresa ABC hoje"
        }
    except Exception as e:
        logging.error(f"Error transcribing audio: {e}")
        return {"transcription": None}

@api_router.post("/whatsapp/process")
async def process_whatsapp_message(request: WhatsAppMessageRequest):
    """Process WhatsApp messages - Internal service endpoint"""
    try:
        # Normalize phone number for comparison (remove all non-digits)
        normalized_phone = ''.join(filter(str.isdigit, request.phone_number))
        
        # Try to find user by normalized phone number
        users_cursor = db.users.find({}, {"_id": 0})
        user = None
        async for u in users_cursor:
            u_phone = ''.join(filter(str.isdigit, u.get("telefone", "")))
            if u_phone == normalized_phone:
                user = u
                break
        
        # Determine which empresa to use
        empresa = None
        if user and user.get("empresa_ids"):
            # User found - use their first empresa
            empresa_id = user["empresa_ids"][0]
            empresa = await db.empresas.find_one({"id": empresa_id}, {"_id": 0})
        else:
            # No user found - try environment variable for default empresa
            default_empresa_id = os.environ.get("WHATSAPP_DEFAULT_EMPRESA_ID")
            if default_empresa_id:
                empresa = await db.empresas.find_one({"id": default_empresa_id}, {"_id": 0})
            
            # If still no empresa, use most recently created one (more likely to be active)
            if not empresa:
                empresas_list = await db.empresas.find({}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
                if empresas_list:
                    empresa = empresas_list[0]
        
        if not empresa:
            return {
                "dados_extraidos": {},
                "classificacao_sugerida": None,
                "response_message": "❌ Nenhuma empresa cadastrada no sistema. Configure uma empresa primeiro."
            }
        
        # Extract data with AI
        dados = await extrair_dados_com_ai(request.message, empresa["id"])
        
        if not dados or not dados.get("valor_total"):
            return {
                "dados_extraidos": {},
                "classificacao_sugerida": None,
                "response_message": "❌ Não consegui extrair informações financeiras da mensagem. Tente incluir: fornecedor, valor e descrição."
            }
        
        # Classify with AI
        classificacao = None
        if dados.get("descricao") and dados.get("fornecedor") and dados.get("valor_total"):
            classificacao = await classificar_com_ai(
                dados["descricao"],
                dados["fornecedor"],
                dados["valor_total"],
                empresa["id"]
            )
        
        # Build response message
        response_text = "✅ Dados extraídos com sucesso!\\n\\n"
        response_text += f"📊 Tipo: {dados.get('tipo', 'despesa')}\\n"
        response_text += f"🏢 Fornecedor: {dados.get('fornecedor', 'N/A')}\\n"
        response_text += f"💵 Valor: R$ {float(dados.get('valor_total', 0)):.2f}\\n"
        response_text += f"📅 Data: {dados.get('data_competencia', 'N/A')}\\n"
        response_text += f"📝 Descrição: {dados.get('descricao', 'N/A')}\\n"
        
        if classificacao:
            response_text += f"\\n🎯 Classificação sugerida:\\n"
            response_text += f"   Categoria: {classificacao.categoria_nome} ({int(classificacao.confidence * 100)}% confiança)\\n"
            response_text += f"   Centro de Custo: {classificacao.centro_custo_nome}\\n"
        
        # Auto-create transaction
        try:
            categorias = await db.categorias.find({"empresa_id": empresa["id"]}, {"_id": 0}).to_list(10)
            centros = await db.centros_custo.find({"empresa_id": empresa["id"]}, {"_id": 0}).to_list(10)
            
            if not categorias or not centros:
                response_text += "\\n⚠️ Configure categorias e centros de custo primeiro."
            else:
                # Use classified or first available
                categoria_id = classificacao.categoria_id if classificacao else categorias[0]["id"]
                centro_id = classificacao.centro_custo_id if classificacao else centros[0]["id"]
                
                # Get or create empresa-specific WhatsApp user
                whatsapp_email = f"whatsapp-{empresa['id'][:8]}@echoshop.com"
                default_user = await db.users.find_one({"email": whatsapp_email}, {"_id": 0})
                if not default_user:
                    # Create empresa-specific WhatsApp user
                    default_user = {
                        "id": str(uuid.uuid4()),
                        "nome": f"WhatsApp Bot - {empresa.get('razao_social', 'ECHO SHOP')}",
                        "email": whatsapp_email,
                        "telefone": request.phone_number,
                        "perfil": "financeiro",
                        "empresa_ids": [empresa["id"]],
                        "senha_hash": pwd_context.hash("whatsapp-bot-user"),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.users.insert_one(default_user)
                else:
                    # Update phone number if changed and ensure empresa is in list
                    update_needed = False
                    updates = {}
                    if default_user.get("telefone") != request.phone_number:
                        updates["telefone"] = request.phone_number
                        update_needed = True
                    if empresa["id"] not in default_user.get("empresa_ids", []):
                        updates["$addToSet"] = {"empresa_ids": empresa["id"]}
                        update_needed = True
                    
                    if update_needed:
                        await db.users.update_one(
                            {"email": whatsapp_email},
                            {"$set": updates} if "$addToSet" not in updates else {**{"$set": {k: v for k, v in updates.items() if k != "$addToSet"}}, "$addToSet": updates["$addToSet"]}
                        )
                        default_user = await db.users.find_one({"email": whatsapp_email}, {"_id": 0})
                
                # Create transaction
                transacao = {
                    "id": str(uuid.uuid4()),
                    "empresa_id": empresa["id"],
                    "usuario_id": default_user["id"],
                    "tipo": dados.get("tipo", "despesa"),
                    "fornecedor": dados.get("fornecedor", "Desconhecido"),
                    "cnpj_cpf": dados.get("cnpj_cpf"),
                    "descricao": dados.get("descricao", "Lançamento via WhatsApp"),
                    "valor_total": float(dados.get("valor_total", 0)),
                    "data_competencia": dados.get("data_competencia", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                    "data_pagamento": dados.get("data_pagamento"),
                    "categoria_id": categoria_id,
                    "centro_custo_id": centro_id,
                    "metodo_pagamento": dados.get("metodo_pagamento"),
                    "conta_origem": None,
                    "impostos": {},
                    "parcelas": None,
                    "comprovante_url": None,
                    "status": "pendente",
                    "origem": "whatsapp",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.transacoes.insert_one(transacao)
                
                # ==================== CRM: Criar/Atualizar Lead ====================
                try:
                    # Buscar lead existente pelo telefone
                    existing_lead = await db.leads.find_one({
                        "empresa_id": empresa["id"],
                        "$or": [
                            {"telefone": request.phone_number},
                            {"whatsapp_phone": request.phone_number}
                        ]
                    }, {"_id": 0})
                    
                    if existing_lead:
                        # Atualizar lead existente
                        await db.leads.update_one(
                            {"id": existing_lead["id"]},
                            {"$set": {
                                "last_contact_at": datetime.now(timezone.utc).isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        lead_id = existing_lead["id"]
                        response_text += f"\\n👤 Lead atualizado!"
                    else:
                        # Criar novo lead
                        lead_data = {
                            "id": str(uuid.uuid4()),
                            "empresa_id": empresa["id"],
                            "nome": request.contact_name or f"Contato {request.phone_number}",
                            "telefone": request.phone_number,
                            "whatsapp_phone": request.phone_number,
                            "email": None,
                            "origem": "whatsapp",
                            "status_funil": "novo",
                            "tags": ["whatsapp"],
                            "valor_estimado": 0.0,
                            "assigned_to": None,
                            "last_contact_at": datetime.now(timezone.utc).isoformat(),
                            "notes": f"Lead criado automaticamente via WhatsApp. Primeira mensagem: {request.message[:100]}",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                        
                        await db.leads.insert_one(lead_data)
                        lead_id = lead_data["id"]
                        
                        # Aplicar roteamento automático
                        assigned_user = await apply_routing(empresa["id"], lead_id)
                        
                        # Registrar atividade
                        activity = {
                            "id": str(uuid.uuid4()),
                            "lead_id": lead_id,
                            "empresa_id": empresa["id"],
                            "tipo": "whatsapp",
                            "descricao": f"Lead criado via WhatsApp: {request.message[:100]}",
                            "user_id": default_user["id"],
                            "metadata": {"telefone": request.phone_number, "primeira_mensagem": request.message},
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.activities.insert_one(activity)
                        
                        if assigned_user:
                            response_text += f"\\n🎯 Novo lead criado e atribuído automaticamente!"
                        else:
                            response_text += f"\\n🎯 Novo lead criado!"
                        
                        # Tentar resposta automática do agente IA
                        ai_response = await process_ai_response(empresa["id"], lead_id, request.message)
                        if ai_response:
                            response_text += f"\\n\\n🤖 {ai_response}"
                
                except Exception as e:
                    logging.error(f"Error creating/updating lead: {e}")
                    response_text += f"\\n⚠️ Lead não foi criado automaticamente."
                # ==================== END CRM ====================
                
                response_text += f"\\n✅ Transação registrada automaticamente!\\nID: TRX-{transacao['id'][:8]}"
                response_text += f"\\n\\nEnvie mais mensagens para continuar registrando transações! 🚀"
        
        except Exception as e:
            logging.error(f"Error creating transaction: {e}")
            response_text += f"\\n⚠️ Dados extraídos mas não foi possível criar a transação automaticamente."
        
        return {
            "dados_extraidos": dados,
            "classificacao_sugerida": classificacao.model_dump() if classificacao else None,
            "response_message": response_text
        }
        
    except Exception as e:
        logging.error(f"Error processing WhatsApp message: {e}")
        return {
            "dados_extraidos": {},
            "classificacao_sugerida": None,
            "response_message": f"❌ Erro ao processar mensagem: {str(e)}"
        }

# WhatsApp Service Proxy Routes
@api_router.get("/whatsapp/status")
@limiter.limit("30/minute")
async def whatsapp_status(request: Request, current_user: dict = Depends(get_current_user)):
    """Proxy to WhatsApp service status"""
    try:
        import httpx
        whatsapp_url = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8002")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{whatsapp_url}/status", timeout=5.0)
            return response.json()
    except Exception as e:
        logging.error(f"Error getting WhatsApp status: {e}")
        return {"status": "service_offline", "phone_number": None, "has_qr": False}

@api_router.get("/whatsapp/qr")
async def whatsapp_qr(current_user: dict = Depends(get_current_user)):
    """Proxy to WhatsApp service QR code"""
    try:
        import httpx
        whatsapp_url = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8002")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{whatsapp_url}/qr", timeout=5.0)
            return response.json()
    except Exception as e:
        logging.error(f"Error getting WhatsApp QR: {e}")
        raise HTTPException(status_code=404, detail="QR Code não disponível")

@api_router.post("/whatsapp/reconnect")
async def whatsapp_reconnect(current_user: dict = Depends(get_current_user)):
    """Proxy to WhatsApp service reconnect"""
    try:
        import httpx
        whatsapp_url = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8002")
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{whatsapp_url}/reconnect", timeout=10.0)
            return response.json()
    except Exception as e:
        logging.error(f"Error reconnecting WhatsApp: {e}")
        raise HTTPException(status_code=500, detail="Erro ao reconectar")

@api_router.post("/whatsapp/disconnect")
async def whatsapp_disconnect(current_user: dict = Depends(get_current_user)):
    """Proxy to WhatsApp service disconnect"""
    try:
        import httpx
        whatsapp_url = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8002")
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{whatsapp_url}/disconnect", timeout=10.0)
            return response.json()
    except Exception as e:
        logging.error(f"Error disconnecting WhatsApp: {e}")
        raise HTTPException(status_code=500, detail="Erro ao desconectar")

# ==================== GOOGLE DRIVE BACKUP ENDPOINTS ====================

# Helper function to create Google Drive service
def get_drive_service():
    """Create and return Google Drive service"""
    service_account_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_PATH", "/app/backend/service_account.json")
    
    if not os.path.exists(service_account_path):
        raise HTTPException(status_code=500, detail="Google Service Account não configurado")
    
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    credentials = service_account.Credentials.from_service_account_file(
        service_account_path, scopes=SCOPES)
    
    return build('drive', 'v3', credentials=credentials)

async def export_all_data():
    """Export all database data to JSON format"""
    backup_data = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "database": os.environ.get("DB_NAME", "finai_database"),
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
    
    return backup_data

async def upload_to_drive(file_content: bytes, filename: str):
    """Upload file to Google Drive"""
    try:
        service = get_drive_service()
        folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
        
        file_metadata = {
            'name': filename,
            'mimeType': 'application/json'
        }
        
        if folder_id:
            file_metadata['parents'] = [folder_id]
        
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype='application/json',
            resumable=True
        )
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,createdTime'
        ).execute()
        
        logging.info(f"File uploaded to Drive: {file.get('name')} (ID: {file.get('id')})")
        return file
        
    except Exception as e:
        logging.error(f"Error uploading to Drive: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao fazer upload para Google Drive: {str(e)}")

async def cleanup_old_backups(keep_days: int = 30):
    """Delete backups older than keep_days"""
    try:
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
                logging.info(f"Deleted old backup: {file['name']}")
            except Exception as e:
                logging.error(f"Error deleting {file['name']}: {e}")
        
        return deleted_count
        
    except Exception as e:
        logging.error(f"Error cleaning up old backups: {e}")
        return 0

@api_router.post("/backup/create")
@limiter.limit("5/hour")
async def create_backup(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a manual backup and upload to Google Drive"""
    try:
        # Export all data
        backup_data = await export_all_data()
        
        # Generate filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.json"
        
        # Convert to JSON bytes
        json_content = json.dumps(backup_data, indent=2, ensure_ascii=False).encode('utf-8')
        
        # Upload to Drive
        file_info = await upload_to_drive(json_content, filename)
        
        # Cleanup old backups
        deleted_count = await cleanup_old_backups(keep_days=30)
        
        return {
            "success": True,
            "message": "Backup criado com sucesso",
            "file": {
                "id": file_info.get('id'),
                "name": file_info.get('name'),
                "created_at": file_info.get('createdTime')
            },
            "old_backups_deleted": deleted_count
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar backup: {str(e)}")

@api_router.get("/backup/status")
async def get_backup_status(current_user: dict = Depends(get_current_user)):
    """Get backup configuration status"""
    service_account_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_PATH", "/app/backend/service_account.json")
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
    
    status = {
        "configured": os.path.exists(service_account_path),
        "service_account_path": service_account_path,
        "folder_id_configured": folder_id is not None,
        "last_backup": None
    }
    
    if status["configured"]:
        try:
            service = get_drive_service()
            query = "name contains 'backup_'"
            if folder_id:
                query += f" and '{folder_id}' in parents"
            
            results = service.files().list(
                q=query,
                orderBy='createdTime desc',
                pageSize=1,
                fields='files(id, name, createdTime)'
            ).execute()
            
            files = results.get('files', [])
            if files:
                status["last_backup"] = {
                    "name": files[0]['name'],
                    "created_at": files[0]['createdTime']
                }
        except Exception as e:
            logging.error(f"Error checking backup status: {e}")
            status["error"] = str(e)
    
    return status

# Include router
app.include_router(api_router)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
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