import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Equipamentos({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    categoria_id: '',
    fabricante: '',
    modelo: '',
    descricao: '',
    custo_aquisicao: 0,
    valor_venda: 0,
    valor_locacao_mensal: 0,
    tipo_controle: 'serializado',
    foto_url: '',
    fornecedor_id: '',
    estoque_minimo: 0
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadData();
    }
  }, [empresa]);

  const loadEmpresa = async () => {
    try {
      const res = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.length > 0) setEmpresa(res.data[0]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadData = async () => {
    try {
      const [eqRes, catRes, fornRes] = await Promise.all([
        axios.get(`${API}/empresas/${empresa.id}/equipamentos`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/categorias-equipamentos`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/fornecedores`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setEquipamentos(eqRes.data);
      setCategorias(catRes.data);
      setFornecedores(fornRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/equipamentos`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Equipamento cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        nome: '', categoria_id: '', fabricante: '', modelo: '', descricao: '',
        custo_aquisicao: 0, valor_venda: 0, valor_locacao_mensal: 0,
        tipo_controle: 'serializado', foto_url: '', fornecedor_id: '', estoque_minimo: 0
      });
      loadData();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este equipamento?')) return;

    try {
      await axios.delete(`${API}/equipamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Equipamento excluído com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao excluir equipamento');
    }
  };

  if (!empresa) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-text">Nenhuma empresa cadastrada</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📱 Equipamentos</h1>
        <p className="dashboard-subtitle">Gerencie seu catálogo de produtos</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Novo Equipamento
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Novo Equipamento</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Categoria *</label>
                <select className="form-input" value={formData.categoria_id} onChange={(e) => setFormData({...formData, categoria_id: e.target.value})} required>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fabricante</label>
                <input type="text" className="form-input" value={formData.fabricante} onChange={(e) => setFormData({...formData, fabricante: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input type="text" className="form-input" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Custo de Aquisição (R$)</label>
                <input type="number" step="0.01" className="form-input" value={formData.custo_aquisicao} onChange={(e) => setFormData({...formData, custo_aquisicao: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Valor de Venda (R$)</label>
                <input type="number" step="0.01" className="form-input" value={formData.valor_venda} onChange={(e) => setFormData({...formData, valor_venda: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Valor Locação Mensal (R$)</label>
                <input type="number" step="0.01" className="form-input" value={formData.valor_locacao_mensal} onChange={(e) => setFormData({...formData, valor_locacao_mensal: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Tipo de Controle *</label>
                <select className="form-input" value={formData.tipo_controle} onChange={(e) => setFormData({...formData, tipo_controle: e.target.value})}>
                  <option value="serializado">Serializado</option>
                  <option value="nao_serializado">Não Serializado</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fornecedor</label>
                <select className="form-input" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estoque Mínimo</label>
                <input type="number" className="form-input" value={formData.estoque_minimo} onChange={(e) => setFormData({...formData, estoque_minimo: parseInt(e.target.value)})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição</label>
                <textarea className="form-input" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} rows="2" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Salvar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card">
        <h3 className="card-title">Equipamentos Cadastrados ({equipamentos.length})</h3>
        {equipamentos.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Fabricante</th>
                  <th>Modelo</th>
                  <th>Tipo</th>
                  <th>Custo</th>
                  <th>Venda</th>
                  <th>Locação/mês</th>
                  <th>Estoque</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipamentos.map((eq) => (
                  <tr key={eq.id}>
                    <td>{eq.nome}</td>
                    <td>{eq.fabricante || '-'}</td>
                    <td>{eq.modelo || '-'}</td>
                    <td><span className="badge">{eq.tipo_controle}</span></td>
                    <td>R$ {eq.custo_aquisicao.toFixed(2)}</td>
                    <td>R$ {eq.valor_venda.toFixed(2)}</td>
                    <td>R$ {eq.valor_locacao_mensal.toFixed(2)}</td>
                    <td>{eq.quantidade_estoque}</td>
                    <td>
                      <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(eq.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum equipamento cadastrado</div>
        )}
      </div>
    </div>
  );
}

export default Equipamentos;