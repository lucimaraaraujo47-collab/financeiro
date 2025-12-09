import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Licencas({ user, token }) {
  const [licenca, setLicenca] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    empresa_id: '',
    plano: 'basico'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.empresa_ids && user.empresa_ids.length > 0) {
      loadLicenca(user.empresa_ids[0]);
      loadCobrancas(user.empresa_ids[0]);
    }
    if (user?.perfil === 'admin' && user?.email === 'faraujoneto2005@gmail.com') {
      loadEmpresas();
    }
  }, [user]);

  const loadLicenca = async (empresaId) => {
    try {
      const response = await axios.get(`${API}/licencas/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLicenca(response.data);
    } catch (error) {
      console.error('Erro ao carregar licença:', error);
    }
  };

  const loadCobrancas = async (empresaId) => {
    try {
      const response = await axios.get(`${API}/cobrancas/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCobrancas(response.data);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    }
  };

  const loadEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleCreateLicenca = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(
        `${API}/licencas`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            empresa_id: formData.empresa_id,
            plano: formData.plano
          }
        }
      );
      
      setMessage('✅ Licença criada com sucesso!');
      setShowCreateForm(false);
      setFormData({ empresa_id: '', plano: 'basico' });
      loadLicenca(formData.empresa_id);
    } catch (error) {
      setMessage('❌ Erro: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ativa: { bg: '#dcfce7', color: '#16a34a', icon: '✅' },
      bloqueada: { bg: '#fee2e2', color: '#dc2626', icon: '🔒' },
      cancelada: { bg: '#f3f4f6', color: '#6b7280', icon: '❌' }
    };

    const style = styles[status] || styles.ativa;

    return (
      <span style={{
        padding: '0.375rem 0.875rem',
        borderRadius: '2rem',
        fontSize: '0.8125rem',
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}>
        {style.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isAdminMaster = user?.perfil === 'admin' && user?.email === 'faraujoneto2005@gmail.com';

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">💳 Licenciamento e Cobranças</h2>
          {isAdminMaster && (
            <button 
              className="btn-success"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '✖️ Cancelar' : '➕ Nova Licença'}
            </button>
          )}
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            margin: '1rem 0',
            borderRadius: '8px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}

        {/* Formulário de Criação (Admin Master) */}
        {showCreateForm && isAdminMaster && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleCreateLicenca}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                ➕ Criar Nova Licença
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">🏢 Empresa *</label>
                  <select
                    className="form-input"
                    value={formData.empresa_id}
                    onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">📦 Plano *</label>
                  <select
                    className="form-input"
                    value={formData.plano}
                    onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                    required
                  >
                    <option value="basico">Básico - R$ 99,90/mês (sem WhatsApp)</option>
                    <option value="pro">Pro - R$ 139,90/mês (com WhatsApp)</option>
                  </select>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? '⏳ Criando...' : '💳 Criar Licença'}
                </button>
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status da Licença Atual */}
        {licenca && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: '600' }}>
              📋 Status da Licença
            </h3>

            <div style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: licenca.status === 'bloqueada' ? '2px solid #dc2626' : '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Status
                  </div>
                  <div>
                    {getStatusBadge(licenca.status)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Plano
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                    {licenca.plano === 'basico' ? '📦 Básico' : '⭐ Pro'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Valor Mensal
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#16a34a' }}>
                    {formatCurrency(licenca.valor_mensal)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Próximo Vencimento
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                    {formatDate(licenca.data_vencimento)}
                  </div>
                </div>

                {licenca.dias_atraso > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Dias de Atraso
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#dc2626' }}>
                      ⚠️ {licenca.dias_atraso} dias
                    </div>
                  </div>
                )}
              </div>

              {licenca.status === 'bloqueada' && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fee2e2',
                  borderRadius: '8px',
                  color: '#991b1b'
                }}>
                  <strong>🔒 Acesso Bloqueado:</strong> {licenca.motivo_bloqueio || 'Pagamento pendente'}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Regularize seu pagamento para reativar o acesso ao sistema.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico de Cobranças */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: '600' }}>
            📊 Histórico de Cobranças
          </h3>

          {cobrancas.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.map((cobranca) => (
                  <tr key={cobranca.id}>
                    <td>{formatDate(cobranca.data_vencimento)}</td>
                    <td style={{ fontWeight: '600' }}>{formatCurrency(cobranca.valor)}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '1rem',
                        fontSize: '0.8125rem',
                        backgroundColor: cobranca.status === 'pago' ? '#dcfce7' : cobranca.status === 'atrasado' ? '#fee2e2' : '#fef3c7',
                        color: cobranca.status === 'pago' ? '#16a34a' : cobranca.status === 'atrasado' ? '#dc2626' : '#d97706'
                      }}>
                        {cobranca.status}
                      </span>
                    </td>
                    <td>{formatDate(cobranca.data_pagamento)}</td>
                    <td>
                      <span style={{ fontSize: '0.875rem' }}>
                        {cobranca.metodo_pagamento === 'boleto' ? '📄 Boleto' : '💳 PIX'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Nenhuma cobrança registrada</div>
              <div className="empty-state-subtext">Cobranças aparecerão aqui quando geradas</div>
            </div>
          )}
        </div>

        {/* Modo Mock - Aviso */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffc107',
          fontSize: '0.875rem',
          color: '#856404'
        }}>
          <strong>⚠️ Modo de Desenvolvimento:</strong> Sistema configurado com credenciais mock. 
          Substitua as chaves reais no arquivo backend/.env para ativar integração completa com Asaas, Resend e Twilio.
        </div>
      </div>
    </div>
  );
}

export default Licencas;
