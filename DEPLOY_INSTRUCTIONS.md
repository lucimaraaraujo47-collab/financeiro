# 📦 Instruções de Deploy - ECHO SHOP FinAI

## ⚠️ IMPORTANTE: WhatsApp Service Configuration

Para que o WhatsApp funcione no ambiente de **deploy/produção**, é essencial configurar corretamente as variáveis de ambiente.

---

## 🔧 Variáveis de Ambiente Críticas

### Backend (`/app/backend/.env`)

As seguintes variáveis **DEVEM** ser configuradas no ambiente de deploy:

```bash
# WhatsApp Service - CRÍTICO para funcionamento
WHATSAPP_SERVICE_URL=http://127.0.0.1:8002

# NÃO use "localhost" - use "127.0.0.1" para compatibilidade Kubernetes
```

**Por quê 127.0.0.1 e não localhost?**
- Em ambientes Kubernetes, `localhost` pode resolver para IPv6
- O serviço WhatsApp está configurado para IPv4 (`0.0.0.0`)
- Usar `127.0.0.1` garante conexão IPv4 correta

---

## 🚀 Como Fazer Deploy

### Passo 1: Salvar no GitHub
1. Na interface do Emergent, clique em **"Save to GitHub"**
2. Isso commitará todas as mudanças do código
3. **Inclui:** Fix do IPv4 binding no `whatsapp-service/index.js`

### Passo 2: Configurar Variáveis de Ambiente
Antes de fazer deploy, configure as variáveis de ambiente:

**Variáveis Essenciais:**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=finai_database
JWT_SECRET=<seu-secret-seguro>
EMERGENT_LLM_KEY=<sua-chave>
WHATSAPP_SERVICE_URL=http://127.0.0.1:8002
WHATSAPP_SERVICE_KEY=<sua-chave>
GOOGLE_CLIENT_ID=<seu-client-id>
GOOGLE_CLIENT_SECRET=<seu-client-secret>
GOOGLE_DRIVE_REDIRECT_URI=https://<seu-dominio>/api/oauth/drive/callback
FRONTEND_URL=https://<seu-dominio>
CORS_ORIGINS=https://<seu-dominio>
```

**Substitua:**
- `<seu-dominio>` pelo domínio do seu deploy
- `<suas-chaves>` pelas suas credenciais reais

### Passo 3: Deploy
1. Clique em **"Deploy"** no Emergent
2. Aguarde o deploy completar
3. Teste o WhatsApp: **Configurações → WhatsApp**

---

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

1. **WhatsApp Status:**
   - Acesse: Configurações → WhatsApp
   - Clique: "🔌 Conectar WhatsApp"
   - **Deve aparecer:** QR Code sem erros
   - **NÃO deve mostrar:** "Offline" ou "Erro ao reconectar"

2. **Google Drive Backup:**
   - Acesse: Configurações → Backup
   - Clique: "Conectar com Google"
   - Deve redirecionar para login do Google

3. **Transferência Entre Contas:**
   - Acesse: Transações
   - Deve aparecer botão: "🔄 Transferir Entre Contas"

---

## 🐛 Troubleshooting

### "Erro ao reconectar: Erro ao reconectar"

**Causa:** `WHATSAPP_SERVICE_URL` não configurado ou usando `localhost`

**Solução:**
1. Verifique variável de ambiente: `WHATSAPP_SERVICE_URL=http://127.0.0.1:8002`
2. Refaça o deploy
3. Aguarde 1-2 minutos para serviços subirem

### "Offline - O serviço WhatsApp não está respondendo"

**Causas possíveis:**
1. Serviço WhatsApp não iniciou (aguarde 1-2 min)
2. Variável `WHATSAPP_SERVICE_URL` incorreta
3. Supervisor não reiniciou todos os serviços

**Solução:**
1. Aguarde 2 minutos após deploy
2. Recarregue a página
3. Se persistir, verifique se salvou no GitHub antes do deploy

---

## 📝 Checklist de Deploy

- [ ] Código salvo no GitHub ("Save to GitHub")
- [ ] Variáveis de ambiente configuradas
- [ ] `WHATSAPP_SERVICE_URL=http://127.0.0.1:8002` configurado
- [ ] Domínios atualizados nas variáveis (FRONTEND_URL, CORS_ORIGINS, etc)
- [ ] Deploy realizado
- [ ] Aguardado 2 minutos após deploy
- [ ] Testado WhatsApp (QR code aparece)
- [ ] Testado Google Drive (login funciona)
- [ ] Testado Transferência (botão aparece)

---

## 🎯 Mudanças Aplicadas para Fix do WhatsApp

### 1. IPv4 Binding (whatsapp-service/index.js)
```javascript
// Linha 300 - Fix aplicado
app.listen(PORT, '0.0.0.0', () => {
```
**Por quê:** Força binding IPv4 para compatibilidade com backend

### 2. URL do Serviço (.env)
```bash
WHATSAPP_SERVICE_URL=http://127.0.0.1:8002
```
**Por quê:** `127.0.0.1` garante conexão IPv4, `localhost` pode usar IPv6

### 3. Separação WhatsApp/Financeiro (server.py)
- WhatsApp agora usado **apenas para CRM**
- Não cria mais transações financeiras automaticamente
- Cria/atualiza leads e registra conversas

---

## 📞 Suporte

Se o problema persistir após seguir todos os passos:
1. Verifique se TODAS as variáveis de ambiente estão configuradas
2. Confirme que salvou no GitHub antes do deploy
3. Aguarde pelo menos 2 minutos após o deploy
4. Recarregue a página com Ctrl+F5 (limpa cache)

**Todas as correções foram aplicadas e testadas no ambiente de preview!**
