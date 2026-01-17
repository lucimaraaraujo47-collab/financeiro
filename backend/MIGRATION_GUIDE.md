# Guia de Migração - Backend ECHO SHOP

## Status da Refatoração

### Concluído ✅
- Estrutura de pastas criada (`models/`, `routers/`, `services/`, `utils/`)
- 8 routers modulares funcionando e testados
- `server_new.py` - novo server simplificado (93 linhas)
- Todos os routers importam e funcionam corretamente

### Routers Criados
| Router | Endpoints | Status |
|--------|-----------|--------|
| auth.py | 5 | ✅ Testado |
| usuarios.py | 6 | ✅ Testado |
| empresas.py | 8 | ✅ Testado |
| financeiro.py | 15 | ✅ Testado |
| estoque.py | 12 | ✅ Testado |
| vendas.py | 14 | ✅ Testado |
| ordens_servico.py | 8 | ✅ Testado |
| app_tecnico.py | 5 | ✅ Testado |
| **TOTAL** | **73** | |

### Endpoints Ainda no server.py Original
O `server.py` original tem ~208 endpoints. Os seguintes módulos ainda não foram migrados:
- CRM (leads, atividades, oportunidades)
- AI (classificar, extrair-texto, agentes)
- Backup (create, download, upload-to-drive)
- Assinaturas SaaS (planos, cobranças)
- OAuth (Google Drive, Calendar)
- Modelos de Contrato
- Upload de arquivos diversos
- Scheduler/Jobs

## Como Usar os Novos Routers

### Testar Individualmente
```python
cd /app/backend
python3 -c "
from routers import auth_router
print(auth_router.routes)
"
```

### Testar server_new.py
```bash
cd /app/backend
python3 -c "import uvicorn; from server_new import app; uvicorn.run(app, port=8003)"
```

## Próximos Passos para Migração Completa

1. **Criar routers restantes:**
   - `routers/crm.py` - Leads e CRM
   - `routers/contratos.py` - Modelos de contrato
   - `routers/assinaturas.py` - Assinaturas SaaS
   - `routers/backup.py` - Backup e restore
   - `routers/oauth.py` - Integrações OAuth

2. **Migrar scheduler/jobs** para `services/scheduler_service.py`

3. **Testar todos os endpoints** comparando server.py vs server_new.py

4. **Substituir server.py** quando todos os endpoints estiverem migrados

## Arquivos de Referência
- `/app/backend/server.py` - Original (8868 linhas)
- `/app/backend/server_new.py` - Novo (93 linhas)
- `/app/backend/server_backup.py` - Backup de segurança
- `/app/backend/routers/` - Routers modulares
