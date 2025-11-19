import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ConfiguracoesBackup({ token }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [backupHistory, setBackupHistory] = useState([]);

  useEffect(() => {
    loadStatus();
    loadBackupHistory();
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
      setMessage('Erro ao carregar status do backup');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupHistory = async () => {
    try {
      // Load last backups from local storage or API
      const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
      setBackupHistory(history.slice(0, 10)); // Last 10 backups
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const createBackup = async () => {
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
        size: response.data.size
      };
      
      const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
      history.unshift(newBackup);
      localStorage.setItem('backup_history', JSON.stringify(history.slice(0, 10)));
      
      setMessage('✅ Backup baixado com sucesso! Arquivo: ' + filename);
      await loadBackupHistory();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error creating backup:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      setMessage('❌ Erro ao criar backup: ' + errorMsg);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setCreating(false);
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

      {/* Ação Principal */}
      <div className="content-card" style={{ marginBottom: '24px', textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💾</div>
        <h2 style={{ fontSize: '24px', marginBottom: '1rem' }}>Criar Backup Agora</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Gere um backup completo de todos os seus dados (transações, clientes, vendas, CRM, estoque) 
          em formato JSON e baixe diretamente para o seu computador.
        </p>
        <button
          onClick={createBackup}
          disabled={creating}
          className="btn-success"
          style={{
            fontSize: '18px',
            padding: '16px 48px',
            minHeight: '56px'
          }}
        >
          {creating ? '⏳ Gerando Backup...' : '📥 Baixar Backup Completo'}
        </button>
      </div>

      {/* Histórico */}
      {backupHistory.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📋 Histórico de Backups</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup, idx) => (
                  <tr key={idx}>
                    <td>{backup.filename}</td>
                    <td>{new Date(backup.date).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="content-card" style={{ background: '#f0f9ff', border: '2px solid #3b82f6' }}>
        <h2 className="card-title" style={{ color: '#1e40af' }}>ℹ️ Informações Importantes</h2>
        <div style={{ color: '#1e40af', lineHeight: '1.8' }}>
          <p><strong>📊 O que está incluído no backup:</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Todas as transações financeiras</li>
            <li>Contas bancárias, investimentos e cartões</li>
            <li>Clientes, fornecedores e locais</li>
            <li>Equipamentos e movimentações de estoque</li>
            <li>Todos os dados do CRM (contatos, conversas, funil)</li>
            <li>Vendas, planos e faturas</li>
            <li>Empresas, usuários e configurações</li>
          </ul>
          
          <p style={{ marginTop: '16px' }}><strong>💡 Dicas:</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Faça backups regulares (recomendado: semanalmente)</li>
            <li>Guarde os arquivos de backup em local seguro</li>
            <li>Mantenha múltiplas cópias em locais diferentes</li>
            <li>O arquivo está em formato JSON e pode ser restaurado quando necessário</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesBackup;
