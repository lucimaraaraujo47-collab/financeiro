# ECHO SHOP - Sistema de Gestão Empresarial

## Visão Geral
Sistema integrado de gestão empresarial para provedores de serviços (internet, telecomunicações) com módulos de vendas automatizadas, contratos digitais, ordens de serviço, gestão de equipamentos e controle financeiro.

## Usuário de Teste
- **Email:** faraujoneto2025@gmail.com
- **Senha:** Rebeca@19

## Arquitetura
- **Frontend:** React 18 + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python) - server.py monolítico (8459 linhas)
- **Database:** MongoDB
- **Mobile App:** React Native (Expo) - /app/app-tecnico/

## Fases do Projeto

### ✅ Fase 1 - Sistema de Vendas com Contratos (COMPLETA)
**Status:** 100% Implementado e Testado

**Funcionalidades:**
- **Planos de Serviço** (`/planos-servico`)
  - CRUD completo de planos
  - Configuração de fidelidade e multas
  - Vínculo com modelos de contrato

- **Modelos de Contrato** (`/modelos-contrato`)
  - Criação de templates com placeholders ({{cliente_nome}}, {{valor}}, etc.)
  - Preview dinâmico
  - Versionamento

- **Vendas de Serviço** (`/vendas-servico`)
  - Fluxo de nova venda
  - Geração automática de contrato
  - Geração automática de OS de instalação

- **Ordens de Serviço** (`/ordens-servico`)
  - Lista de OS com filtros por status/tipo
  - Atribuição de técnico
  - Checklist de execução
  - Assinatura digital do cliente
  - Workflow: Aberta → Agendada → Em Andamento → Concluída

**Endpoints da API:**
- `GET/POST /api/empresas/{id}/planos-servico`
- `GET/POST /api/empresas/{id}/modelos-contrato`
- `GET/POST /api/empresas/{id}/vendas-servico`
- `GET/POST /api/empresas/{id}/ordens-servico`
- `PATCH /api/ordens-servico/{id}/status`
- `PATCH /api/ordens-servico/{id}/checklist`
- `POST /api/contratos/{id}/assinar`

### 🟡 Fase 2 - Equipamentos e App do Técnico (EM PROGRESSO)
**Status:** 60% Implementado

**Backend de Equipamentos (✅ Completo):**
- `GET/POST /api/empresas/{id}/equipamentos-tecnicos`
- `GET /api/empresas/{id}/equipamentos-tecnicos/dashboard`
- `POST /api/ordens-servico/{id}/vincular-equipamento`
- Tipos: roteador, onu, stb, modem, outros
- Status: disponível, em_uso, em_manutenção, baixado
- Rastreamento de localização (depósito/técnico/cliente)

**Frontend de Equipamentos (✅ Completo):**
- Dashboard com estatísticas
- Lista filtrada por status/tipo
- Ações de cadastro e movimentação

**App React Native (🟡 Em Progresso):**
- Localização: `/app/app-tecnico/`
- **Pronto para Build e Distribuição**
- Telas implementadas:
  - ✅ LoginScreen - Autenticação
  - ✅ HomeScreen - Lista de OS do técnico
  - ✅ OSDetailScreen - Detalhes, checklist, ações
  - ✅ SignatureScreen - Captura de assinatura
  - ✅ CameraScreen - Captura de fotos
  - ✅ PhotoGalleryScreen - Galeria de fotos da OS
- Funcionalidades:
  - ✅ Autenticação persistente (AsyncStorage)
  - ✅ Visualização de OS atribuídas
  - ✅ Atualização de checklist
  - ✅ Mudança de status
  - ✅ Captura de assinatura digital
  - ✅ Captura e upload de fotos
  - ✅ Contato direto (telefone, WhatsApp, mapas)
  - ✅ Configuração de produção (URL API)
  - ✅ EAS Build configurado
  - ⏳ Funcionalidade offline (pendente)

**Build do App:**
```bash
cd app-tecnico
npm install
npx eas build --platform android --profile preview  # APK para testes
```

### ⏳ Fase 3 - Histórico Vitalício de Equipamentos (PENDENTE)
- Rastreamento permanente de cada equipamento
- Timeline completa de movimentações
- Relatórios de ciclo de vida

### ⏳ Fase 4 - Gestão de Rotas (PENDENTE)
- Integração OpenRouteService
- Cálculo de custos (combustível, pedágios)
- Otimização de rotas para técnicos

### ⏳ Fase 5 - Automação Financeira (PENDENTE)
- Lançamentos automáticos de vendas
- Controle de mensalidades
- Cálculo de multas por cancelamento

### ⏳ Fase 6 - Portal do Cliente (PENDENTE)
- Área do cliente para visualizar faturas
- Abertura de chamados de suporte
- Histórico de serviços

## Integrações
- **Asaas:** Gateway de pagamentos (sandbox configurado)
- **OpenRouteService:** Planejado para cálculo de rotas
- **Leroy Merlin RPA:** Planejado para integração futura

## Estrutura de Arquivos

```
/app/
├── backend/
│   ├── server.py           # API principal (8459 linhas - REFATORAÇÃO RECOMENDADA)
│   ├── database.py         # Conexão MongoDB (NOVO)
│   ├── schemas/            # Schemas Pydantic (NOVO)
│   │   ├── __init__.py
│   │   └── service_schemas.py
│   ├── routers/            # Routers separados (estrutura preparada)
│   ├── models/             # Modelos (estrutura preparada)
│   └── services/           # Serviços (estrutura preparada)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── PlanosServico.js
│       │   ├── ModelosContrato.js
│       │   ├── VendasServico.js
│       │   ├── OrdensServico.js
│       │   └── EquipamentosServico.js
│       └── App.js
└── app-tecnico/           # App React Native
    ├── App.js
    ├── config.js
    └── screens/
        ├── LoginScreen.js
        ├── HomeScreen.js
        ├── OSDetailScreen.js
        ├── SignatureScreen.js
        ├── CameraScreen.js     (NOVO)
        └── PhotoGalleryScreen.js (NOVO)
```

## Problemas Conhecidos
1. **server.py monolítico:** 8459 linhas, difícil de manter. Refatoração iniciada com criação de schemas separados.
2. **Deployment:** Issue de deployment não resolvido (deprioritizado pelo usuário).
3. **Offline no App:** Funcionalidade offline ainda não implementada.

## Testes Automatizados
- **Arquivo:** `/app/tests/test_echo_shop_api.py`
- **Resultados:** 17/17 testes passaram
- **Cobertura:** Auth, Empresas, Ordens de Serviço, Equipamentos, Contratos, Users, Health

## Bugs Corrigidos (15/01/2026)
- `Equipamentos.js`: Tratamento de valores null/undefined no toFixed()

## Próximos Passos Prioritários
1. Testar app React Native em dispositivo/emulador
2. Implementar funcionalidade offline no app
3. Continuar refatoração do server.py em módulos separados
4. Implementar histórico vitalício de equipamentos

## Data da Última Atualização
15/01/2026 - Fase 2 App Técnico melhorado com telas de câmera e galeria
