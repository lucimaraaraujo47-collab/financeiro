import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function VendasServico({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    cliente_id: '',
    plano_id: '',
    forma_pagamento: 'pix',
    dia_vencimento: 10,
    observacoes: ''
  });
  const [novoCliente, setNovoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const statusLabels = {
    aguardando_contrato: { label: 'Aguardando Contrato', color: '#f59e0b', icon: '📝' },
    aguardando_instalacao: { label: 'Aguardando Instalação', color: '#3b82f6', icon: '📦' },
    ativo: { label: 'Ativo', color: '#10b981', icon: '✅' },
    suspenso: { label: 'Suspenso', color: '#ef4444', icon: '⚠️' },
    cancelado: { label: 'Cancelado', color: '#6b7280', icon: '❌' }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (empresasRes.data.length > 0) {
        const emp = empresasRes.data[0];
        setEmpresa(emp);
        
        const [vendasRes, clientesRes, planosRes] = await Promise.all([
          axios.get(`${API}/empresas/${emp.id}/vendas-servico`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/clientes-venda`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/planos-servico`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setVendas(vendasRes.data || []);
        setClientes(clientesRes.data || []);
        setPlanos(planosRes.data?.filter(p => p.ativo) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('❌ Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa) return;

    try {
      setLoading(true);
      let clienteId = formData.cliente_id;

      // Se for novo cliente, criar primeiro
      if (novoCliente) {
        const clienteRes = await axios.post(`${API}/empresas/${empresa.id}/clientes-venda`, clienteForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        clienteId = clienteRes.data.id;
      }

      // Criar venda
      const vendaRes = await axios.post(`${API}/empresas/${empresa.id}/vendas-servico`, {
        ...formData,
        cliente_id: clienteId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(`✅ ${vendaRes.data.message} OS: ${vendaRes.data.os_numero}`);
      setShowForm(false);
      resetForms();
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao criar venda'));
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setFormData({
      cliente_id: '',
      plano_id: '',
      forma_pagamento: 'pix',
      dia_vencimento: 10,
      observacoes: ''
    });
    setClienteForm({
      nome_completo: '',
      cpf: '',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    });
    setNovoCliente(false);
  };

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!res.data.erro) {
          setClienteForm({
            ...clienteForm,
            cep: cepLimpo,
            logradouro: res.data.logradouro,
            bairro: res.data.bairro,
            cidade: res.data.localidade,
            estado: res.data.uf
          });
        }
      } catch (e) {
        console.error('Erro ao buscar CEP');
      }
    }
  };

  const loadDetalhes = async (vendaId) => {
    try {
      const res = await axios.get(`${API}/vendas-servico/${vendaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDetalhes(res.data);
    } catch (error) {
      setMessage('❌ Erro ao carregar detalhes');
    }
  };

  const planoSelecionado = planos.find(p => p.id === formData.plano_id);

  if (loading && !empresa) {
    return <div className="dashboard"><div className="loading-screen">Carregando...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">💼 Vendas de Serviço</h1>
        <p className="dashboard-subtitle">Realize vendas com geração automática de contrato e OS</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhes && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Detalhes da Venda</h2>
              <button onClick={() => setShowDetalhes(null)} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>👤 Cliente</h4>
                <p><strong>Nome:</strong> {showDetalhes.cliente?.nome_completo}</p>
                <p><strong>CPF:</strong> {showDetalhes.cliente?.cpf}</p>
                <p><strong>Telefone:</strong> {showDetalhes.cliente?.telefone}</p>
                <p><strong>Email:</strong> {showDetalhes.cliente?.email}</p>
              </div>
              
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>📋 Plano</h4>
                <p><strong>Nome:</strong> {showDetalhes.plano?.nome}</p>
                <p><strong>Valor:</strong> R$ {showDetalhes.plano?.valor?.toFixed(2)}</p>
                <p><strong>Periodicidade:</strong> {showDetalhes.plano?.periodicidade}</p>
              </div>
              
              {showDetalhes.contrato && (
                <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                  <h4 style={{ marginTop: 0, color: '#92400e' }}>📝 Contrato</h4>
                  <p><strong>Status:</strong> {showDetalhes.contrato.status}</p>
                  <p><strong>Início:</strong> {showDetalhes.contrato.data_inicio}</p>
                  {showDetalhes.contrato.data_fim_fidelidade && (
                    <p><strong>Fim Fidelidade:</strong> {showDetalhes.contrato.data_fim_fidelidade}</p>
                  )}
                </div>
              )}
              
              {showDetalhes.os_instalacao && (
                <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '8px' }}>
                  <h4 style={{ marginTop: 0, color: '#1e40af' }}>🛠️ Ordem de Serviço</h4>
                  <p><strong>Número:</strong> {showDetalhes.os_instalacao.numero}</p>
                  <p><strong>Status:</strong> {showDetalhes.os_instalacao.status}</p>
                  <p><strong>Tipo:</strong> {showDetalhes.os_instalacao.tipo}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Vendas Realizadas</h2>
          <button
            className="btn-success"
            onClick={() => { setShowForm(!showForm); resetForms(); }}
          >
            {showForm ? 'Cancelar' : '+ Nova Venda'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            {/* Seleção de Cliente */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={!novoCliente ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setNovoCliente(false)}
                >
                  Cliente Existente
                </button>
                <button
                  type="button"
                  className={novoCliente ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setNovoCliente(true)}
                >
                  + Novo Cliente
                </button>
              </div>

              {!novoCliente ? (
                <div className="form-group">
                  <label className="form-label">Selecione o Cliente *</label>
                  <select
                    className="form-select"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo} - {c.cpf}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>👤 Dados do Novo Cliente</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nome Completo *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.nome_completo}
                        onChange={(e) => setClienteForm({ ...clienteForm, nome_completo: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CPF *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.cpf}
                        onChange={(e) => setClienteForm({ ...clienteForm, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={clienteForm.email}
                        onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Telefone *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={clienteForm.telefone}
                        onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CEP *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.cep}
                        onChange={(e) => {
                          setClienteForm({ ...clienteForm, cep: e.target.value });
                          buscarCep(e.target.value);
                        }}
                        placeholder="00000-000"
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Logradouro *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.logradouro}
                        onChange={(e) => setClienteForm({ ...clienteForm, logradouro: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Número *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.numero}
                        onChange={(e) => setClienteForm({ ...clienteForm, numero: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Complemento</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.complemento}
                        onChange={(e) => setClienteForm({ ...clienteForm, complemento: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bairro *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.bairro}
                        onChange={(e) => setClienteForm({ ...clienteForm, bairro: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cidade *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.cidade}
                        onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })}
                        required={novoCliente}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={clienteForm.estado}
                        onChange={(e) => setClienteForm({ ...clienteForm, estado: e.target.value })}
                        maxLength="2"
                        required={novoCliente}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seleção de Plano */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>📋 Selecione o Plano</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {planos.map(plano => (
                  <div
                    key={plano.id}
                    onClick={() => setFormData({ ...formData, plano_id: plano.id })}
                    style={{
                      padding: '1rem',
                      border: formData.plano_id === plano.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: formData.plano_id === plano.id ? '#eff6ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{plano.nome}</h4>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                          {plano.periodicidade}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                          R$ {plano.valor.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {plano.tem_contrato && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        background: '#fef3c7',
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>
                        📝 {plano.prazo_fidelidade_meses} meses de fidelidade
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento *</label>
                <select
                  className="form-select"
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                >
                  <option value="pix">🟢 PIX</option>
                  <option value="boleto">📝 Boleto</option>
                  <option value="cartao">💳 Cartão</option>
                  <option value="dinheiro">💵 Dinheiro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dia de Vencimento</label>
                <select
                  className="form-select"
                  value={formData.dia_vencimento}
                  onChange={(e) => setFormData({ ...formData, dia_vencimento: parseInt(e.target.value) })}
                >
                  {[1, 5, 10, 15, 20, 25].map(d => (
                    <option key={d} value={d}>Dia {d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows="2"
                  placeholder="Observações sobre a venda..."
                />
              </div>
            </div>

            {/* Resumo */}
            {planoSelecionado && (
              <div style={{
                padding: '1rem',
                background: '#ecfdf5',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #10b981'
              }}>
                <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#065f46' }}>✅ Resumo da Venda</h4>
                <p style={{ margin: 0 }}>
                  <strong>Plano:</strong> {planoSelecionado.nome} | 
                  <strong> Valor:</strong> R$ {planoSelecionado.valor.toFixed(2)}/{planoSelecionado.periodicidade}
                  {planoSelecionado.tem_contrato && (
                    <span> | <strong>Contrato:</strong> {planoSelecionado.prazo_fidelidade_meses} meses</span>
                  )}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#047857' }}>
                  ➜ Será gerada automaticamente uma OS de instalação
                  {planoSelecionado.tem_contrato && ' e o contrato para assinatura'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-success" disabled={!formData.plano_id || (!formData.cliente_id && !novoCliente)}>
                💾 Finalizar Venda
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForms(); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de Vendas */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Cliente</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Plano</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Valor</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Data</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map(venda => {
                const statusInfo = statusLabels[venda.status] || { label: venda.status, color: '#6b7280', icon: '❓' };
                return (
                  <tr key={venda.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{venda.cliente_nome}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{venda.plano_nome}</td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#059669' }}>
                      R$ {venda.valor_venda?.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.75rem',
                        background: `${statusInfo.color}20`,
                        color: statusInfo.color,
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>
                      {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => loadDetalhes(venda.id)}
                      >
                        👁️ Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {vendas.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💼</div>
            <div className="empty-state-text">Nenhuma venda realizada</div>
            <div className="empty-state-subtext">Realize sua primeira venda de serviço</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendasServico;