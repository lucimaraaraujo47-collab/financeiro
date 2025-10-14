const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8002;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';

let sock;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let phoneNumber = null;

// Ensure auth directory exists
const authDir = path.join(__dirname, 'auth_info');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
      connectionStatus = 'qr_ready';
      console.log('📱 QR Code gerado! Escaneie com seu WhatsApp');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectando:', shouldReconnect);
      connectionStatus = 'disconnected';
      phoneNumber = null;
      qrCodeData = null;

      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 3000);
      }
    } else if (connection === 'open') {
      console.log('✅ ECHO SHOP WhatsApp conectado!');
      connectionStatus = 'connected';
      qrCodeData = null;
      
      // Get phone number
      if (sock.user) {
        phoneNumber = sock.user.id.split(':')[0];
        console.log('📞 Número conectado:', phoneNumber);
      }
    } else if (connection === 'connecting') {
      connectionStatus = 'connecting';
      console.log('🔄 Conectando...');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignore messages from self
      if (msg.key.fromMe) continue;

      // Only process text messages for now
      if (!msg.message?.conversation && !msg.message?.extendedTextMessage) continue;

      const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      const from = msg.key.remoteJid;
      const senderName = msg.pushName || from.split('@')[0];

      console.log('\n📩 Mensagem recebida:');
      console.log('De:', senderName);
      console.log('Número:', from);
      console.log('Mensagem:', messageText);

      try {
        // Process with backend AI
        await processMessageWithAI(from, messageText, senderName);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        await sendWhatsAppMessage(from, '❌ Erro ao processar sua mensagem. Tente novamente.');
      }
    }
  });
}

async function processMessageWithAI(phoneNumber, messageText, senderName) {
  try {
    // Send initial response
    await sendWhatsAppMessage(phoneNumber, '🤖 Processando sua mensagem com IA...');

    // Call backend to extract data
    // Note: We'll need a special endpoint that doesn't require auth for WhatsApp messages
    // Or we'll need to create a service token
    const extractResponse = await axios.post(
      `${BACKEND_URL}/api/whatsapp/process`,
      {
        phone_number: phoneNumber,
        sender_name: senderName,
        message: messageText
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-WhatsApp-Service': 'internal-service-key-123' // Simple auth for internal service
        },
        timeout: 30000
      }
    );

    const { dados_extraidos, classificacao_sugerida, response_message } = extractResponse.data;

    if (response_message) {
      await sendWhatsAppMessage(phoneNumber, response_message);
    }

  } catch (error) {
    console.error('Erro ao processar com IA:', error.message);
    await sendWhatsAppMessage(
      phoneNumber,
      '❌ Erro ao processar mensagem com IA. Por favor, tente novamente ou entre em contato com o suporte.'
    );
  }
}

async function sendWhatsAppMessage(to, message) {
  if (!sock || connectionStatus !== 'connected') {
    console.error('WhatsApp não conectado!');
    return;
  }

  try {
    await sock.sendMessage(to, { text: message });
    console.log('✅ Mensagem enviada para:', to);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
  }
}

// API Routes
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    phone_number: phoneNumber,
    has_qr: qrCodeData !== null
  });
});

app.get('/qr', (req, res) => {
  if (qrCodeData) {
    res.json({ qr: qrCodeData });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
  }

  if (connectionStatus !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp não conectado' });
  }

  try {
    await sendWhatsAppMessage(to, message);
    res.json({ success: true, message: 'Mensagem enviada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.post('/disconnect', async (req, res) => {
  if (sock) {
    await sock.logout();
    connectionStatus = 'disconnected';
    qrCodeData = null;
    phoneNumber = null;
    res.json({ success: true, message: 'Desconectado do WhatsApp' });
  } else {
    res.status(400).json({ error: 'Não há conexão ativa' });
  }
});

app.post('/reconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    qrCodeData = null;
    phoneNumber = null;
    connectionStatus = 'connecting';
    setTimeout(() => connectToWhatsApp(), 1000);
    res.json({ success: true, message: 'Reconectando...' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reconectar' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Service rodando na porta ${PORT}`);
  console.log('📱 Iniciando conexão com WhatsApp...');
  connectToWhatsApp();
});

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando WhatsApp Service...');
  if (sock) {
    await sock.logout();
  }
  process.exit(0);
});