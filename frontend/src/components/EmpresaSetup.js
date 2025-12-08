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
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              {editingEmpresa ? '✏️ Editar Empresa' : '➕ Nova Empresa'}
            </h3>
            
            <div className="form-group">
              <label className="form-label">Razão Social *</label>
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
              <label className="form-label">CNPJ *</label>
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

            {editingEmpresa && (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.bloqueada}
                      onChange={(e) => setFormData({ ...formData, bloqueada: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    🔒 Empresa Bloqueada (não poderá acessar o sistema)
                  </label>
                </div>

                {formData.bloqueada && (
                  <div className="form-group">
                    <label className="form-label">Motivo do Bloqueio</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.motivo_bloqueio}
                      onChange={(e) => setFormData({ ...formData, motivo_bloqueio: e.target.value })}
                      placeholder="Ex: Inadimplência, Pagamento pendente..."
                    />
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                data-testid="empresa-submit-button"
              >
                {loading ? 'Salvando...' : (editingEmpresa ? 'Salvar Alterações' : 'Cadastrar Empresa')}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {empresas.length > 0 ? (
          <table className="data-table" style={{ marginTop: '2rem' }}>
            <thead>
              <tr>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th>Data de Cadastro</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody data-testid="empresas-table">
              {empresas.map((emp) => (
                <tr key={emp.id} style={{ backgroundColor: emp.bloqueada ? 'rgba(255, 0, 0, 0.05)' : 'transparent' }}>
                  <td>
                    {emp.razao_social}
                    {emp.bloqueada && (
                      <div style={{ fontSize: '0.75rem', color: '#e74c3c', marginTop: '0.25rem' }}>
                        🔒 {emp.motivo_bloqueio || 'Bloqueada'}
                      </div>
                    )}
                  </td>
                  <td>{emp.cnpj}</td>
                  <td>
                    {emp.bloqueada ? (
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.875rem',
                        backgroundColor: '#fee',
                        color: '#c00',
                        fontWeight: '500'
                      }}>
                        🔒 Bloqueada
                      </span>
                    ) : (
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.875rem',
                        backgroundColor: '#efe',
                        color: '#0a0',
                        fontWeight: '500'
                      }}>
                        ✅ Ativa
                      </span>
                    )}
                  </td>
                  <td>{new Date(emp.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(emp)}
                        className="btn-secondary"
                        style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        title="Editar empresa"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggleBlock(emp)}
                        className={emp.bloqueada ? "btn-success" : "btn-warning"}
                        style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        title={emp.bloqueada ? "Desbloquear empresa" : "Bloquear empresa"}
                        disabled={loading}
                      >
                        {emp.bloqueada ? '🔓 Desbloquear' : '🔒 Bloquear'}
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id, emp.razao_social)}
                        className="btn-danger"
                        style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
                        title="Excluir empresa"
                        disabled={loading}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </td>
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