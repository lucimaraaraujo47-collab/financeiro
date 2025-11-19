import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ConfiguracoesBackup({ token }) {
  const [status, setStatus] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [backupHistory, setBackupHistory] = useState([]);

  useEffect(() => {
    loadStatus();
    loadDriveStatus();
    loadBackupHistory();
    
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === 'true') {
      setMessage('✅ Google Drive conectado com sucesso!');
      loadDriveStatus();
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('drive_error')) {
      setMessage('❌ Erro ao conectar Google Drive: ' + params.get('drive_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/backup/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (error) {
      console.error('Error loading backup status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriveStatus = async () => {
    try {
      const response = await axios.get(`${API}/oauth/drive/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriveStatus(response.data);
    } catch (error) {
      console.error('Error loading drive status:', error);
    }
  };

  const loadBackupHistory = async () => {
    try {
      const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
      setBackupHistory(history.slice(0, 10));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const connectDrive = async () => {
    try {
      const response = await axios.get(`${API}/oauth/drive/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect to Google OAuth
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error('Error connecting drive:', error);
      setMessage('❌ Erro ao conectar com Google Drive: ' + (error.response?.data?.detail || error.message));
    }
  };

  const disconnectDrive = async () => {
    if (!window.confirm('Deseja realmente desconectar o Google Drive?')) return;
    
    try {
      await axios.delete(`${API}/oauth/drive/disconnect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Google Drive desconectado com sucesso');
      loadDriveStatus();
    } catch (error) {
      setMessage('❌ Erro ao desconectar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const createLocalBackup = async () => {
    try {
      setCreating(true);
      setMessage('⏳ Gerando backup...');
      
      const response = await axios.post(`${API}/backup/download`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `backup_echoshop_${timestamp}.json`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Save to history
      const newBackup = {
        filename,
        date: new Date().toISOString(),
        type: 'local'
      };
      
      const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
      history.unshift(newBackup);
      localStorage.setItem('backup_history', JSON.stringify(history.slice(0, 10)));
      
      setMessage('✅ Backup baixado com sucesso! Arquivo: ' + filename);
      await loadBackupHistory();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage('❌ Erro ao criar backup: ' + (error.response?.data?.detail || error.message));
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setCreating(false);
    }
  };

  const uploadToDrive = async () => {
    try {
      setUploading(true);
      setMessage('⏳ Enviando backup para Google Drive...');
      
      const response = await axios.post(`${API}/backup/upload-to-drive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Save to history
      const newBackup = {
        filename: response.data.file.name,
        date: new Date().toISOString(),
        type: 'drive',
        link: response.data.file.link
      };
      
      const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
      history.unshift(newBackup);
      localStorage.setItem('backup_history', JSON.stringify(history.slice(0, 10)));
      
      setMessage(`✅ ${response.data.message}`);
      await loadBackupHistory();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error uploading to drive:', error);
      setMessage('❌ Erro ao enviar para Drive: ' + (error.response?.data?.detail || error.message));
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-screen">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📦 Sistema de Backup</h1>
        <p className="dashboard-subtitle">Faça backup de todos os seus dados facilmente</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Google Drive Connection Card */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">☁️ Conexão com Google Drive</h2>
        <div style={{ padding: '1.5rem' }}>
          {!driveStatus?.connected ? (
            <div>
              <div style={{ 
                padding: '2rem', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: 'white',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔗</div>
                <h3 style={{ fontSize: '20px', marginBottom: '0.5rem' }}>Conecte seu Google Drive</h3>
                <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>
                  Faça login com sua conta Google e seus backups serão salvos automaticamente no seu Drive
                </p>
                <button
                  onClick={connectDrive}
                  style={{
                    background: 'white',
                    color: '#667eea',
                    border: 'none',
                    padding: '12px 32px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🔐</span> Conectar com Google
                </button>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: '#f0f9ff',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1e40af'
              }}>
                <strong>Como funciona:</strong>
                <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
                  <li>Clique em "Conectar com Google"</li>
                  <li>Faça login com seu email e senha do Google</li>
                  <li>Autorize o app a acessar seu Drive</li>
                  <li>Pronto! Seus backups serão salvos automaticamente</li>
                </ol>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ 
                padding: '1.5rem', 
                background: '#dcfce7',
                borderRadius: '12px',
                border: '2px solid #22c55e',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                      ✅ Google Drive Conectado
                    </div>
                    {driveStatus.email && (
                      <div style={{ fontSize: '14px', color: '#15803d' }}>
                        Conta: {driveStatus.email}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={disconnectDrive}
                    className="btn-danger"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup Actions */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">💾 Criar Backup</h2>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          
          {/* Local Download */}
          <div style={{ 
            padding: '1.5rem', 
            background: '#f3f4f6',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '1rem' }}>💾</div>
            <h3 style={{ fontSize: '18px', marginBottom: '0.5rem' }}>Download Local</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '1.5rem' }}>
              Baixar backup em JSON para seu computador
            </p>
            <button
              onClick={createLocalBackup}
              disabled={creating}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {creating ? '⏳ Gerando...' : '📥 Baixar Backup'}
            </button>
          </div>

          {/* Google Drive Upload */}
          <div style={{ 
            padding: '1.5rem', 
            background: driveStatus?.connected ? '#f0fdf4' : '#f9fafb',
            borderRadius: '12px',
            border: `2px solid ${driveStatus?.connected ? '#22c55e' : '#d1d5db'}`,
            textAlign: 'center',
            opacity: driveStatus?.connected ? 1 : 0.6
          }}>
            <div style={{ fontSize: '40px', marginBottom: '1rem' }}>☁️</div>
            <h3 style={{ fontSize: '18px', marginBottom: '0.5rem' }}>Enviar para Drive</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '1.5rem' }}>
              {driveStatus?.connected 
                ? 'Salvar backup no seu Google Drive' 
                : 'Conecte o Google Drive primeiro'}
            </p>
            <button
              onClick={uploadToDrive}
              disabled={uploading || !driveStatus?.connected}
              className="btn-success"
              style={{ width: '100%' }}
            >
              {uploading ? '⏳ Enviando...' : '☁️ Enviar para Drive'}
            </button>
          </div>
        </div>
      </div>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📋 Histórico de Backups</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Arquivo</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="badge">
                        {backup.type === 'drive' ? '☁️ Drive' : '💾 Local'}
                      </span>
                    </td>
                    <td>{backup.filename}</td>
                    <td>{new Date(backup.date).toLocaleString('pt-BR')}</td>
                    <td>
                      {backup.link && (
                        <a 
                          href={backup.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ fontSize: '12px', padding: '4px 12px', textDecoration: 'none' }}
                        >
                          Ver no Drive
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="content-card" style={{ background: '#f0f9ff', border: '2px solid #3b82f6' }}>
        <h2 className="card-title" style={{ color: '#1e40af' }}>ℹ️ O que está incluído no backup?</h2>
        <div style={{ color: '#1e40af', lineHeight: '1.8', padding: '1rem' }}>
          <ul style={{ marginLeft: '20px' }}>
            <li>📊 Todas as transações financeiras</li>
            <li>🏦 Contas bancárias, investimentos e cartões</li>
            <li>👥 Clientes, fornecedores e locais</li>
            <li>📦 Equipamentos e movimentações de estoque</li>
            <li>💼 Todos os dados do CRM (contatos, conversas, funil)</li>
            <li>🛒 Vendas, planos e assinaturas</li>
            <li>🏢 Empresas, usuários e configurações</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesBackup;
