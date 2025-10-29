import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Clientes({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'juridica',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadClientes();
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

  const loadClientes = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/clientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/clientes`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Cliente cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        nome: '', tipo: 'juridica', cnpj_cpf: '', email: '', telefone: '',
        endereco: '', cidade: '', estado: '', cep: '', observacoes: ''
      });
      loadClientes();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      await axios.delete(`${API}/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Cliente excluído com sucesso!');
      loadClientes();
    } catch (error) {
      setMessage('Erro ao excluir cliente');
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
        <h1 className="dashboard-title">👥 Clientes</h1>
        <p className="dashboard-subtitle">Gerencie seus clientes</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Novo Cliente
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Novo Cliente</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Tipo *</label>
                <select className="form-input" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                  <option value="juridica">Jurídica</option>
                  <option value="fisica">Física</option>
                </select>
              </div>
              <div className="form-group">
                <label>CNPJ/CPF *</label>
                <input type="text" className="form-input" value={formData.cnpj_cpf} onChange={(e) => setFormData({...formData, cnpj_cpf: e.target.value})} required />
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
                <label>Cidade</label>
                <input type="text" className="form-input" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
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
        <h3 className="card-title">Clientes Cadastrados ({clientes.length})</h3>
        {clientes.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>CNPJ/CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Cidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td><span className="badge">{c.tipo}</span></td>
                    <td>{c.cnpj_cpf}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.telefone || '-'}</td>
                    <td>{c.cidade || '-'}</td>
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
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum cliente cadastrado</div>
        )}
      </div>
    </div>
  );
}

export default Clientes;