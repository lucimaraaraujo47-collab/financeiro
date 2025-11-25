# 🚀 Setup Inicial do Sistema no Deploy

## ⚠️ PROBLEMA: Login não funciona após deploy

**Por quê?** 
- Preview e Deploy têm **bancos de dados separados**
- No preview você tem usuários cadastrados
- No deploy o banco está **vazio** (sem usuários)

---

## ✅ SOLUÇÃO RÁPIDA: Endpoint de Inicialização

Criei um endpoint especial que cria automaticamente:
- ✅ Empresa padrão "ECHO SHOP"
- ✅ Usuário admin com credenciais padrão
- ✅ Categoria financeira "Geral"
- ✅ Centro de custo "Administrativo"

---

## 📋 Como Usar

### **Passo 1: Chamar o Endpoint de Setup**

Após fazer deploy, execute este comando **UMA ÚNICA VEZ**:

```bash
curl -X POST "https://SEU-DOMINIO-DEPLOY/api/setup/initialize" \
  -H "Content-Type: application/json"
```

**Substitua:** `SEU-DOMINIO-DEPLOY` pelo domínio do seu deploy.

**Exemplo:**
```bash
curl -X POST "https://finance-ai-27-production.emergentagent.com/api/setup/initialize" \
  -H "Content-Type: application/json"
```

### **Passo 2: Aguarde a Resposta**

Você receberá algo assim:
```json
{
  "success": true,
  "message": "✅ Sistema inicializado com sucesso!",
  "details": {
    "empresa_id": "xxx-xxx-xxx",
    "empresa_nome": "ECHO SHOP - Empresa Padrão",
    "admin_email": "admin@echoshop.com",
    "admin_senha": "admin123",
    "instrucoes": "Faça login com as credenciais acima..."
  }
}
```

### **Passo 3: Fazer Login**

Agora você pode fazer login no sistema com:
- **Email:** `admin@echoshop.com`
- **Senha:** `admin123`

---

## 🔒 Segurança

### **Após o Primeiro Login:**

1. ✅ Vá em **Configurações → Usuários**
2. ✅ Edite o usuário admin
3. ✅ **Mude a senha padrão** para uma senha segura
4. ✅ Atualize o nome e email se necessário

### **Proteções do Endpoint:**

- ⚠️ **Só funciona uma vez** - Se já existem usuários, retorna erro
- ⚠️ **Rate limited** - Máximo 5 chamadas por hora
- ⚠️ **Não sobrescreve dados** - Verifica se o banco está vazio primeiro

---

## 🛠️ Troubleshooting

### **Erro: "Sistema já inicializado"**
```json
{
  "detail": "Sistema já inicializado! Existem X usuários cadastrados..."
}
```

**Solução:** O sistema já foi inicializado. Use as credenciais existentes ou recupere a senha.

### **Erro 429: Rate limit**
```json
{
  "detail": "Rate limit exceeded"
}
```

**Solução:** Aguarde 1 hora e tente novamente. Limite: 5 chamadas/hora.

### **Erro 500: Internal Server Error**

**Possíveis causas:**
1. Banco de dados não acessível
2. Variável MONGO_URL incorreta
3. Permissões do banco

**Solução:**
1. Verifique os logs do backend
2. Confirme que MONGO_URL está configurado
3. Teste conectividade com o MongoDB

---

## 🔄 Alternativa: Via Interface Web

Se preferir não usar curl, você pode:

1. Abrir o navegador
2. Ir para: `https://SEU-DOMINIO-DEPLOY/api/setup/initialize`
3. Método: POST (pode usar Postman, Insomnia, ou extensão REST do navegador)

---

## 📝 Checklist de Deploy

Antes de fazer deploy:
- [ ] Salvar código no GitHub
- [ ] Configurar variáveis de ambiente
- [ ] Fazer deploy
- [ ] **Chamar endpoint `/api/setup/initialize`** ← IMPORTANTE!
- [ ] Fazer login com admin@echoshop.com / admin123
- [ ] Mudar senha do admin
- [ ] Configurar empresa
- [ ] Testar WhatsApp
- [ ] Testar Google Drive backup

---

## 🎯 Resumo

**Problema:** Login não funciona no deploy (banco vazio)

**Solução:**
```bash
# 1. Deploy da aplicação
# 2. Chamar endpoint:
curl -X POST "https://SEU-DOMINIO/api/setup/initialize"

# 3. Fazer login:
# Email: admin@echoshop.com
# Senha: admin123

# 4. Mudar senha do admin
```

---

## ⚡ Comandos Rápidos

**Inicializar sistema:**
```bash
curl -X POST "https://SEU-DOMINIO/api/setup/initialize"
```

**Verificar se sistema já foi inicializado:**
```bash
curl -X POST "https://SEU-DOMINIO/api/setup/initialize"
# Se retornar "Sistema já inicializado" = OK
```

**Fazer login via API:**
```bash
curl -X POST "https://SEU-DOMINIO/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@echoshop.com","senha":"admin123"}'
```

---

## 💡 Notas Importantes

1. **Execute APENAS uma vez** após cada deploy em ambiente novo
2. **Não execute em preview** - já tem usuários
3. **Mude a senha padrão** imediatamente após login
4. O endpoint é **idempotente** - se já rodou, apenas avisa
5. **Rate limited** para segurança - máximo 5 tentativas/hora

---

## 🆘 Suporte

Se o endpoint não funcionar:
1. Verifique se o backend está rodando
2. Confirme que MongoDB está acessível
3. Verifique variáveis de ambiente (MONGO_URL, DB_NAME)
4. Veja os logs do backend para erros

**Logs do backend:**
```bash
sudo supervisorctl tail -f backend stderr
```
