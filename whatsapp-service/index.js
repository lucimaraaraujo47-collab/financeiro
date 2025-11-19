const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
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
    connectTimeoutMs: 60000, // Increase connection timeout
    keepAliveIntervalMs: 30000, // Keep connection alive
    markOnlineOnConnect: true,
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

      const from = msg.key.remoteJid;
      const senderName = msg.pushName || from.split('@')[0];

      // Process text messages
      if (msg.message?.conversation || msg.message?.extendedTextMessage) {
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        
        console.log('\n📩 Mensagem de texto recebida:');
        console.log('De:', senderName);
        console.log('Número:', from);
        console.log('Mensagem:', messageText);
        console.log('🔄 Chamando processMessageWithAI...');

        try {
          await processMessageWithAI(from, messageText, senderName);
          console.log('✅ processMessageWithAI completado');
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
          console.error('Stack:', error.stack);
          await sendWhatsAppMessage(from, '❌ Erro ao processar sua mensagem. Tente novamente.');
        }
      }
      // Process audio messages
      else if (msg.message?.audioMessage) {
        console.log('\n🎤 Mensagem de áudio recebida:');
        console.log('De:', senderName);
        console.log('Número:', from);
        
        try {
          await sendWhatsAppMessage(from, '🎤 Áudio recebido! Processando...');
          
          // Download audio
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { 
              logger: console,
              reuploadRequest: sock.updateMediaMessage
            }
          );
          
          // Convert to text (send to backend for transcription)
          const audioBase64 = buffer.toString('base64');
          const transcription = await transcribeAudio(audioBase64);
          
          if (transcription) {
            console.log('Transcrição:', transcription);
            await sendWhatsAppMessage(from, `📝 Entendi: "${transcription}"\n\nProcessando com IA...`);
            await processMessageWithAI(from, transcription, senderName);
          } else {
            await sendWhatsAppMessage(from, '❌ Não consegui entender o áudio. Tente enviar texto ou falar mais claramente.');
          }
        } catch (error) {
          console.error('Erro ao processar áudio:', error);
          await sendWhatsAppMessage(from, '❌ Erro ao processar áudio. Tente enviar mensagem de texto.');
        }
      }
    }
  });
}

async function processMessageWithAI(phoneNumber, messageText, senderName) {
  try {
    console.log(`\n🔄 processMessageWithAI iniciado para ${phoneNumber}`);
    console.log(`   Mensagem: "${messageText}"`);
    console.log(`   Backend URL: ${BACKEND_URL}`);
    
    // Send initial response
    await sendWhatsAppMessage(phoneNumber, '🤖 Processando sua mensagem com IA...');

    // Call backend to extract data
    console.log(`📡 Chamando backend: ${BACKEND_URL}/api/whatsapp/process`);
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

    console.log('✅ Resposta do backend recebida');
    console.log('   Status:', extractResponse.status);
    
    const { dados_extraidos, classificacao_sugerida, response_message } = extractResponse.data;

    if (response_message) {
      console.log('📤 Enviando resposta ao usuário...');
      await sendWhatsAppMessage(phoneNumber, response_message);
      console.log('✅ Resposta enviada');
    }

  } catch (error) {
    console.error('❌ Erro ao processar com IA:', error.message);
    console.error('   Stack completo:', error.stack);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data));
    }
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

async function transcribeAudio(audioBase64) {
  try {
    // Send to backend for transcription
    const response = await axios.post(
      `${BACKEND_URL}/api/whatsapp/transcribe`,
      { audio_base64: audioBase64 },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-WhatsApp-Service': 'internal-service-key-123'
        },
        timeout: 60000 // 60 seconds for audio processing
      }
    );
    
    return response.data.transcription;
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error.message);
    return null;
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

// Start server - Bind to 0.0.0.0 (IPv4) to ensure compatibility with backend IPv4 connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WhatsApp Service rodando na porta ${PORT} (IPv4: 0.0.0.0)`);
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