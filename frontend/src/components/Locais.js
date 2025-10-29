import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Locais({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [locais, setLocais] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    responsavel: '',
    endereco: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadLocais();
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

  const loadLocais = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/locais`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocais(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/locais`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Local cadastrado com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', descricao: '', responsavel: '', endereco: '' });
      loadLocais();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este local?')) return;

    try {
      await axios.delete(`${API}/locais/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Local excluído com sucesso!');
      loadLocais();
    } catch (error) {
      setMessage('Erro ao excluir local');
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
        <h1 className="dashboard-title">📍 Locais/Depósitos</h1>
        <p className="dashboard-subtitle">Gerencie seus locais de armazenamento</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Novo Local
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Novo Local</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Responsável</label>
                <input type="text" className="form-input" value={formData.responsavel} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição</label>
                <input type="text" className="form-input" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Endereço</label>
                <input type="text" className="form-input" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
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
        <h3 className="card-title">Locais Cadastrados ({locais.length})</h3>
        {locais.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Responsável</th>
                  <th>Endereço</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {locais.map((l) => (
                  <tr key={l.id}>
                    <td>{l.nome}</td>
                    <td>{l.responsavel || '-'}</td>
                    <td>{l.endereco || '-'}</td>
                    <td>{l.descricao || '-'}</td>
                    <td>
                      <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(l.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum local cadastrado</div>
        )}
      </div>
    </div>
  );
}

export default Locais;
