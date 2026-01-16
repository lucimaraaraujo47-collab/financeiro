# 🔧 Como Configurar Variáveis de Ambiente na Plataforma Emergent

## 📍 Onde Configurar

Na plataforma Emergent, acesse:
**Settings → Environment Variables** (ou equivalente)

---

## 🔑 VARIÁVEIS OBRIGATÓRIAS DO BACKEND

Copie e cole estas variáveis na seção de **Backend Environment Variables**:

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=finai_database
JWT_SECRET=finai-super-secret-jwt-key-2025-change-in-production-8fb9a4c3d2e1
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
WHATSAPP_SERVICE_KEY=<YOUR_WHATSAPP_SERVICE_KEY>
WHATSAPP_DEFAULT_EMPRESA_ID=fintracker-117
MAX_LOGIN_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=15
WHATSAPP_SERVICE_URL=http://127.0.0.1:8002
EMERGENT_LLM_KEY=<YOUR_EMERGENT_LLM_KEY>
CORS_ORIGINS=https://fintracker-117.emergent.host
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
GOOGLE_DRIVE_REDIRECT_URI=https://fintracker-117.emergent.host/api/oauth/drive/callback
FRONTEND_URL=https://fintracker-117.emergent.host
```

---

## 🎨 VARIÁVEIS OBRIGATÓRIAS DO FRONTEND

Copie e cole estas variáveis na seção de **Frontend Environment Variables**:

```bash
REACT_APP_BACKEND_URL=https://fintracker-117.emergent.host
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### 1. **MONGO_URL para Produção**
```bash
MONGO_URL=mongodb://localhost:27017
```
✅ Esta configuração está correta para a plataforma Emergent.  
A plataforma usa **MongoDB Atlas dedicado** e injeta automaticamente a URL correta em tempo de execução.

❌ **NÃO** mude para uma connection string Atlas manual, a menos que você tenha um cluster próprio.

### 2. **URLs de Produção**
Certifique-se de usar a URL correta do seu deployment:
- `https://fintracker-117.emergent.host` (seu domínio atual)
- Se mudar o nome do app, atualize todas as URLs

### 3. **Segredos (JWT_SECRET)**
O valor fornecido é um exemplo. Para maior segurança:
- Gere um novo segredo aleatório usando: `openssl rand -base64 32`
- Atualize o valor em produção

### 4. **Google OAuth**
As credenciais fornecidas são da configuração atual:
- `GOOGLE_CLIENT_ID`: Já configurado para seu domínio
- `GOOGLE_CLIENT_SECRET`: Chave do projeto Google
- `GOOGLE_DRIVE_REDIRECT_URI`: Deve apontar para seu domínio de produção

Se você mudou o domínio de produção, precisa:
1. Ir ao [Google Cloud Console](https://console.cloud.google.com)
2. Atualizar as **Authorized redirect URIs** no OAuth Client
3. Adicionar: `https://SEU-NOVO-DOMINIO/api/oauth/drive/callback`

### 5. **EMERGENT_LLM_KEY**
Esta é sua chave universal para integração com LLMs:
- OpenAI (GPT-5)
- Google (Gemini)
- Anthropic (Claude)

A chave fornecida (`<YOUR_EMERGENT_LLM_KEY>`) já está ativa.  
Para adicionar saldo: **Profile → Universal Key → Add Balance**

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após configurar as variáveis:

- [ ] Todas as 15 variáveis do backend foram adicionadas
- [ ] Todas as 4 variáveis do frontend foram adicionadas
- [ ] URLs apontam para `fintracker-117.emergent.host`
- [ ] Não há espaços extras antes/depois dos valores
- [ ] Salvou as configurações na plataforma

---

## 🚀 PRÓXIMO PASSO

Depois de configurar as variáveis:
1. Clique em **"Save to GitHub"**
2. Clique em **"Deploy"**
3. Aguarde o build completar (2-5 minutos)
4. Teste: `curl https://fintracker-117.emergent.host/api/health`

---

## 🆘 PROBLEMAS COMUNS

### ❌ "Environment variable not found"
**Causa:** Variável não foi salva corretamente  
**Solução:** Verifique se salvou as mudanças na plataforma

### ❌ "CORS error"
**Causa:** `CORS_ORIGINS` não inclui o domínio correto  
**Solução:** Certifique-se que CORS_ORIGINS tem `https://fintracker-117.emergent.host`

### ❌ "JWT validation failed"
**Causa:** `JWT_SECRET` não foi configurado ou é diferente entre deploys  
**Solução:** Use o mesmo JWT_SECRET em todos os deployments

### ❌ "WhatsApp service connection refused"
**Causa:** `WHATSAPP_SERVICE_URL` incorreto  
**Solução:** Deve ser `http://127.0.0.1:8002` (não localhost, não 0.0.0.0)

---

## 📖 FORMATO DE CADA VARIÁVEL

| Variável | Tipo | Obrigatória? | Descrição |
|----------|------|--------------|-----------|
| `MONGO_URL` | String (URI) | ✅ Sim | Connection string do MongoDB |
| `DB_NAME` | String | ✅ Sim | Nome do banco de dados |
| `JWT_SECRET` | String | ✅ Sim | Chave secreta para JWT tokens |
| `JWT_ALGORITHM` | String | ✅ Sim | Algoritmo JWT (HS256) |
| `JWT_EXPIRATION_MINUTES` | Integer | ✅ Sim | Tempo de expiração do token (1440 = 24h) |
| `WHATSAPP_SERVICE_KEY` | String | ✅ Sim | Chave de autenticação do serviço WhatsApp |
| `WHATSAPP_SERVICE_URL` | String (URL) | ✅ Sim | URL do serviço WhatsApp |
| `WHATSAPP_DEFAULT_EMPRESA_ID` | String (UUID) | ⚠️ Recomendado | ID padrão da empresa |
| `MAX_LOGIN_ATTEMPTS` | Integer | ⚠️ Recomendado | Tentativas máximas de login |
| `LOGIN_BLOCK_MINUTES` | Integer | ⚠️ Recomendado | Minutos de bloqueio após falhas |
| `EMERGENT_LLM_KEY` | String | ⚠️ Opcional | Chave para integração LLM |
| `CORS_ORIGINS` | String (CSV) | ✅ Sim | Origens permitidas (separadas por vírgula) |
| `GOOGLE_CLIENT_ID` | String | ⚠️ Opcional | ID do cliente OAuth Google |
| `GOOGLE_CLIENT_SECRET` | String | ⚠️ Opcional | Secret do OAuth Google |
| `GOOGLE_DRIVE_REDIRECT_URI` | String (URL) | ⚠️ Opcional | URI de callback do OAuth |
| `FRONTEND_URL` | String (URL) | ✅ Sim | URL do frontend |
| `REACT_APP_BACKEND_URL` | String (URL) | ✅ Sim | URL do backend (usado no React) |

---

## 🎯 EXEMPLO COMPLETO

**Backend:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=finai_database
JWT_SECRET=minha-chave-super-secreta-123456
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
WHATSAPP_SERVICE_KEY=minha-chave-whatsapp-segura
WHATSAPP_DEFAULT_EMPRESA_ID=fintracker-117
MAX_LOGIN_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=15
WHATSAPP_SERVICE_URL=http://127.0.0.1:8002
EMERGENT_LLM_KEY=<YOUR_EMERGENT_LLM_KEY>-chave-aqui
CORS_ORIGINS=https://fintracker-117.emergent.host
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
GOOGLE_DRIVE_REDIRECT_URI=https://fintracker-117.emergent.host/api/oauth/drive/callback
FRONTEND_URL=https://fintracker-117.emergent.host
```

**Frontend:**
```env
REACT_APP_BACKEND_URL=https://fintracker-117.emergent.host
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

Pronto! Depois de configurar tudo isso, o deployment deve funcionar! 🎉
