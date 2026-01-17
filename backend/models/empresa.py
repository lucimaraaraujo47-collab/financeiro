# Modelos de Empresa e Licenciamento
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Empresa(BaseModel):
    id: str
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    logo_url: Optional[str] = None
    ativo: bool = True
    created_at: Optional[str] = None

class EmpresaCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    logo_url: Optional[str] = None

class Licenca(BaseModel):
    id: str
    empresa_id: str
    tipo: str  # trial, basic, pro, enterprise
    data_inicio: str
    data_fim: str
    usuarios_limite: int
    valor_mensal: float
    status: str  # ativa, expirada, cancelada
    observacoes: Optional[str] = None
    created_at: Optional[str] = None

class AssinaturaSaaS(BaseModel):
    id: str
    empresa_id: str
    empresa_nome: Optional[str] = None
    plano: str  # basic, pro, enterprise
    valor_mensal: float
    dia_vencimento: int
    status: str  # ativa, inadimplente, cancelada, trial
    trial_ate: Optional[str] = None
    data_inicio: str
    proxima_cobranca: Optional[str] = None
    gateway_customer_id: Optional[str] = None
    gateway_subscription_id: Optional[str] = None
    metodo_pagamento: Optional[str] = None
    historico_pagamentos: List[dict] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AssinaturaSaaSCreate(BaseModel):
    empresa_id: str
    plano: str
    valor_mensal: float
    dia_vencimento: int = 10
    trial_dias: int = 0

class Cobranca(BaseModel):
    id: str
    assinatura_id: str
    empresa_id: str
    valor: float
    data_vencimento: str
    data_pagamento: Optional[str] = None
    status: str  # pendente, paga, atrasada, cancelada
    gateway_payment_id: Optional[str] = None
    gateway_boleto_url: Optional[str] = None
    gateway_pix_qrcode: Optional[str] = None
    created_at: Optional[str] = None
