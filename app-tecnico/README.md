# App do Técnico - ECHO SHOP

Aplicativo mobile React Native para técnicos de campo gerenciarem suas ordens de serviço.

## 🚀 Quick Start

```bash
# 1. Instalar dependências
cd app-tecnico
npm install

# 2. Iniciar o app
npm start

# 3. Escanear QR code com Expo Go no celular
```

## 📱 Download do App

### Para Android (APK)

1. Execute o comando de build:
   ```bash
   npx eas build --platform android --profile preview
   ```
2. Baixe o APK do link gerado
3. Instale no dispositivo Android

### Para iOS (TestFlight)

Requer conta Apple Developer. Veja `DEPLOY_GUIDE.md`.

## ✨ Funcionalidades

| Feature | Status |
|---------|--------|
| Login com autenticação | ✅ |
| Lista de OS atribuídas | ✅ |
| Detalhes da OS | ✅ |
| Checklist interativo | ✅ |
| Assinatura digital | ✅ |
| Câmera para fotos | ✅ |
| Galeria de fotos | ✅ |
| Contato rápido (Tel/WhatsApp/Maps) | ✅ |
| Modo Offline | ⏳ |

## 🔧 Configuração

### URL da API

Edite `config.js`:

```javascript
// Para produção (atual)
const PRODUCTION_URL = 'https://techflow-16.preview.emergentagent.com/api';

// Para desenvolvimento local
const DEVELOPMENT_URL = 'http://SEU_IP:8001/api';
```

### Descobrir IP Local

- **Windows:** `ipconfig`
- **Mac/Linux:** `ifconfig` ou `ip addr`

## 📁 Estrutura

```
app-tecnico/
├── App.js              # Navegação principal
├── config.js           # Configurações e tema
├── app.json            # Config Expo/build
├── eas.json            # Config EAS Build
├── package.json        # Dependências
├── DEPLOY_GUIDE.md     # Guia completo de deploy
└── screens/
    ├── LoginScreen.js      # Tela de login
    ├── HomeScreen.js       # Lista de OS
    ├── OSDetailScreen.js   # Detalhes da OS
    ├── SignatureScreen.js  # Assinatura digital
    ├── CameraScreen.js     # Câmera
    └── PhotoGalleryScreen.js # Galeria
```

## 🔄 Fluxo de Uso

```
Login → Lista de OS → Selecionar OS → Ver Detalhes
                                          ↓
                              Executar Checklist
                                          ↓
                              Tirar Fotos (opcional)
                                          ↓
                              Coletar Assinatura
                                          ↓
                              Concluir OS
```

## 🎨 Status da OS

| Status | Cor | Descrição |
|--------|-----|-----------|
| Aberta | Cinza | Nova, aguardando agendamento |
| Agendada | Roxo | Data marcada |
| Em Andamento | Laranja | Técnico executando |
| Concluída | Verde | Finalizada |
| Cancelada | Vermelho | Cancelada |

## 🔐 Credenciais de Teste

```
Email: faraujoneto2025@gmail.com
Senha: Rebeca@19
```

## 📦 Tecnologias

- React Native 0.73
- Expo SDK 50
- React Navigation 6
- Axios
- AsyncStorage
- expo-camera
- react-native-signature-canvas

## 📖 Documentação Completa

Veja `DEPLOY_GUIDE.md` para:
- Build APK/IPA
- Publicação nas lojas
- Updates OTA
- Troubleshooting

## 🆘 Suporte

- [Documentação Expo](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
