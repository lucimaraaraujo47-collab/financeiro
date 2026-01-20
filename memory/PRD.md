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
  - ✅ Push Notifications (implementado 16/01/2026)
  - ✅ Barra de status de rede (NetworkStatusBar)
  - 🟡 Modo Offline (estrutura criada, falta testes em dispositivo)

**Build do App:**
```bash
cd app-tecnico
npm install
npx eas build --platform android --profile preview  # APK para testes
```

### ✅ Fase 3 - Histórico Vitalício de Equipamentos (COMPLETA)
**Status:** 100% Implementado e Testado (20/01/2026)

**Funcionalidades:**
- **Página de Histórico** (`/historico-equipamentos`)
  - Timeline completa de cada equipamento
  - Visualização de eventos, OS e manutenções
  - Busca por número de série, tipo ou marca
  - Cards com estatísticas (total eventos, OS, manutenções)

- **Eventos e Manutenções:**
  - Registro de eventos genéricos (observação, inspeção, ajuste, troca de peças, limpeza, garantia)
  - Fluxo completo de manutenção (entrada → em andamento → concluída)
  - Rastreamento de custos e peças substituídas

- **Integração com Equipamentos Técnicos:**
  - Botão de histórico (📜) na tabela de equipamentos
  - Navegação direta para histórico do equipamento selecionado
  - Link no menu Estoque > Histórico Equip.

**Endpoints da API:**
- `GET /api/equipamentos/{id}/historico-completo` - Timeline completa
- `POST /api/equipamentos/{id}/manutencao` - Registrar manutenção
- `POST /api/equipamentos/{id}/evento` - Registrar evento
- `PATCH /api/manutencoes/{id}/concluir` - Concluir manutenção
- `GET /api/empresas/{id}/manutencoes` - Listar manutenções

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
1. **Testar APK v1.4.0** - Validar modo offline e push notifications no celular
2. **Migrar routers restantes** - CRM, contratos, assinaturas, backup
3. **Substituir server.py** - Quando migração estiver 100%
4. Implementar histórico vitalício de equipamentos

## Data da Última Atualização
17/01/2026 - Refatoração backend VALIDADA (73 endpoints testados)

## Estrutura do Backend (Refatoração COMPLETA)
```
/app/backend/
├── server.py          # Original (8868 linhas - backup)
├── server_new.py      # NOVO - Apenas 93 linhas! ✅
├── server_backup.py   # Backup de segurança
├── database.py        # Conexão MongoDB
├── config.py          # Configurações centralizadas
├── security_utils.py  # Utilitários de segurança
├── models/
│   ├── user.py        # ✅ Modelos de usuário (80 linhas)
│   └── empresa.py     # ✅ Modelos de empresa (76 linhas)
├── routers/
│   ├── __init__.py    # ✅ Exports (37 linhas)
│   ├── auth.py        # ✅ Autenticação (194 linhas)
│   ├── usuarios.py    # ✅ Usuários CRUD (154 linhas)
│   ├── empresas.py    # ✅ Empresas CRUD (180 linhas)
│   ├── financeiro.py  # ✅ Transações, contas (331 linhas)
│   ├── estoque.py     # ✅ Equipamentos (318 linhas)
│   ├── vendas.py      # ✅ Clientes, vendas, OS (355 linhas)
│   ├── ordens_servico.py  # ✅ OS detalhado (304 linhas)
│   └── app_tecnico.py # ✅ App móvel/APK (217 linhas)
├── services/          # (Para lógica complexa)
└── utils/             # (Para utilitários)

📊 RESULTADO:
- server.py original: 8868 linhas
- server_new.py:       93 linhas (99% redução!)
- Total routers:     2090 linhas (organizados em módulos)
- Total endpoints:     70 endpoints funcionando
```

## Data da Última Atualização
20/01/2026 - Histórico Vitalício de Equipamentos COMPLETO

## Changelog
- **20/01/2026 (sessão atual):**
  - ✅ **Histórico Vitalício de Equipamentos COMPLETO!**
    - Nova página `/historico-equipamentos`
    - Timeline completa com eventos, OS e manutenções
    - 20/20 testes passaram (100%)
    - Bug corrigido: ordenação de datas na timeline
  - ✅ **Novos endpoints:**
    - GET /api/equipamentos/{id}/historico-completo
    - POST /api/equipamentos/{id}/manutencao
    - POST /api/equipamentos/{id}/evento
    - PATCH /api/manutencoes/{id}/concluir
  - ✅ **UI atualizada:**
    - Menu Estoque > Histórico Equip. adicionado
    - Botão de histórico na tabela de Equip. Técnicos
- **17/01/2026:**
  - ✅ **Refatoração do Backend VALIDADA!**
    - server_new.py testado com sucesso na porta 8003
    - Todos os endpoints principais funcionando
    - 73 endpoints migrados para routers modulares
    - Guia de migração criado: `MIGRATION_GUIDE.md`
  - ✅ **Routers completos:**
    - auth.py (5 endpoints)
    - usuarios.py (6 endpoints)
    - empresas.py (8 endpoints)
    - financeiro.py (15 endpoints)
    - estoque.py (12 endpoints)
    - vendas.py (14 endpoints)
    - ordens_servico.py (8 endpoints)
    - app_tecnico.py (5 endpoints)
  - ✅ **Modo Offline Completo implementado!**
  - ✅ **APK v1.4.0 gerado e disponível**
- **16/01/2026:**
  - ✅ **APK v1.3.0 gerado**
    - Logotipo ECHO SHOP integrado
    - Push Notifications habilitados
    - NetworkStatusBar para indicar status de rede
  - ✅ **Push Notifications implementado!**
    - Função `_enviar_push_nova_os()` no backend
    - Disparo automático quando técnico é atribuído
  - ✅ **Perfil "tecnico" adicionado** ao sistema
  - ✅ **Funcionalidade de Reagendar/Trocar Técnico** nas OS
  - ✅ **Tela de Usuários** corrigida para admin_master
- **16/01/2026:** 
  - **APK GERADO E DISPONÍVEL PARA DOWNLOAD!** 🎉
  - Build via EAS Build (Expo Application Services)
  - APK v1.0.0 - 79.63 MB
  - Disponível em: Configurações → App Técnico → Baixar APK
- **15/01/2026:** 
  - Adicionada página de download do App do Técnico em `/app-tecnico`
  - Link no menu Configurações → App Técnico
  - Cards para Android (APK), Expo Go (Teste) e iOS (TestFlight)
  - Instruções de instalação e funcionalidades do app
  - App React Native configurado para build de produção
