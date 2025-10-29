import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function CategoriasEquipamentos({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_controle: 'serializado'
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadCategorias();
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

  const loadCategorias = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/categorias-equipamentos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategorias(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/categorias-equipamentos`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Categoria cadastrada com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', descricao: '', tipo_controle: 'serializado' });
      loadCategorias();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      await axios.delete(`${API}/categorias-equipamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Categoria excluída com sucesso!');
      loadCategorias();
    } catch (error) {
      setMessage('Erro ao excluir categoria');
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
        <h1 className="dashboard-title">🏷️ Categorias de Equipamentos</h1>
        <p className="dashboard-subtitle">Organize seus equipamentos por categoria</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Nova Categoria
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Nova Categoria</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Tipo de Controle *</label>
                <select className="form-input" value={formData.tipo_controle} onChange={(e) => setFormData({...formData, tipo_controle: e.target.value})}>
                  <option value="serializado">Serializado (Número de Série)</option>
                  <option value="nao_serializado">Não Serializado (Quantidade)</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição</label>
                <textarea className="form-input" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} rows="3" />
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
        <h3 className="card-title">Categorias Cadastradas ({categorias.length})</h3>
        {categorias.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo de Controle</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>
                      <span className={`badge ${c.tipo_controle === 'serializado' ? 'badge-receita' : 'badge-despesa'}`}>
                        {c.tipo_controle === 'serializado' ? '🔢 Serializado' : '📦 Quantidade'}
                      </span>
                    </td>
                    <td>{c.descricao || '-'}</td>
                    <td>
                      <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(c.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhuma categoria cadastrada</div>
        )}
      </div>
    </div>
  );
}

export default CategoriasEquipamentos;