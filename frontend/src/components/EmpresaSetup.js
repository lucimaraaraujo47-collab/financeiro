import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function EmpresaSetup({ user, token, onUpdate }) {
  const [empresas, setEmpresas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    contas_bancarias: [],
    ativa: true,
    bloqueada: false,
    motivo_bloqueio: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Error loading empresas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingEmpresa) {
        // Atualizar empresa existente
        await axios.put(`${API}/empresas/${editingEmpresa.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Empresa atualizada com sucesso!');
      } else {
        // Criar nova empresa
        await axios.post(`${API}/empresas`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Empresa cadastrada com sucesso!');
      }
      
      setShowForm(false);
      setEditingEmpresa(null);
      resetForm();
      loadEmpresas();
      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage('❌ Erro ao salvar empresa: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      cnpj: '',
      contas_bancarias: [],
      ativa: true,
      bloqueada: false,
      motivo_bloqueio: ''
    });
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      razao_social: empresa.razao_social,
      cnpj: empresa.cnpj,
      contas_bancarias: empresa.contas_bancarias || [],
      ativa: empresa.ativa !== undefined ? empresa.ativa : true,
      bloqueada: empresa.bloqueada || false,
      motivo_bloqueio: empresa.motivo_bloqueio || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id, razaoSocial) => {
    if (!window.confirm(`Tem certeza que deseja excluir a empresa "${razaoSocial}"?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API}/empresas/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Empresa excluída com sucesso!');
      loadEmpresas();
      if (onUpdate) onUpdate();
    } catch (error) {
      setMessage('❌ Erro ao excluir empresa: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (empresa) => {
    const novoStatus = !empresa.bloqueada;
    const motivo = novoStatus ? prompt('Motivo do bloqueio (ex: Inadimplência):') : '';
    
    if (novoStatus && !motivo) {
      return; // Cancelou
    }

    try {
      setLoading(true);
      await axios.patch(`${API}/empresas/${empresa.id}/status`, {
        bloqueada: novoStatus,
        motivo_bloqueio: motivo
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(novoStatus ? '🔒 Empresa bloqueada!' : '✅ Empresa desbloqueada!');
      loadEmpresas();
    } catch (error) {
      setMessage('❌ Erro ao atualizar status: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingEmpresa(null);
    resetForm();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Empresas</h1>
        <p className="dashboard-subtitle">Gerencie suas empresas</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Minhas Empresas</h2>
          <button 
            className="btn-success" 
            onClick={() => {
              if (showForm) {
                handleCancelEdit();
              } else {
                setShowForm(true);
                setEditingEmpresa(null);
                resetForm();
              }
            }}
            data-testid="toggle-empresa-form-button"
          >
            {showForm ? 'Cancelar' : '+ Nova Empresa'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div className="form-group">
              <label className="form-label">Razão Social</label>
              <input
                type="text"
                className="form-input"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                required
                data-testid="empresa-razao-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">CNPJ</label>
              <input
                type="text"
                className="form-input"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                required
                placeholder="00.000.000/0001-00"
                data-testid="empresa-cnpj-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              data-testid="empresa-submit-button"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </button>
          </form>
        )}

        {empresas.length > 0 ? (
          <table className="data-table" style={{ marginTop: '2rem' }}>
            <thead>
              <tr>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Data de Cadastro</th>
              </tr>
            </thead>
            <tbody data-testid="empresas-table">
              {empresas.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.razao_social}</td>
                  <td>{emp.cnpj}</td>
                  <td>{new Date(emp.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-text">Nenhuma empresa cadastrada</div>
            <div className="empty-state-subtext">Cadastre sua primeira empresa para começar</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmpresaSetup;