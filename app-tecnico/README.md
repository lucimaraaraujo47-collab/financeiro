# 🛠️ App do Técnico - ECHO SHOP

Aplicativo móvel para técnicos de campo realizarem ordens de serviço.

## Funcionalidades

- 🔐 Login do técnico
- 📋 Lista de OS atribuídas
- ✅ Checklist interativo
- ✍️ Assinatura digital do cliente
- 📸 Captura de fotos (em desenvolvimento)
- 📍 GPS para registro de localização (em desenvolvimento)

## Requisitos

- Node.js 18+
- Expo CLI
- Expo Go no celular (para testes)

## Instalação

```bash
cd app-tecnico
npm install
# ou
yarn install
```

## Configuração

Edite o arquivo `config.js` e configure a URL da API:

```javascript
export const API_URL = 'http://SEU_IP:8001/api';
```

## Executar

```bash
npx expo start
```

Escaneie o QR Code com o app Expo Go no celular.

## Build para Produção

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

## Estrutura

```
app-tecnico/
├── App.js              # Navegação principal
├── config.js           # Configurações (API URL)
├── screens/
│   ├── LoginScreen.js  # Tela de login
│   ├── HomeScreen.js   # Lista de OS
│   ├── OSDetailScreen.js # Detalhes da OS
│   └── SignatureScreen.js # Assinatura digital
└── assets/             # Ícones e imagens
```
