# Schemas for Service Orders (Ordens de Serviço) and related models
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# ==================== PLANOS DE SERVIÇO ====================

class PlanoServicoBase(BaseModel):
    nome: str
    tipo_servico: str  # instalacao, manutencao, locacao, venda
    valor: float
    periodicidade: str  # mensal, trimestral, anual, avulso
    possui_contrato: bool = False
    fidelidade_meses: int = 0
    multa_cancelamento: float = 0.0
    modelo_contrato_id: Optional[str] = None
    descricao: Optional[str] = None


class PlanoServicoCreate(PlanoServicoBase):
    pass


class PlanoServico(PlanoServicoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== MODELOS DE CONTRATO ====================

class ModeloContratoBase(BaseModel):
    nome: str
    conteudo: str  # Texto do contrato com placeholders {{cliente_nome}}, {{valor}}, etc.


class ModeloContratoCreate(ModeloContratoBase):
    pass


class ModeloContratoUpdate(BaseModel):
    nome: Optional[str] = None
    conteudo: Optional[str] = None
    ativo: Optional[bool] = None


class ModeloContrato(ModeloContratoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    versao: int = 1
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== CONTRATOS DE CLIENTE ====================

class ContratoClienteBase(BaseModel):
    modelo_contrato_id: str
    cliente_id: str
    venda_id: Optional[str] = None


class ContratoClienteCreate(ContratoClienteBase):
    pass


class ContratoCliente(ContratoClienteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    numero_contrato: str
    conteudo_final: str  # Texto do contrato com dados preenchidos
    status: str = "pendente"  # pendente, assinado, cancelado, expirado
    assinado_em: Optional[datetime] = None
    assinado_por: Optional[str] = None
    assinatura_base64: Optional[str] = None
    ip_assinatura: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== VENDAS DE SERVIÇO ====================

class VendaServicoBase(BaseModel):
    cliente_id: str
    plano_id: str
    endereco_servico: str
    observacoes: Optional[str] = None


class VendaServicoCreate(VendaServicoBase):
    pass


class VendaServico(VendaServicoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    valor: float
    status: str = "pendente"  # pendente, ativo, cancelado, suspenso
    contrato_id: Optional[str] = None
    os_instalacao_id: Optional[str] = None
    data_ativacao: Optional[str] = None
    data_cancelamento: Optional[str] = None
    motivo_cancelamento: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== ORDENS DE SERVIÇO ====================

class ChecklistItem(BaseModel):
    item: str
    obrigatorio: bool = False
    concluido: bool = False


class FotoOS(BaseModel):
    url: str
    descricao: str = ""
    tipo: str = "geral"  # antes, durante, depois, equipamento
    timestamp: str


class OrdemServicoBase(BaseModel):
    tipo: str  # instalacao, manutencao, troca, retirada
    cliente_id: str
    endereco_servico: str
    observacoes: Optional[str] = None


class OrdemServicoCreate(OrdemServicoBase):
    data_agendamento: Optional[str] = None
    horario_previsto: Optional[str] = None
    checklist: Optional[List[ChecklistItem]] = None


class OrdemServico(OrdemServicoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    numero: str  # OS-00001
    venda_id: Optional[str] = None
    contrato_id: Optional[str] = None
    contrato_assinado: bool = False
    status: str = "aberta"  # aberta, agendada, em_andamento, aguardando_assinatura, concluida, cancelada
    tecnico_id: Optional[str] = None
    data_agendamento: Optional[str] = None
    horario_previsto: Optional[str] = None
    data_inicio_execucao: Optional[str] = None
    data_fim_execucao: Optional[str] = None
    checklist: List[ChecklistItem] = []
    fotos: List[FotoOS] = []
    equipamentos_vinculados: List[Dict[str, Any]] = []
    observacoes_tecnico: Optional[str] = None
    cliente_nome: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== EQUIPAMENTOS TÉCNICOS ====================

class HistoricoEquipamento(BaseModel):
    data: str
    acao: str  # entrada, instalacao, manutencao, troca, retirada, baixa
    descricao: str
    os_id: Optional[str] = None
    cliente_id: Optional[str] = None
    usuario_id: str
    localizacao_anterior: Optional[Dict[str, str]] = None
    localizacao_nova: Optional[Dict[str, str]] = None


class EquipamentoTecnicoBase(BaseModel):
    numero_serie: str
    tipo: str  # roteador, onu, stb, modem, outros
    marca: str
    modelo: str


class EquipamentoTecnicoCreate(EquipamentoTecnicoBase):
    deposito_id: Optional[str] = None
    tecnico_id: Optional[str] = None


class EquipamentoTecnico(EquipamentoTecnicoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    status: str = "disponivel"  # disponivel, em_uso, em_manutencao, baixado
    localizacao_atual: Dict[str, Any] = {}  # {tipo: "deposito/tecnico/cliente", id: "xxx", nome: "xxx"}
    cliente_id: Optional[str] = None
    os_vinculada_id: Optional[str] = None
    historico: List[HistoricoEquipamento] = []
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== DEPÓSITOS ====================

class DepositoBase(BaseModel):
    nome: str
    endereco: Optional[str] = None
    responsavel_id: Optional[str] = None


class DepositoCreate(DepositoBase):
    pass


class Deposito(DepositoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== TIPOS DE EQUIPAMENTO ====================

class TipoEquipamentoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None


class TipoEquipamentoCreate(TipoEquipamentoBase):
    pass


class TipoEquipamento(TipoEquipamentoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa_id: str
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
