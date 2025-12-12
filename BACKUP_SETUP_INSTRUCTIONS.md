# 📦 Sistema de Backup Automático - Google Drive

## ✅ Implementado

O sistema de backup automático foi implementado com sucesso! Aqui está o que foi criado:

### Funcionalidades
- ✅ Backup diário automático às 3h da manhã
- ✅ Export de TODOS os dados do MongoDB em formato JSON
- ✅ Upload automático para Google Drive
- ✅ Retenção de 30 dias (backups antigos são deletados automaticamente)
- ✅ Endpoint de backup manual via API
- ✅ Logs detalhados em `/var/log/backup.log`

### Arquivos Criados
1. `/app/backend/automated_backup.py` - Script de backup automático
2. `/app/backend/backup_cron` - Configuração do cron job
3. Endpoints no backend:
   - `POST /api/backup/create` - Criar backup manual (somente admin)
   - `GET /api/backup/status` - Ver status da configuração

---

## 🔧 Configuração Necessária (Siga os Passos)

### Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Clique em "Select a Project" → "NEW PROJECT"
3. Nome do projeto: `echo-shop-backup` (ou qualquer nome)
4. Clique em "CREATE"

### Passo 2: Ativar Google Drive API

1. No menu lateral, vá em: **APIs & Services** → **Library**
2. Busque por: `Google Drive API`
3. Clique em "Google Drive API" → **ENABLE**

### Passo 3: Criar Service Account

1. No menu lateral: **APIs & Services** → **Credentials**
2. Clique em **+ CREATE CREDENTIALS** → **Service account**
3. Preencha:
   - Service account name: `backup-service`
   - Service account ID: será gerado automaticamente
   - Description: `Automated backup service for ECHO SHOP`
4. Clique em **CREATE AND CONTINUE**
5. Role: Selecione **Basic** → **Editor** (ou pode pular)
6. Clique em **CONTINUE** → **DONE**

### Passo 4: Baixar Chave JSON

1. Na lista de Service Accounts, clique no email da service account que você criou
2. Vá na aba **KEYS**
3. Clique em **ADD KEY** → **Create new key**
4. Tipo: **JSON**
5. Clique em **CREATE**
6. Um arquivo `service_account.json` será baixado automaticamente

### Passo 5: Upload do arquivo JSON para o servidor

Você tem 2 opções:

**Opção A: Upload via interface (mais fácil)**
1. Acesse o terminal do seu ambiente
2. Execute:
   ```bash
   cat > /app/backend/service_account.json
   ```
3. Cole TODO o conteúdo do arquivo JSON baixado
4. Pressione `Ctrl+D` para salvar

**Opção B: Upload via arquivo**
1. Coloque o arquivo `service_account.json` em `/app/backend/service_account.json`

### Passo 6: Criar Pasta no Google Drive (Opcional mas Recomendado)

1. Acesse: https://drive.google.com/
2. Clique em **+ New** → **New folder**
3. Nome da pasta: `ECHO_SHOP_Backups`
4. **IMPORTANTE**: Compartilhe esta pasta com o email da Service Account:
   - Clique com botão direito na pasta → **Share**
   - Cole o email da service account (formato: `backup-service@projeto-xxxxx.iam.gserviceaccount.com`)
   - Permissão: **Editor**
   - Desmarque "Notify people"
   - Clique em **Share**
5. Copie o ID da pasta (está na URL):
   - URL da pasta: `https://drive.google.com/drive/folders/XXXXXXXXXXX`
   - O ID é: `XXXXXXXXXXX`

### Passo 7: Configurar Variáveis de Ambiente

Adicione ao arquivo `/app/backend/.env`:

```bash
# Google Drive Backup Configuration
GOOGLE_SERVICE_ACCOUNT_PATH=/app/backend/service_account.json
GOOGLE_DRIVE_FOLDER_ID=COLE_O_ID_DA_PASTA_AQUI
```

Se você não criou pasta específica, deixe apenas:
```bash
GOOGLE_SERVICE_ACCOUNT_PATH=/app/backend/service_account.json
```

### Passo 8: Instalar Cron Job

Execute no terminal:

```bash
# Adicionar cron job
crontab -l > /tmp/mycron 2>/dev/null || true
cat /app/backend/backup_cron >> /tmp/mycron
crontab /tmp/mycron

# Verificar se foi instalado
crontab -l
```

### Passo 9: Testar Backup Manual

Você pode testar fazendo um backup manual:

**Via API (Postman ou curl):**
```bash
curl -X POST https://tenant-manager-38.preview.emergentagent.com/api/backup/create \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

**Ou execute o script diretamente:**
```bash
cd /app/backend
/root/.venv/bin/python3 automated_backup.py
```

### Passo 10: Verificar Status

Após configurar, verifique o status via API:

```bash
curl -X GET https://tenant-manager-38.preview.emergentagent.com/api/backup/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

Ou veja os logs:
```bash
tail -f /var/log/backup.log
```

---

## 📋 Verificação Final

✅ **Checklist:**
- [ ] Service Account criada no Google Cloud
- [ ] Google Drive API habilitada
- [ ] Arquivo `service_account.json` no servidor
- [ ] Pasta compartilhada com service account (opcional)
- [ ] Variáveis de ambiente configuradas em `.env`
- [ ] Cron job instalado
- [ ] Backup manual testado com sucesso
- [ ] Logs mostrando sucesso em `/var/log/backup.log`

---

## 🔍 Solução de Problemas

### Erro: "Google Service Account não configurado"
- Verifique se o arquivo `/app/backend/service_account.json` existe
- Verifique se o caminho está correto no `.env`

### Erro: "Permission denied" ou "Insufficient permissions"
- Certifique-se de que compartilhou a pasta do Drive com o email da service account
- Verifique se a permissão é "Editor"

### Erro: "API not enabled"
- Ative a Google Drive API no Google Cloud Console

### Backup não está executando às 3h
- Verifique se o cron job foi instalado: `crontab -l`
- Veja os logs: `tail -f /var/log/backup.log`
- Reinicie o cron: `sudo service cron restart`

---

## 📊 Monitoramento

### Ver últimos backups:
Acesse o Google Drive e verifique a pasta de backups. Você verá arquivos no formato:
- `backup_20250130_030000.json`
- `backup_20250131_030000.json`
- etc.

### Ver logs:
```bash
# Últimos logs
tail -n 100 /var/log/backup.log

# Logs em tempo real
tail -f /var/log/backup.log
```

### Status via API:
A resposta de `/api/backup/status` mostra:
- Se está configurado
- Último backup criado
- Erros (se houver)

---

## 🎉 Pronto!

Seu sistema de backup automático está configurado! A partir de agora, todos os dias às 3h da manhã:

1. 📊 Todos os dados serão exportados
2. 📤 Backup será enviado para Google Drive
3. 🧹 Backups com mais de 30 dias serão deletados automaticamente
4. 📝 Tudo será registrado em `/var/log/backup.log`

Você também pode criar backups manuais a qualquer momento via API!
