import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Categorias({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'despesa',
    descricao: ''
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

        const categoriasRes = await axios.get(`${API}/empresas/${emp.id}/categorias`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategorias(categoriasRes.data);
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
      await axios.post(`${API}/empresas/${empresa.id}/categorias`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Categoria cadastrada com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', tipo: 'despesa', descricao: '' });
      loadData();
    } catch (error) {
      setMessage('Erro ao cadastrar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta categoria?')) return;

    try {
      await axios.delete(`${API}/categorias/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Categoria deletada com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar categoria');
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Categorias</h1>
        <p className="dashboard-subtitle">Gerencie categorias de receitas e despesas</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Minhas Categorias</h2>
          <button 
            className="btn-success" 
            onClick={() => setShowForm(!showForm)}
            data-testid="toggle-categoria-form-button"
          >
            {showForm ? 'Cancelar' : '+ Nova Categoria'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label className="form-label">Nome da Categoria</label>
              <input
                type="text"
                className="form-input"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Ex: Internet/Telefonia, Aluguel, Vendas"
                data-testid="categoria-nome-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                data-testid="categoria-tipo-select"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição (opcional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da categoria"
                data-testid="categoria-descricao-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              data-testid="categoria-submit-button"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Categoria'}
            </button>
          </form>
        )}

        {categorias.length > 0 ? (
          <table className="data-table" style={{ marginTop: '2rem' }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody data-testid="categorias-table">
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.nome}</td>
                  <td>
                    <span className={`badge badge-${cat.tipo}`}>{cat.tipo}</span>
                  </td>
                  <td>{cat.descricao || '-'}</td>
                  <td>
                    <button 
                      className="btn-danger" 
                      onClick={() => handleDelete(cat.id)}
                      data-testid={`delete-categoria-${cat.id}`}
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Nenhuma categoria cadastrada</div>
            <div className="empty-state-subtext">Crie suas primeiras categorias</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Categorias;