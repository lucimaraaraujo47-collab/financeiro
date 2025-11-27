import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Transacoes({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [transacoesFiltradas, setTransacoesFiltradas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [contas, setContas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTransferencia, setShowTransferencia] = useState(false);
  const [filtros, setFiltros] = useState({
    categoria_id: '',
    centro_custo_id: '',
    conta_bancaria_id: '',
    fornecedor_id: '',
    tipo: '',
    status: ''
  });
  const [formData, setFormData] = useState({
    tipo: 'despesa',
    fornecedor: '',
    fornecedor_id: '',
    cnpj_cpf: '',
    descricao: '',
    valor_total: '',
    data_competencia: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    categoria_id: '',
    centro_custo_id: '',
    metodo_pagamento: 'dinheiro',
    conta_bancaria_id: '',
    cartao_credito_id: '',
    conta_origem: '',
    status: 'pendente',
    origem: 'manual'
  });
  const [formTransferencia, setFormTransferencia] = useState({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    descricao: '',
    data_transferencia: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

        const [transacoesRes, categoriasRes, ccRes, contasRes, cartoesRes, fornecedoresRes] = await Promise.all([
          axios.get(`${API}/empresas/${emp.id}/transacoes`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/categorias`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/centros-custo`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/contas`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/cartoes`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/fornecedores`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setTransacoes(transacoesRes.data);
        setTransacoesFiltradas(transacoesRes.data);
        setCategorias(categoriasRes.data);
        setCentrosCusto(ccRes.data);
        setContas(contasRes.data);
        setCartoes(cartoesRes.data);
        setFornecedores(fornecedoresRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa) return;

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...formData,
        valor_total: parseFloat(formData.valor_total)
      };

      await axios.post(`${API}/empresas/${empresa.id}/transacoes`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Transação cadastrada com sucesso!');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Erro ao cadastrar transação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'despesa',
      fornecedor: '',
      fornecedor_id: '',
      cnpj_cpf: '',
      descricao: '',
      valor_total: '',
      data_competencia: new Date().toISOString().split('T')[0],
      data_pagamento: '',
      categoria_id: '',
      centro_custo_id: '',
      metodo_pagamento: '',
      conta_bancaria_id: '',
      cartao_credito_id: '',
      conta_origem: '',
      status: 'pendente',
      origem: 'manual'
    });
  };

  // Aplicar filtros localmente
  const aplicarFiltros = () => {
    let resultado = [...transacoes];

    if (filtros.categoria_id) {
      resultado = resultado.filter(t => t.categoria_id === filtros.categoria_id);
    }
    if (filtros.centro_custo_id) {
      resultado = resultado.filter(t => t.centro_custo_id === filtros.centro_custo_id);
    }
    if (filtros.conta_bancaria_id) {
      resultado = resultado.filter(t => t.conta_bancaria_id === filtros.conta_bancaria_id);
    }
    if (filtros.fornecedor_id) {
      resultado = resultado.filter(t => t.fornecedor_id === filtros.fornecedor_id);
    }
    if (filtros.tipo) {
      resultado = resultado.filter(t => t.tipo === filtros.tipo);
    }
    if (filtros.status) {
      resultado = resultado.filter(t => t.status === filtros.status);
    }

    setTransacoesFiltradas(resultado);
  };

  const limparFiltros = () => {
    setFiltros({
      categoria_id: '',
      centro_custo_id: '',
      conta_bancaria_id: '',
      fornecedor_id: '',
      tipo: '',
      status: ''
    });
    setTransacoesFiltradas(transacoes);
  };

  // Quando fornecedor é selecionado, preencher os dados automaticamente
  const handleFornecedorChange = (fornecedorId) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (fornecedor) {
      setFormData({
        ...formData,
        fornecedor_id: fornecedorId,
        fornecedor: fornecedor.nome,
        cnpj_cpf: fornecedor.cnpj || ''
      });
    } else {
      setFormData({
        ...formData,
        fornecedor_id: '',
        fornecedor: '',
        cnpj_cpf: ''
      });
    }
  };

  // Atualizar transações filtradas quando transações ou filtros mudam
  useEffect(() => {
    aplicarFiltros();
  }, [filtros, transacoes]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta transação?')) return;

    try {
      await axios.delete(`${API}/transacoes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Transação deletada com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar transação');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/transacoes/${id}/status`, 
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage(`Status atualizado para ${newStatus}!`);
      loadData();
    } catch (error) {
      setMessage('Erro ao atualizar status');
    }
  };

  const handleTransferencia = async (e) => {
    e.preventDefault();
    if (!empresa) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(
        `${API}/empresas/${empresa.id}/transferencias`,
        {
          ...formTransferencia,
          valor: parseFloat(formTransferencia.valor)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`✅ ${response.data.message}`);
      setShowTransferencia(false);
      setFormTransferencia({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        descricao: '',
        data_transferencia: new Date().toISOString().split('T')[0]
      });
      loadData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || error.message));
      setTimeout(() => setMessage(''), 5000);
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

  if (!empresa) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-text">Nenhuma empresa cadastrada</div>
          <div className="empty-state-subtext">Configure sua empresa primeiro</div>
        </div>
      </div>
    );
  }

  const getCategoriaName = (id) => {
    const cat = categorias.find(c => c.id === id);
    return cat ? cat.nome : '-';
  };

  const getCentroCustoName = (id) => {
    const cc = centrosCusto.find(c => c.id === id);
    return cc ? cc.nome : '-';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Transações</h1>
        <p className="dashboard-subtitle">Gerencie receitas e despesas</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Minhas Transações</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-success" 
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) setShowTransferencia(false);
              }}
              data-testid="toggle-transacao-form-button"
            >
              {showForm ? 'Cancelar' : '+ Nova Transação'}
            </button>
            
            {contas.length >= 2 && !showForm && (
              <button 
                className="btn-primary" 
                onClick={() => {
                  setShowTransferencia(!showTransferencia);
                  setShowForm(false);
                }}
                data-testid="toggle-transferencia-button"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {showTransferencia ? 'Cancelar' : '🔄 Transferir Entre Contas'}
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1.5rem', 
          background: 'var(--card-bg)', 
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>🔍 Filtros</h3>
            <button 
              type="button"
              onClick={limparFiltros}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Limpar Filtros
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Categoria</label>
              <select 
                className="form-select"
                value={filtros.categoria_id}
                onChange={(e) => setFiltros({...filtros, categoria_id: e.target.value})}
              >
                <option value="">Todas</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Centro de Custo</label>
              <select 
                className="form-select"
                value={filtros.centro_custo_id}
                onChange={(e) => setFiltros({...filtros, centro_custo_id: e.target.value})}
              >
                <option value="">Todos</option>
                {centrosCusto.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Conta</label>
              <select 
                className="form-select"
                value={filtros.conta_bancaria_id}
                onChange={(e) => setFiltros({...filtros, conta_bancaria_id: e.target.value})}
              >
                <option value="">Todas</option>
                {contas.map(conta => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Fornecedor</label>
              <select 
                className="form-select"
                value={filtros.fornecedor_id}
                onChange={(e) => setFiltros({...filtros, fornecedor_id: e.target.value})}
              >
                <option value="">Todos</option>
                {fornecedores.map(forn => (
                  <option key={forn.id} value={forn.id}>{forn.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Tipo</label>
              <select 
                className="form-select"
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Status</label>
              <select 
                className="form-select"
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="conciliada">Conciliada</option>
                <option value="contestada">Contestada</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Mostrando {transacoesFiltradas.length} de {transacoes.length} transações
          </div>
        </div>

        {showTransferencia && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '2rem', 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
            borderRadius: '12px',
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1)'
          }}>
            <h3 style={{ 
              color: '#1e40af', 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '2rem' }}>🔄</span>
              Transferência Entre Contas
            </h3>
            <form onSubmit={handleTransferencia}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Conta de Origem *</label>
                  <select 
                    className="form-select" 
                    value={formTransferencia.conta_origem_id}
                    onChange={(e) => setFormTransferencia({...formTransferencia, conta_origem_id: e.target.value})}
                    required
                    data-testid="transferencia-origem-select"
                  >
                    <option value="">Selecione a conta de origem</option>
                    {contas.map(conta => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome} - {conta.banco} (Saldo: {formatCurrency(conta.saldo_atual || 0)})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Conta de Destino *</label>
                  <select 
                    className="form-select" 
                    value={formTransferencia.conta_destino_id}
                    onChange={(e) => setFormTransferencia({...formTransferencia, conta_destino_id: e.target.value})}
                    required
                    data-testid="transferencia-destino-select"
                  >
                    <option value="">Selecione a conta de destino</option>
                    {contas
                      .filter(c => c.id !== formTransferencia.conta_origem_id)
                      .map(conta => (
                        <option key={conta.id} value={conta.id}>
                          {conta.nome} - {conta.banco} (Saldo: {formatCurrency(conta.saldo_atual || 0)})
                        </option>
                      ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    className="form-input" 
                    value={formTransferencia.valor}
                    onChange={(e) => setFormTransferencia({...formTransferencia, valor: e.target.value})}
                    placeholder="0.00"
                    required 
                    data-testid="transferencia-valor-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Data da Transferência *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formTransferencia.data_transferencia}
                    onChange={(e) => setFormTransferencia({...formTransferencia, data_transferencia: e.target.value})}
                    required 
                    data-testid="transferencia-data-input"
                  />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Descrição *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formTransferencia.descricao}
                    onChange={(e) => setFormTransferencia({...formTransferencia, descricao: e.target.value})}
                    placeholder="Ex: Transferência para conta poupança"
                    required 
                    data-testid="transferencia-descricao-input"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn-success"
                  disabled={loading}
                  data-testid="transferencia-submit-button"
                >
                  {loading ? '⏳ Processando...' : '✅ Realizar Transferência'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowTransferencia(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  data-testid="transacao-tipo-select"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fornecedor/Cliente</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  required
                  data-testid="transacao-fornecedor-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">CNPJ/CPF</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.cnpj_cpf}
                  onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                  placeholder="Opcional"
                  data-testid="transacao-cnpj-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valor Total</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.valor_total}
                  onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                  required
                  placeholder="0.00"
                  data-testid="transacao-valor-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Competência</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.data_competencia}
                  onChange={(e) => setFormData({ ...formData, data_competencia: e.target.value })}
                  required
                  data-testid="transacao-data-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select
                  className="form-select"
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  required
                  data-testid="transacao-categoria-select"
                >
                  <option value="">Selecione...</option>
                  {categorias.filter(c => c.tipo === formData.tipo).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Centro de Custo</label>
                <select
                  className="form-select"
                  value={formData.centro_custo_id}
                  onChange={(e) => setFormData({ ...formData, centro_custo_id: e.target.value })}
                  required
                  data-testid="transacao-centro-custo-select"
                >
                  <option value="">Selecione...</option>
                  {centrosCusto.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pagamento</label>
                <select
                  className="form-select"
                  value={formData.metodo_pagamento}
                  onChange={(e) => setFormData({ ...formData, metodo_pagamento: e.target.value })}
                  data-testid="transacao-metodo-select"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="conta_bancaria">Conta Bancária</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>

              {/* Conta Bancária - Mostrar se método for conta_bancaria, pix, transferencia ou dinheiro */}
              {['conta_bancaria', 'pix', 'transferencia', 'dinheiro'].includes(formData.metodo_pagamento) && (
                <div className="form-group">
                  <label className="form-label">
                    {formData.tipo === 'receita' ? 'Conta de Entrada' : 'Conta de Saída'}
                  </label>
                  <select
                    className="form-select"
                    value={formData.conta_bancaria_id}
                    onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value })}
                    data-testid="transacao-conta-select"
                  >
                    <option value="">Nenhuma (sem vínculo)</option>
                    {contas.map(conta => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome} - {conta.banco} (Saldo: R$ {conta.saldo_atual?.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#9ca3af', marginTop: '0.25rem', display: 'block' }}>
                    {formData.tipo === 'receita' 
                      ? '✅ O valor será creditado nesta conta' 
                      : '⚠️ O valor será debitado desta conta'}
                  </small>
                </div>
              )}

              {/* Cartão de Crédito - Mostrar apenas se método for cartao_credito e tipo for despesa */}
              {formData.metodo_pagamento === 'cartao_credito' && formData.tipo === 'despesa' && (
                <div className="form-group">
                  <label className="form-label">Cartão de Crédito</label>
                  <select
                    className="form-select"
                    value={formData.cartao_credito_id}
                    onChange={(e) => setFormData({ ...formData, cartao_credito_id: e.target.value })}
                    data-testid="transacao-cartao-select"
                  >
                    <option value="">Selecione um cartão...</option>
                    {cartoes.map(cartao => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome} - {cartao.bandeira} (Disponível: R$ {cartao.limite_disponivel?.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#9ca3af', marginTop: '0.25rem', display: 'block' }}>
                    💳 Será incluído na fatura do cartão
                  </small>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descrição</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                  placeholder="Descrição da transação"
                  data-testid="transacao-descricao-input"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ marginTop: '1rem' }}
              data-testid="transacao-submit-button"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Transação'}
            </button>
          </form>
        )}

        {transacoes.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Centro de Custo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody data-testid="transacoes-table">
                {transacoes.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.data_competencia).toLocaleDateString('pt-BR')}</td>
                    <td><span className={`badge badge-${t.tipo}`}>{t.tipo}</span></td>
                    <td>{t.fornecedor}</td>
                    <td>{t.descricao}</td>
                    <td>{getCategoriaName(t.categoria_id)}</td>
                    <td>{getCentroCustoName(t.centro_custo_id)}</td>
                    <td style={{ color: t.tipo === 'receita' ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>
                      R$ {t.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {t.status === 'pendente' && (
                          <button 
                            className="btn-success" 
                            onClick={() => handleStatusChange(t.id, 'concluido')}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                            data-testid={`complete-transacao-${t.id}`}
                          >
                            ✓ Concluir
                          </button>
                        )}
                        {t.status === 'concluido' && (
                          <button 
                            className="btn-warning" 
                            onClick={() => handleStatusChange(t.id, 'pendente')}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                            data-testid={`reopen-transacao-${t.id}`}
                          >
                            ↺ Reabrir
                          </button>
                        )}
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDelete(t.id)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                          data-testid={`delete-transacao-${t.id}`}
                        >
                          🗑 Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-text">Nenhuma transação registrada</div>
            <div className="empty-state-subtext">Cadastre suas primeiras transações</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transacoes;