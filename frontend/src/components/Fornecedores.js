import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Fornecedores({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    telefone: '',
    endereco: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadFornecedores();
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

  const loadFornecedores = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/fornecedores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFornecedores(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/fornecedores`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Fornecedor cadastrado com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', cnpj: '', contato: '', email: '', telefone: '', endereco: '' });
      loadFornecedores();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      await axios.delete(`${API}/fornecedores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Fornecedor excluído com sucesso!');
      loadFornecedores();
    } catch (error) {
      setMessage('Erro ao excluir fornecedor');
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
        <h1 className="dashboard-title">🏭 Fornecedores</h1>
        <p className="dashboard-subtitle">Gerencie seus fornecedores</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Novo Fornecedor
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Novo Fornecedor</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>CNPJ *</label>
                <input type="text" className="form-input" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Contato</label>
                <input type="text" className="form-input" value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input type="text" className="form-input" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
              </div>
              <div className="form-group">
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
        <h3 className="card-title">Fornecedores Cadastrados ({fornecedores.length})</h3>
        {fornecedores.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nome}</td>
                    <td>{f.cnpj}</td>
                    <td>{f.contato || '-'}</td>
                    <td>{f.email || '-'}</td>
                    <td>{f.telefone || '-'}</td>
                    <td>
                      <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(f.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum fornecedor cadastrado</div>
        )}
      </div>
    </div>
  );
}

export default Fornecedores;