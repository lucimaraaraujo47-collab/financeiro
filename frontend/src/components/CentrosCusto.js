import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function CentrosCusto({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    area: ''
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

        const ccRes = await axios.get(`${API}/empresas/${emp.id}/centros-custo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      await axios.post(`${API}/empresas/${empresa.id}/centros-custo`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Centro de custo cadastrado com sucesso!');
      setShowForm(false);
      setFormData({ nome: '', area: '' });
      loadData();
    } catch (error) {
      setMessage('Erro ao cadastrar centro de custo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este centro de custo?')) return;

    try {
      await axios.delete(`${API}/centros-custo/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Centro de custo deletado com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar centro de custo');
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
        <h1 className="dashboard-title">Centros de Custo</h1>
        <p className="dashboard-subtitle">Organize despesas por departamento ou projeto</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Meus Centros de Custo</h2>
          <button 
            className="btn-success" 
            onClick={() => setShowForm(!showForm)}
            data-testid="toggle-centro-custo-form-button"
          >
            {showForm ? 'Cancelar' : '+ Novo Centro de Custo'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label className="form-label">Nome do Centro de Custo</label>
              <input
                type="text"
                className="form-input"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Ex: Operações, Comercial, TI"
                data-testid="centro-custo-nome-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Área/Departamento</label>
              <input
                type="text"
                className="form-input"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Ex: Administrativo, Vendas, Produção"
                data-testid="centro-custo-area-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              data-testid="centro-custo-submit-button"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Centro de Custo'}
            </button>
          </form>
        )}

        {centrosCusto.length > 0 ? (
          <table className="data-table" style={{ marginTop: '2rem' }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Área</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody data-testid="centros-custo-table">
              {centrosCusto.map((cc) => (
                <tr key={cc.id}>
                  <td>{cc.nome}</td>
                  <td>{cc.area || '-'}</td>
                  <td>
                    <button 
                      className="btn-danger" 
                      onClick={() => handleDelete(cc.id)}
                      data-testid={`delete-centro-custo-${cc.id}`}
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
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-text">Nenhum centro de custo cadastrado</div>
            <div className="empty-state-subtext">Crie seus primeiros centros de custo</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CentrosCusto;