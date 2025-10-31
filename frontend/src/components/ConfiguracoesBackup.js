import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ConfiguracoesBackup({ token }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStatus();
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

  const createBackup = async () => {
    try {
      setCreating(true);
      setMessage('');
      const response = await axios.post(`${API}/backup/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Backup criado com sucesso! Arquivo: ' + response.data.file.name);
      await loadStatus();
    } catch (error) {
      console.error('Error creating backup:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      setMessage('❌ Erro ao criar backup: ' + errorMsg);
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
        <h1 className="dashboard-title">📦 Backup Automático</h1>
        <p className="dashboard-subtitle">Gerencie backups do sistema para Google Drive</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Status Card */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">Status da Configuração</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ 
              padding: '20px', 
              background: status?.configured ? '#dcfce7' : '#fee2e2',
              borderRadius: '8px',
              border: `2px solid ${status?.configured ? '#22c55e' : '#ef4444'}`
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                Status
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: status?.configured ? '#16a34a' : '#dc2626' }}>
                {status?.configured ? '✅ Configurado' : '⚠️ Não Configurado'}
              </div>
            </div>

            <div style={{ 
              padding: '20px', 
              background: '#f3f4f6',
              borderRadius: '8px',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                Service Account
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', wordBreak: 'break-all' }}>
                {status?.configured ? '✓ Arquivo encontrado' : '✗ Não encontrado'}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {status?.service_account_path}
              </div>
            </div>

            <div style={{ 
              padding: '20px', 
              background: '#f3f4f6',
              borderRadius: '8px',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                Pasta Google Drive
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {status?.folder_id_configured ? '✓ Configurada' : '✗ Não configurada'}
              </div>
            </div>
          </div>

          {status?.last_backup && (
            <div style={{ 
              marginTop: '24px', 
              padding: '20px', 
              background: '#dbeafe',
              borderRadius: '8px',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '8px', fontWeight: '600' }}>
                📊 Último Backup
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>
                {status.last_backup.name}
              </div>
              <div style={{ fontSize: '14px', color: '#3b82f6', marginTop: '4px' }}>
                Criado em: {new Date(status.last_backup.created_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions Card */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">Ações</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <button
            onClick={createBackup}
            disabled={creating || !status?.configured}
            className="btn-success"
            style={{ 
              width: '100%', 
              padding: '16px',
              fontSize: '16px',
              marginBottom: '12px'
            }}
          >
            {creating ? '⏳ Criando Backup...' : '📦 Criar Backup Manual'}
          </button>
          
          {!status?.configured && (
            <div style={{ 
              padding: '16px', 
              background: '#fef3c7',
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              marginTop: '12px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
                ⚠️ Configure o Google Drive para criar backups
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                Siga as instruções abaixo para configurar o sistema de backup.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automatic Backup Info */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">🔄 Backup Automático</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ 
            padding: '20px', 
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '2px solid #22c55e',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>⏰</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>
                  Agendamento Configurado
                </div>
                <div style={{ fontSize: '14px', color: '#15803d' }}>
                  Backups automáticos todos os dias às 3:00 AM
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
            <strong>O que será salvo no backup:</strong>
            <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
              <li>📊 Todas as transações financeiras</li>
              <li>🏦 Contas bancárias, investimentos e cartões</li>
              <li>👥 Clientes, fornecedores e locais</li>
              <li>📦 Equipamentos e movimentações de estoque</li>
              <li>💼 Todo o CRM (contatos, conversas, automações)</li>
              <li>🏢 Empresas, usuários e configurações</li>
            </ul>
            <div style={{ marginTop: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
              <strong>🧹 Retenção:</strong> Backups com mais de 30 dias são automaticamente deletados
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">📋 Como Configurar o Google Drive</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 1: Google Cloud Console</strong>
              <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>Acesse: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>https://console.cloud.google.com/</a></li>
                <li>Crie um novo projeto ou selecione um existente</li>
                <li>Ative a <strong>Google Drive API</strong></li>
              </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 2: Service Account</strong>
              <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>Vá em <strong>APIs & Services → Credentials</strong></li>
                <li>Clique em <strong>+ CREATE CREDENTIALS → Service account</strong></li>
                <li>Preencha o nome (ex: "backup-service") e clique em <strong>CREATE</strong></li>
                <li>Na aba <strong>KEYS</strong>, clique em <strong>ADD KEY → Create new key</strong></li>
                <li>Selecione <strong>JSON</strong> e clique em <strong>CREATE</strong></li>
                <li>Baixe o arquivo JSON</li>
              </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 3: Upload do Arquivo</strong>
              <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>Faça upload do arquivo JSON para: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>/app/backend/service_account.json</code></li>
              </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 4: Criar Pasta no Drive (Opcional)</strong>
              <ol style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>Crie uma pasta no Google Drive (ex: "ECHO_SHOP_Backups")</li>
                <li>Compartilhe a pasta com o email da service account (encontrado no arquivo JSON)</li>
                <li>Copie o ID da pasta (está na URL)</li>
              </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 5: Configurar Variáveis</strong>
              <div style={{ marginTop: '8px' }}>
                Edite <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>/app/backend/.env</code> e descomente:
              </div>
              <pre style={{ 
                background: '#1f2937', 
                color: '#f3f4f6', 
                padding: '12px', 
                borderRadius: '6px',
                overflow: 'auto',
                marginTop: '8px'
              }}>
{`GOOGLE_SERVICE_ACCOUNT_PATH=/app/backend/service_account.json
GOOGLE_DRIVE_FOLDER_ID=seu-folder-id-aqui`}
              </pre>
            </div>

            <div>
              <strong style={{ fontSize: '16px', color: '#1f2937' }}>Passo 6: Reiniciar Backend</strong>
              <pre style={{ 
                background: '#1f2937', 
                color: '#10b981', 
                padding: '12px', 
                borderRadius: '6px',
                marginTop: '8px'
              }}>
{`sudo supervisorctl restart backend`}
              </pre>
            </div>

            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: '#eff6ff',
              borderRadius: '8px',
              border: '2px solid #3b82f6'
            }}>
              <strong style={{ color: '#1e40af' }}>📖 Documentação Completa:</strong>
              <div style={{ marginTop: '8px', color: '#3b82f6' }}>
                Ver instruções detalhadas em: <code style={{ background: 'white', padding: '2px 6px', borderRadius: '4px' }}>/app/BACKUP_SETUP_INSTRUCTIONS.md</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesBackup;
