import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { API } from '../App';
import './WhatsAppReal.css';

function WhatsAppReal({ user, token }) {
  const [status, setStatus] = useState('disconnected');
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data.status);
      setPhoneNumber(response.data.phone_number);

      if (response.data.has_qr && response.data.status === 'qr_ready') {
        fetchQRCode();
      } else if (response.data.status === 'connected') {
        setQrCodeImage(null);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('service_offline');
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.qr) {
        const qrImage = await QRCode.toDataURL(response.data.qr);
        setQrCodeImage(qrImage);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  const handleReconnect = async () => {
    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API}/whatsapp/reconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Reconectando... Aguarde o QR Code.');
      setTimeout(checkStatus, 2000);
    } catch (error) {
      setMessage('Erro ao reconectar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar do WhatsApp?')) return;

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API}/whatsapp/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Desconectado com sucesso!');
      setStatus('disconnected');
      setPhoneNumber(null);
      setQrCodeImage(null);
    } catch (error) {
      setMessage('Erro ao desconectar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '✅',
          text: 'Conectado',
          color: '#10b981',
          description: `Conectado como: ${phoneNumber || 'Carregando...'}`
        };
      case 'qr_ready':
        return {
          icon: '📱',
          text: 'QR Code Pronto',
          color: '#3b82f6',
          description: 'Escaneie o QR Code abaixo com seu WhatsApp'
        };
      case 'connecting':
        return {
          icon: '🔄',
          text: 'Conectando...',
          color: '#f59e0b',
          description: 'Estabelecendo conexão com WhatsApp'
        };
      case 'disconnected':
        return {
          icon: '⚠️',
          text: 'Desconectado',
          color: '#ef4444',
          description: 'Clique em "Conectar" para gerar o QR Code'
        };
      case 'service_offline':
        return {
          icon: '🔴',
          text: 'Serviço Offline',
          color: '#dc2626',
          description: 'O serviço WhatsApp não está respondendo'
        };
      default:
        return {
          icon: '❓',
          text: 'Desconhecido',
          color: '#6b7280',
          description: 'Status desconhecido'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">WhatsApp Real - Conexão</h1>
        <p className="dashboard-subtitle">Conecte seu WhatsApp para receber mensagens reais</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="whatsapp-real-container" data-testid="whatsapp-real-container">
        <div className="connection-status-card">
          <div className="status-header">
            <div className="status-icon" style={{ color: statusInfo.color }}>
              {statusInfo.icon}
            </div>
            <div className="status-info">
              <div className="status-title" style={{ color: statusInfo.color }}>
                {statusInfo.text}
              </div>
              <div className="status-description">{statusInfo.description}</div>
            </div>
          </div>

          {status === 'qr_ready' && qrCodeImage && (
            <div className="qr-code-section" data-testid="qr-code-section">
              <div className="qr-code-container">
                <img src={qrCodeImage} alt="QR Code" className="qr-code-image" />
              </div>
              <div className="qr-instructions">
                <h3>Como conectar:</h3>
                <ol>
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em <strong>Menu</strong> ou <strong>Configurações</strong></li>
                  <li>Toque em <strong>Aparelhos conectados</strong></li>
                  <li>Toque em <strong>Conectar um aparelho</strong></li>
                  <li>Aponte seu celular para esta tela para escanear o código</li>
                </ol>
              </div>
            </div>
          )}

          {status === 'connected' && (
            <div className="connected-info">
              <div className="connected-card">
                <div className="connected-icon">📱</div>
                <div>
                  <div className="connected-label">Número Conectado</div>
                  <div className="connected-number">{phoneNumber}</div>
                </div>
              </div>
              <div className="info-box">
                <strong>✅ Sistema Pronto!</strong>
                <p>Agora você pode receber mensagens no WhatsApp e o FinAI irá processá-las automaticamente!</p>
                <p>Envie uma mensagem como:</p>
                <div className="example-message-box">
                  Paguei conta de luz R$ 450,00 da ENEL hoje
                </div>
              </div>
            </div>
          )}

          <div className="action-buttons">
            {status === 'disconnected' || status === 'service_offline' ? (
              <button
                className="btn-success"
                onClick={handleReconnect}
                disabled={loading}
                data-testid="reconnect-button"
              >
                {loading ? 'Conectando...' : '🔌 Conectar WhatsApp'}
              </button>
            ) : null}

            {status === 'connected' && (
              <button
                className="btn-danger"
                onClick={handleDisconnect}
                disabled={loading}
                data-testid="disconnect-button"
              >
                {loading ? 'Desconectando...' : '🔌 Desconectar'}
              </button>
            )}

            {status === 'qr_ready' && (
              <button
                className="btn-secondary"
                onClick={handleReconnect}
                disabled={loading}
              >
                🔄 Gerar Novo QR Code
              </button>
            )}
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3>ℹ️ Como Funciona</h3>
            <ul>
              <li>Conecte seu WhatsApp escaneando o QR Code</li>
              <li>Envie mensagens com informações de despesas/receitas</li>
              <li>A IA do FinAI extrai os dados automaticamente</li>
              <li>As transações são criadas e classificadas automaticamente</li>
              <li>Você recebe confirmação no WhatsApp</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>💡 Exemplos de Mensagens</h3>
            <div className="examples-list">
              <div className="example-item">
                <strong>Despesa:</strong>
                <p>Paguei conta de internet R$ 199,90 para Vivo hoje</p>
              </div>
              <div className="example-item">
                <strong>Receita:</strong>
                <p>Recebimento de cliente XYZ, R$ 5.000,00, projeto A</p>
              </div>
              <div className="example-item">
                <strong>Com detalhes:</strong>
                <p>Almoço de equipe no restaurante ABC, R$ 280,00, boleto, centro de custo Comercial</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppReal;
