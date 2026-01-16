# 🚀 Como Configurar o Ambiente de Produção

## ⚠️ PROBLEMA IDENTIFICADO

Seu sistema está com erro **502 Bad Gateway** porque os arquivos `.env` não estão configurados no ambiente de produção.

---

## 📋 PASSO A PASSO PARA RESOLVER

### **Passo 1: Configurar Variáveis de Ambiente na Plataforma Emergent**

Acesse a plataforma Emergent e configure as seguintes variáveis de ambiente para o **backend**:

#### **Backend Environment Variables (Obrigatórias):**

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=finai_database
JWT_SECRET=finai-super-secret-jwt-key-2025-change-in-production-8fb9a4c3d2e1
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
WHATSAPP_SERVICE_KEY=wapp-secure-key-a7f3c9d8e2b1-2025
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

#### **Frontend Environment Variables (Obrigatórias):**

```bash
REACT_APP_BACKEND_URL=https://fintracker-117.emergent.host
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

### **Passo 2: Salvar no GitHub**

1. Na interface do chat, clique no botão **"Save to GitHub"** (ou equivalente)
2. Isso irá salvar todas as alterações mais recentes do código

---

### **Passo 3: Fazer Deploy**

1. Na plataforma Emergent, clique em **"Deploy"**
2. Aguarde o processo de deploy ser concluído
3. O sistema deve reiniciar com as novas configurações

---

### **Passo 4: Verificar se o Sistema Está Funcionando**

Execute este comando no seu terminal para testar:

```bash
curl https://fintracker-117.emergent.host/api/health
```

Se retornar algo como `{"status":"healthy","service":"finai-backend"}`, o backend está funcionando! ✅

Se ainda receber erro 502, aguarde 1-2 minutos após o deploy e tente novamente.

---

### **Passo 5: Configurar Usuário Admin (Primeira Vez)**

Como o banco de dados de produção está vazio, você precisa criar um usuário administrador:

```bash
curl -X POST https://fintracker-117.emergent.host/api/setup/initialize \
  -H "Content-Type: application/json"
```

Isso criará um usuário admin com as credenciais:
- **Email:** admin@fintracker.com
- **Senha:** admin123

⚠️ **IMPORTANTE:** Troque essa senha assim que fizer o primeiro login!

---

## 🔐 Alternativa: Resetar Senha do Admin

Se o usuário já existe mas você esqueceu a senha:

```bash
curl -X POST https://fintracker-117.emergent.host/api/users/reset-admin-password \
  -H "Content-Type: application/json" \
  -d '{"new_password": "SuaNovaSenha123"}'
```

---

## 📝 NOTAS IMPORTANTES

1. **Ambiente Preview vs Produção:** São ambientes completamente separados. Mudanças feitas no preview não aparecem automaticamente em produção.

2. **URLs Corretas:**
   - Preview: `https://bizmaster-17.preview.emergentagent.com`
   - Produção: `https://fintracker-117.emergent.host`

3. **Banco de Dados:** Cada ambiente tem seu próprio banco MongoDB. Os dados não são compartilhados.

4. **Google Drive OAuth:** Se configurado com a URL de produção, o callback funcionará corretamente após o deploy.

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após seguir todos os passos, verifique:

- [ ] Backend responde no endpoint `/api/health`
- [ ] Consegue fazer login com as credenciais admin
- [ ] Dashboard carrega sem erros
- [ ] QR Code do WhatsApp é gerado
- [ ] Backup do Google Drive conecta com sucesso

---

## 🆘 PRECISA DE AJUDA?

Se ainda encontrar problemas após seguir estes passos, me avise qual erro específico está vendo!
