import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Assinaturas({ user, token }) {
  const [assinaturas, setAssinaturas] = useState([]);
  const [planos, setPlanos] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState('');
  const [novaAssinatura, setNovaAssinatura] = useState(null);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    plano: 'basico'
  });

  useEffect(() => {
    loadPlanos();
    loadAssinaturas();
  }, []);

  const loadPlanos = async () => {
    try {
      const response = await axios.get(`${API}/assinaturas/planos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanos(response.data);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const loadAssinaturas = async () => {
    setLoadingList(true);
    try {
      const response = await axios.get(`${API}/assinaturas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssinaturas(response.data);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API}/assinaturas`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNovaAssinatura(response.data);
      setMessage('✅ Assinatura criada com sucesso! Aguardando pagamento PIX.');
      setShowForm(false);
      loadAssinaturas();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      setMessage('❌ Erro: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const verificarPagamento = async (assinaturaId) => {
    setVerificandoPagamento(true);
    try {
      const response = await axios.post(
        `${API}/assinaturas/${assinaturaId}/verificar-pagamento`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.status === 'pago') {
        setMessage('✅ Pagamento confirmado! Acesso liberado.');
        setNovaAssinatura(null);
        loadAssinaturas();
      } else {
        setMessage('⏳ Aguardando pagamento...');
      }
    } catch (error) {
      setMessage('❌ Erro ao verificar pagamento');
    } finally {
      setVerificandoPagamento(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'aguardando_pagamento': { bg: '#fff3cd', color: '#856404', text: '⏳ Aguardando Pagamento' },
      'ativa': { bg: '#d4edda', color: '#155724', text: '✅ Ativa' },
      'suspensa': { bg: '#f8d7da', color: '#721c24', text: '🚫 Suspensa' },
      'cancelada': { bg: '#e2e3e5', color: '#383d41', text: '❌ Cancelada' }
    };
    const style = styles[status] || styles['aguardando_pagamento'];
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container">
      {/* Modal PIX */}
      {novaAssinatura && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
              💳 Pagamento PIX
            </h2>
            
            <div style={{
              backgroundColor: '#e8f5e9',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: 0, textAlign: 'center' }}>
                <strong>Plano:</strong> {planos[novaAssinatura.plano]?.nome}<br />
                <strong>Valor:</strong> {formatCurrency(novaAssinatura.valor)}
              </p>
            </div>

            {novaAssinatura.pix_qrcode && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img 
                  src={`data:image/png;base64,${novaAssinatura.pix_qrcode}`}
                  alt="QR Code PIX"
                  style={{ maxWidth: '250px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>
            )}

            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: '#666' }}>
                Código PIX (copie e cole):
              </p>
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="text"
                  value={novaAssinatura.pix_codigo || ''}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(novaAssinatura.pix_codigo);
                    setMessage('✅ Código copiado!');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Copiar
                </button>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff3e0',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>📧 Credenciais Enviadas</h4>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>Email:</strong> {novaAssinatura.user_email}<br />
                <strong>Senha:</strong> {novaAssinatura.user_senha}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => verificarPagamento(novaAssinatura.assinatura_id)}
                disabled={verificandoPagamento}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {verificandoPagamento ? '⏳ Verificando...' : '🔄 Verificar Pagamento'}
              </button>
              <button
                onClick={() => setNovaAssinatura(null)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🛒 Assinaturas SaaS</h2>
          <button 
            className="btn-success"
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {showForm ? '✖️ Cancelar' : '➕ Nova Assinatura'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            margin: '1rem 0',
            borderRadius: '8px',
            backgroundColor: message.includes('✅') ? '#d4edda' : message.includes('⏳') ? '#fff3cd' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : message.includes('⏳') ? '#856404' : '#721c24',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : message.includes('⏳') ? '#ffeeba' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}

        {/* Formulário de Nova Assinatura */}
        {showForm && (
          <div style={{
            marginTop: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleSubmit}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                ➕ Nova Assinatura
              </h3>

              {/* Seleção de Plano */}
              <div style={{ marginBottom: '2rem' }}>
                <label className="form-label">📦 Selecione o Plano *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {Object.entries(planos).map(([key, plano]) => (
                    <div
                      key={key}
                      onClick={() => setFormData({ ...formData, plano: key })}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: formData.plano === key ? '2px solid #667eea' : '2px solid #e2e8f0',
                        backgroundColor: formData.plano === key ? '#f0f4ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#667eea' }}>{plano.nome}</h4>
                      <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>
                        {formatCurrency(plano.valor)}<span style={{ fontSize: '0.875rem', fontWeight: '400' }}>/mês</span>
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 1rem 0' }}>{plano.descricao}</p>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#666' }}>
                        {plano.recursos?.map((recurso, i) => (
                          <li key={i} style={{ marginBottom: '0.25rem' }}>✓ {recurso}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dados da Empresa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">🏢 Razão Social / Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    required
                    placeholder="Nome da empresa ou pessoa"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📄 CNPJ / CPF *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cnpj_cpf}
                    onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    required
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📧 Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="email@empresa.com"
                  />
                  <small style={{ color: '#666', fontSize: '0.75rem' }}>
                    Este será o login do cliente
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">📱 Telefone *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    required
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <strong>ℹ️ O que acontece ao finalizar:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
                  <li>✅ Empresa e usuário são criados automaticamente</li>
                  <li>✅ Email com credenciais é enviado ao cliente</li>
                  <li>✅ PIX é gerado para o primeiro pagamento</li>
                  <li>✅ Boletos são gerados automaticamente para os próximos meses</li>
                </ul>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  {loading ? '⏳ Processando...' : '✅ Finalizar Assinatura'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  style={{ padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  ✖️ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Assinaturas */}
        <div style={{ marginTop: '2rem' }}>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>Carregando assinaturas...</p>
            </div>
          ) : assinaturas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <div className="empty-state-text">Nenhuma assinatura cadastrada</div>
              <div className="empty-state-subtext">Clique em "Nova Assinatura" para começar</div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                📋 Assinaturas ({assinaturas.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Cliente</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>CNPJ/CPF</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Plano</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Vencimento</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Vendedor</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assinaturas.map((assinatura) => (
                      <tr 
                        key={assinatura.id}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '500' }}>{assinatura.razao_social}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{assinatura.email}</div>
                        </td>
                        <td style={{ padding: '1rem', color: '#666' }}>{assinatura.cnpj_cpf}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: assinatura.plano === 'profissional' ? '#e8f5e9' : '#e3f2fd',
                            color: assinatura.plano === 'profissional' ? '#2e7d32' : '#1565c0',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {planos[assinatura.plano]?.nome || assinatura.plano}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(assinatura.valor_mensal)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {getStatusBadge(assinatura.status)}
                          {assinatura.dias_atraso > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#dc3545', marginTop: '0.25rem' }}>
                              {assinatura.dias_atraso} dias em atraso
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          Dia {assinatura.dia_vencimento}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem' }}>
                          {assinatura.vendedor_nome}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                          {formatDate(assinatura.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Resumo */}
        {assinaturas.length > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4caf50' }}>
                {assinaturas.filter(a => a.status === 'ativa').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Ativas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f57c00' }}>
                {assinaturas.filter(a => a.status === 'aguardando_pagamento').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Aguardando</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc3545' }}>
                {assinaturas.filter(a => a.status === 'suspensa').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Suspensas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                {formatCurrency(assinaturas.filter(a => a.status === 'ativa').reduce((sum, a) => sum + a.valor_mensal, 0))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>MRR</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Assinaturas;
