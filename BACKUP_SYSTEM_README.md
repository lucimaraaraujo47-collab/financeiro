# 📦 Sistema de Backup Automático - INSTALADO!

## ✅ Status: SISTEMA INSTALADO E FUNCIONANDO

O sistema de backup foi instalado com sucesso! Você verá esta mensagem nos logs:
```
⚠ Google Drive not configured - Automated backups disabled
See /app/BACKUP_SETUP_INSTRUCTIONS.md for setup instructions
```

Isso é **NORMAL** até você configurar o Google Drive.

---

## 🚀 Como Funciona

### 1. Backup Automático (APScheduler)
- ✅ **Instalado e rodando**
- ⏰ **Agendamento:** Todos os dias às 3:00 AM
- 📊 **Dados salvos:** Todos os dados do MongoDB (empresas, transações, CRM, estoque, etc.)
- 📤 **Destino:** Google Drive (após configuração)
- 🧹 **Retenção:** 30 dias (backups antigos são deletados automaticamente)

### 2. Endpoints de API
- `POST /api/backup/create` - Criar backup manual
- `GET /api/backup/status` - Ver status da configuração

---

## 📋 Arquivos Criados

1. **`/app/backend/server.py`**
   - Funções de backup integradas
   - Scheduler configurado (APScheduler)
   - Endpoints de API

2. **`/app/backend/automated_backup.py`**
   - Script standalone de backup (alternativa via cron)

3. **`/app/backend/service_account.json.example`**
   - Exemplo de arquivo de credenciais do Google

4. **`/app/backend/.env`**
   - Variáveis de ambiente comentadas prontas para uso

5. **`/app/BACKUP_SETUP_INSTRUCTIONS.md`**
   - Instruções COMPLETAS passo a passo

---

## 🔧 Configurar Agora (10 minutos)

### Passo Rápido:

1. **Leia as instruções completas:**
   ```bash
   cat /app/BACKUP_SETUP_INSTRUCTIONS.md
   ```

2. **Resumo dos passos:**
   - Criar Service Account no Google Cloud Console
   - Baixar arquivo JSON
   - Fazer upload para `/app/backend/service_account.json`
   - Descomentar variáveis no `/app/backend/.env`:
     ```bash
     GOOGLE_SERVICE_ACCOUNT_PATH=/app/backend/service_account.json
     GOOGLE_DRIVE_FOLDER_ID=seu-folder-id-aqui
     ```
   - Reiniciar backend: `sudo supervisorctl restart backend`

3. **Testar backup manual:**
   ```bash
   # Via script
   cd /app/backend
   /root/.venv/bin/python3 automated_backup.py
   
   # Via API (requer token admin)
   curl -X POST https://seu-app.com/api/backup/create \
     -H "Authorization: Bearer SEU_TOKEN"
   ```

---

## 🔍 Verificar Se Está Funcionando

### Logs do Backend:
```bash
# Ver logs
tail -f /var/log/supervisor/backend.err.log

# Procurar mensagens de backup
tail -100 /var/log/supervisor/backend.err.log | grep -i backup
```

### Se configurado corretamente, você verá:
```
✓ Automated backup scheduler started - Daily backups at 3:00 AM
```

### Se NÃO configurado (esperado até você configurar):
```
⚠ Google Drive not configured - Automated backups disabled
See /app/BACKUP_SETUP_INSTRUCTIONS.md for setup instructions
```

---

## 📊 Testar o Endpoint de Status

```bash
curl -X GET https://seu-app.com/api/backup/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta esperada (sem configuração):**
```json
{
  "configured": false,
  "service_account_path": "/app/backend/service_account.json",
  "folder_id_configured": false,
  "last_backup": null
}
```

**Resposta após configurar:**
```json
{
  "configured": true,
  "service_account_path": "/app/backend/service_account.json",
  "folder_id_configured": true,
  "last_backup": {
    "name": "backup_20250131_030000.json",
    "created_at": "2025-01-31T03:00:15.123Z"
  }
}
```

---

## 🎯 Próximos Passos

1. ✅ Sistema instalado - **COMPLETO**
2. ⏳ Configurar Google Drive - **PENDENTE** (leia `/app/BACKUP_SETUP_INSTRUCTIONS.md`)
3. ⏳ Testar backup manual
4. ⏳ Aguardar backup automático às 3 AM

---

## 💡 Dicas

- O scheduler está **sempre rodando** no backend
- Mesmo sem Google Drive configurado, o sistema está pronto
- Backups só serão feitos após você configurar as credenciais
- Você pode testar a qualquer momento via endpoint `/api/backup/create`

---

## 🆘 Problemas?

### "Automated backups disabled"
- **Causa:** Google Drive não configurado
- **Solução:** Siga `/app/BACKUP_SETUP_INSTRUCTIONS.md`

### "Error creating backup"
- **Causa:** Credenciais inválidas ou pasta não compartilhada
- **Solução:** Verifique o arquivo `service_account.json` e permissões no Drive

### Backup não executa às 3 AM
- **Causa:** Backend precisa estar rodando
- **Solução:** Verifique `sudo supervisorctl status backend`

---

## ✅ Checklist de Instalação

- [x] APScheduler instalado
- [x] Funções de backup adicionadas ao server.py  
- [x] Scheduler inicializado no startup
- [x] Endpoints de API criados
- [x] Arquivo de exemplo criado
- [x] Variáveis de ambiente preparadas
- [x] Documentação completa criada
- [x] Backend reiniciado e funcionando
- [ ] Google Drive configurado (você precisa fazer)
- [ ] Primeiro backup testado

---

🎉 **Sistema pronto para uso! Configure o Google Drive para começar a fazer backups.**
