import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Vendas({ user, token }) {
  const [vendas, setVendas] = useState([]);
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [showVendaForm, setShowVendaForm] = useState(false);
  const [showGatewayForm, setShowGatewayForm] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [vendaForm, setVendaForm] = useState({
    empresa_id: '',
    cliente_nome: '',
    cliente_cpf_cnpj: '',
    cliente_email: '',
    cliente_telefone: '',
    valor_total: '',
    descricao: '',
    metodo_pagamento: 'boleto',
    data_vencimento: ''
  });

  const [gatewayForm, setGatewayForm] = useState({
    empresa_id: '',
    gateway: 'asaas',
    api_key: '',
    sandbox_mode: true,
    ativo: true
  });

  useEffect(() => {
    if (user?.empresa_ids && user.empresa_ids.length > 0) {
      const empId = user.empresa_ids[0];
      loadEmpresa(empId);
      loadGateway(empId);
      loadVendas(empId);
      setVendaForm({ ...vendaForm, empresa_id: empId });
      setGatewayForm({ ...gatewayForm, empresa_id: empId });
    }
  }, [user]);

  const loadEmpresa = async (empId) => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const emp = response.data.find(e => e.id === empId);
      setEmpresa(emp);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const loadGateway = async (empId) => {
    try {
      const response = await axios.get(`${API}/gateway/${empId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGatewayConfig(response.data.length > 0 ? response.data[0] : null);
    } catch (error) {
      console.error('Erro ao carregar gateway:', error);
    }
  };

  const loadVendas = async (empId) => {
    try {
      const response = await axios.get(`${API}/vendas/${empId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendas(response.data);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

  const handleGatewaySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post(`${API}/gateway`, gatewayForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Gateway configurado com sucesso!');
      setShowGatewayForm(false);
      loadGateway(gatewayForm.empresa_id);
    } catch (error) {
      setMessage('❌ Erro: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVendaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const dataVencimento = new Date(vendaForm.data_vencimento).toISOString();
      const payload = {
        ...vendaForm,
        valor_total: parseFloat(vendaForm.valor_total),
        data_vencimento: dataVencimento
      };

      await axios.post(`${API}/vendas`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Venda criada com sucesso!');
      setShowVendaForm(false);
      setVendaForm({
        ...vendaForm,
        cliente_nome: '',
        cliente_cpf_cnpj: '',
        cliente_email: '',
        cliente_telefone: '',
        valor_total: '',
        descricao: '',
        data_vencimento: ''
      });
      loadVendas(vendaForm.empresa_id);
    } catch (error) {
      setMessage('❌ Erro: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">💰 Vendas e Cobranças</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!gatewayConfig && (
              <button 
                className="btn-warning"
                onClick={() => setShowGatewayForm(!showGatewayForm)}
              >
                ⚙️ Configurar Gateway
              </button>
            )}
            {gatewayConfig && (
              <button 
                className="btn-success"
                onClick={() => setShowVendaForm(!showVendaForm)}
              >
                {showVendaForm ? '✖️ Cancelar' : '➕ Nova Venda'}
              </button>
            )}
          </div>
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

        {/* Aviso de Gateway não configurado */}
        {!gatewayConfig && !showGatewayForm && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: '#fff3cd',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
            <h3 style={{ marginBottom: '0.5rem' }}>Gateway de Pagamento Não Configurado</h3>
            <p style={{ color: '#856404', marginBottom: '1.5rem' }}>
              Configure seu gateway de pagamento (Asaas, Mercado Pago ou PagSeguro) para começar a emitir cobranças.
            </p>
            <button 
              className="btn-primary"
              onClick={() => setShowGatewayForm(true)}
            >
              ⚙️ Configurar Agora
            </button>
          </div>
        )}

        {/* Formulário de Configuração de Gateway */}
        {showGatewayForm && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleGatewaySubmit}>
              <h3 style={{ marginBottom: '1.5rem' }}>⚙️ Configurar Gateway de Pagamento</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Gateway *</label>
                  <select
                    className="form-input"
                    value={gatewayForm.gateway}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, gateway: e.target.value })}
                    required
                  >
                    <option value="asaas">Asaas</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="pagseguro">PagSeguro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">API Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={gatewayForm.api_key}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, api_key: e.target.value })}
                    required
                    placeholder="Sua chave de API"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={gatewayForm.sandbox_mode}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, sandbox_mode: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <span>🧪 Modo Sandbox (Testes)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Salvando...' : '💾 Salvar Configuração'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowGatewayForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de Nova Venda */}
        {showVendaForm && gatewayConfig && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleVendaSubmit}>
              <h3 style={{ marginBottom: '1.5rem' }}>➕ Nova Venda</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">👤 Nome do Cliente *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vendaForm.cliente_nome}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_nome: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📄 CPF/CNPJ *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vendaForm.cliente_cpf_cnpj}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_cpf_cnpj: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📧 Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={vendaForm.cliente_email}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📱 Telefone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={vendaForm.cliente_telefone}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_telefone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">💵 Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={vendaForm.valor_total}
                    onChange={(e) => setVendaForm({ ...vendaForm, valor_total: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📅 Vencimento *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={vendaForm.data_vencimento}
                    onChange={(e) => setVendaForm({ ...vendaForm, data_vencimento: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">📝 Descrição *</label>
                <textarea
                  className="form-input"
                  value={vendaForm.descricao}
                  onChange={(e) => setVendaForm({ ...vendaForm, descricao: e.target.value })}
                  required
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Criando...' : '💰 Criar Venda'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowVendaForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Vendas */}
        {gatewayConfig && vendas.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: '600' }}>
              📊 Histórico de Vendas
            </h3>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => (
                  <tr key={venda.id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{venda.cliente_nome}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {venda.cliente_cpf_cnpj}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#16a34a' }}>
                      {formatCurrency(venda.valor_total)}
                    </td>
                    <td>{formatDate(venda.data_vencimento)}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '1rem',
                        fontSize: '0.8125rem',
                        backgroundColor: venda.status === 'pago' ? '#dcfce7' : venda.status === 'cancelado' ? '#fee2e2' : '#fef3c7',
                        color: venda.status === 'pago' ? '#16a34a' : venda.status === 'cancelado' ? '#dc2626' : '#d97706'
                      }}>
                        {venda.status}
                      </span>
                    </td>
                    <td>
                      {venda.boleto_url && (
                        <a 
                          href={venda.boleto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        >
                          📄 Ver Boleto
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {gatewayConfig && vendas.length === 0 && !showVendaForm && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-text">Nenhuma venda registrada</div>
            <div className="empty-state-subtext">Crie sua primeira venda</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Vendas;
