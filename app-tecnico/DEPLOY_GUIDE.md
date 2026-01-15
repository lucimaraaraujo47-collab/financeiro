# Guia de Build e Deploy - App do Técnico

## Pré-requisitos

1. **Node.js 18+** instalado
2. **Conta Expo** (gratuita): https://expo.dev/signup
3. **EAS CLI** instalado: `npm install -g eas-cli`

## Configuração Inicial

### 1. Login no Expo

```bash
cd app-tecnico
npx eas login
```

### 2. Configurar Projeto no EAS

```bash
npx eas build:configure
```

Isso irá criar o projeto no dashboard do Expo.

## Builds

### Build APK (Android) - Para Testes

Gera um APK que pode ser instalado em qualquer dispositivo Android:

```bash
npm run build:android:preview
# ou
npx eas build --platform android --profile preview
```

Após o build:
1. Acesse o link fornecido no terminal
2. Baixe o arquivo APK
3. Instale no dispositivo Android

### Build AAB (Android) - Para Play Store

```bash
npm run build:android
# ou
npx eas build --platform android --profile production
```

### Build iOS - Para App Store

```bash
npm run build:ios
# ou
npx eas build --platform ios --profile production
```

**Nota:** Para iOS, você precisa de uma conta Apple Developer ($99/ano).

## Distribuição

### Android - Instalação Direta (APK)

1. Faça o build preview: `npm run build:android:preview`
2. Baixe o APK do link fornecido
3. Envie o APK para os técnicos via:
   - Email
   - WhatsApp
   - Google Drive
   - Link direto do Expo

### Android - Play Store

1. Faça o build production: `npm run build:android`
2. Publique na Google Play Console:
   ```bash
   npm run submit:android
   ```

### iOS - TestFlight

1. Faça o build production: `npm run build:ios`
2. Submeta para App Store Connect:
   ```bash
   npm run submit:ios
   ```

## Updates Over-the-Air (OTA)

Após a primeira instalação, você pode enviar atualizações sem precisar de um novo build:

```bash
npm run update
# ou
npx eas update --branch production --message "Descrição da atualização"
```

## Configurações

### Mudar URL da API

Edite o arquivo `config.js`:

```javascript
// Para produção
const PRODUCTION_URL = 'https://seu-servidor.com/api';
```

### Mudar Versão

1. Edite `app.json`:
   - `version`: "1.0.1"
   - `android.versionCode`: 2
   - `ios.buildNumber`: "2"

2. Edite `package.json`:
   - `version`: "1.0.1"

## Checklist de Deploy

- [ ] Testar todas as funcionalidades
- [ ] Verificar URL da API em `config.js`
- [ ] Atualizar versão em `app.json` e `package.json`
- [ ] Verificar ícones e splash screen
- [ ] Fazer build
- [ ] Testar APK/IPA em dispositivo real
- [ ] Distribuir para técnicos

## Comandos Úteis

```bash
# Iniciar em modo desenvolvimento
npm start

# Iniciar com tunnel (dispositivos externos)
npm run start:tunnel

# Ver status dos builds
npx eas build:list

# Cancelar build em andamento
npx eas build:cancel

# Ver logs do último build
npx eas build:view
```

## Troubleshooting

### "Não consigo instalar o APK"

1. Habilite "Fontes desconhecidas" no Android
2. Verifique se o arquivo não está corrompido
3. Tente baixar novamente

### "App não conecta com API"

1. Verifique a URL em `config.js`
2. Verifique se o backend está online
3. Verifique conectividade do dispositivo

### "Build falhou"

1. Verifique os logs: `npx eas build:view`
2. Verifique se todas as dependências estão corretas
3. Tente limpar cache: `npx expo start --clear`

## Suporte

- Documentação Expo: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Fórum Expo: https://forums.expo.dev
