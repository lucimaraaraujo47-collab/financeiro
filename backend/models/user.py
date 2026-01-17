# Modelos de Usuário e Autenticação
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from config import PERFIS_PERMISSOES

class UserProfile(BaseModel):
    id: str
    nome: str
    email: str
    telefone: Optional[str] = None
    perfil: str
    empresa_ids: List[str] = []
    ativo: bool = True
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    push_token: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    nome: str
    email: str
    telefone: Optional[str] = None
    perfil: str
    empresa_ids: List[str] = []
    ativo: bool = True
    avatar_url: Optional[str] = None
    permissoes: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserCreate(BaseModel):
    nome: str
    email: str
    senha: str
    telefone: Optional[str] = None
    perfil: str = "admin"
    empresa_ids: List[str] = []
    
    @validator('perfil')
    def validar_perfil(cls, v):
        if v not in PERFIS_PERMISSOES:
            raise ValueError(f'Perfil inválido. Opções: {", ".join(PERFIS_PERMISSOES.keys())}')
        return v

class UserLogin(BaseModel):
    email: str
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class PushTokenCreate(BaseModel):
    push_token: str
    platform: Optional[str] = "android"
    device_name: Optional[str] = None

class LogAcao(BaseModel):
    id: str
    user_id: str
    user_nome: str
    user_email: str
    empresa_id: Optional[str] = None
    acao: str
    entidade: str
    entidade_id: Optional[str] = None
    detalhes: Optional[dict] = None
    ip_address: Optional[str] = None
    timestamp: str

class LogSessao(BaseModel):
    id: str
    user_id: str
    user_email: str
    empresa_id: Optional[str] = None
    ip_address: Optional[str] = None
    inicio: str
    fim: Optional[str] = None
    duracao_minutos: Optional[int] = None
    ativa: bool = True
