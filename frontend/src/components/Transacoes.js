import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Transacoes({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'despesa',
    fornecedor: '',
    cnpj_cpf: '',
    descricao: '',
    valor_total: '',
    data_competencia: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    categoria_id: '',
    centro_custo_id: '',
    metodo_pagamento: '',
    conta_origem: '',
    status: 'pendente',
    origem: 'manual'
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

        const [transacoesRes, categoriasRes, ccRes] = await Promise.all([
          axios.get(`${API}/empresas/${emp.id}/transacoes`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/categorias`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/centros-custo`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setTransacoes(transacoesRes.data);
        setCategorias(categoriasRes.data);
        setCentrosCusto(ccRes.data);
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
      cnpj_cpf: '',
      descricao: '',
      valor_total: '',
      data_competencia: new Date().toISOString().split('T')[0],
      data_pagamento: '',
      categoria_id: '',
      centro_custo_id: '',
      metodo_pagamento: '',
      conta_origem: '',
      status: 'pendente',
      origem: 'manual'
    });
  };

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
          <button 
            className="btn-success" 
            onClick={() => setShowForm(!showForm)}
            data-testid="toggle-transacao-form-button"
          >
            {showForm ? 'Cancelar' : '+ Nova Transação'}
          </button>
        </div>

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
                <input
                  type="text"
                  className="form-input"
                  value={formData.metodo_pagamento}
                  onChange={(e) => setFormData({ ...formData, metodo_pagamento: e.target.value })}
                  placeholder="Ex: Cartão, Boleto, PIX"
                  data-testid="transacao-metodo-input"
                />
              </div>

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