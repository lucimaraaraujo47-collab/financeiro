# App do Técnico - ECHO SHOP

Aplicativo mobile para técnicos de campo gerenciarem suas ordens de serviço.

## Funcionalidades

- ✅ **Login** - Autenticação com credenciais do sistema
- ✅ **Lista de OS** - Visualização das OS atribuídas ao técnico
- ✅ **Detalhes da OS** - Informações completas do serviço
- ✅ **Checklist** - Marcar itens concluídos
- ✅ **Assinatura Digital** - Coletar assinatura do cliente
- ✅ **Câmera** - Tirar fotos do serviço (antes/durante/depois)
- ✅ **Galeria de Fotos** - Visualizar fotos da OS
- ✅ **Contato Rápido** - Ligar, WhatsApp, Mapas
- ⏳ **Modo Offline** - Em desenvolvimento

## Requisitos

- Node.js 18+
- Expo CLI
- Dispositivo físico ou emulador

## Instalação

```bash
cd app-tecnico
npm install
# ou
yarn install
```

## Configuração

Edite o arquivo `config.js` com a URL do backend:

```javascript
// Para desenvolvimento local (substitua pelo IP da sua máquina)
return 'http://192.168.1.100:8001/api';

// Para produção
return 'https://seu-servidor.com/api';
```

### Descobrindo o IP local

- **Windows:** `ipconfig`
- **Mac/Linux:** `ifconfig` ou `ip addr`

## Executando

```bash
# Iniciar Expo
npx expo start

# Ou com tunnel (para dispositivos em redes diferentes)
npx expo start --tunnel
```

## Estrutura

```
app-tecnico/
├── App.js              # Navegação principal
├── config.js           # Configurações e tema
├── package.json        # Dependências
└── screens/
    ├── LoginScreen.js      # Tela de login
    ├── HomeScreen.js       # Lista de OS
    ├── OSDetailScreen.js   # Detalhes da OS
    ├── SignatureScreen.js  # Captura de assinatura
    ├── CameraScreen.js     # Câmera para fotos
    └── PhotoGalleryScreen.js # Galeria de fotos
```

## Fluxo de Uso

1. **Login** - Técnico faz login com suas credenciais
2. **Lista de OS** - Vê as OS atribuídas a ele
3. **Detalhes** - Acessa uma OS para ver informações
4. **Execução** - Marca checklist, tira fotos
5. **Assinatura** - Coleta assinatura do cliente
6. **Conclusão** - Finaliza a OS

## Status da OS

- `aberta` - Nova, aguardando agendamento
- `agendada` - Com data marcada
- `em_andamento` - Técnico executando
- `concluida` - Serviço finalizado
- `cancelada` - OS cancelada

## Credenciais de Teste

```
Email: faraujoneto2025@gmail.com
Senha: Rebeca@19
```

## Tecnologias

- React Native
- Expo SDK 50
- React Navigation 6
- Axios
- AsyncStorage
- expo-camera
- react-native-signature-canvas

## Próximos Passos

1. Implementar modo offline com sincronização
2. Push notifications para novas OS
3. Geolocalização para rota até o cliente
4. Escaneamento de código de barras de equipamentos
