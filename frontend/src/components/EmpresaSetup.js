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
          <div style={{
            marginTop: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {editingEmpresa ? '✏️' : '➕'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
                </h3>
              </div>
            
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                    🏢 Razão Social *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    required
                    placeholder="Nome da empresa"
                    data-testid="empresa-razao-input"
                    style={{ fontSize: '0.9375rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                    📄 CNPJ *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    required
                    placeholder="00.000.000/0001-00"
                    data-testid="empresa-cnpj-input"
                    style={{ fontSize: '0.9375rem' }}
                  />
                </div>
              </div>

              {editingEmpresa && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  backgroundColor: formData.bloqueada ? '#fef2f2' : '#f9fafb',
                  borderRadius: '8px',
                  border: formData.bloqueada ? '2px solid #fecaca' : '1px solid #e5e7eb'
                }}>
                  <div className="form-group" style={{ marginBottom: formData.bloqueada ? '1rem' : 0 }}>
                    <label className="form-label" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.bloqueada}
                        onChange={(e) => setFormData({ ...formData, bloqueada: e.target.checked })}
                        style={{ 
                          width: '1.125rem', 
                          height: '1.125rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '0.9375rem' }}>
                        🔒 Bloquear empresa (impede acesso ao sistema)
                      </span>
                    </label>
                  </div>

                  {formData.bloqueada && (
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label" style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        💬 Motivo do Bloqueio
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.motivo_bloqueio}
                        onChange={(e) => setFormData({ ...formData, motivo_bloqueio: e.target.value })}
                        placeholder="Ex: Inadimplência, Pagamento pendente..."
                        style={{ fontSize: '0.9375rem' }}
                      />
                    </div>
                  )}
                </div>
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
          <div style={{ marginTop: '2rem' }}>
            <div style={{ 
              display: 'grid', 
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
            }}>
              {empresas.map((emp) => (
                <div 
                  key={emp.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: emp.bloqueada ? '2px solid #e74c3c' : '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Header do Card */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                      }}>
                        {emp.razao_social}
                      </h3>
                      <div style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        CNPJ: {emp.cnpj}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div>
                      {emp.bloqueada ? (
                        <span style={{ 
                          padding: '0.375rem 0.875rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.8125rem',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          🔒 Bloqueada
                        </span>
                      ) : (
                        <span style={{ 
                          padding: '0.375rem 0.875rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.8125rem',
                          backgroundColor: '#dcfce7',
                          color: '#16a34a',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          ✅ Ativa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Motivo do bloqueio (se houver) */}
                  {emp.bloqueada && emp.motivo_bloqueio && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.875rem',
                      color: '#991b1b'
                    }}>
                      <strong>Motivo:</strong> {emp.motivo_bloqueio}
                    </div>
                  )}

                  {/* Informações adicionais */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '1.25rem'
                  }}>
                    <span>📅</span>
                    <span>Cadastrada em {new Date(emp.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {/* Botões de Ação */}
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.5rem'
                  }}>
                    <button
                      onClick={() => handleEdit(emp)}
                      className="btn-secondary"
                      style={{ 
                        fontSize: '0.8125rem',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Editar empresa"
                    >
                      ✏️ Editar
                    </button>
                    
                    <button
                      onClick={() => handleToggleBlock(emp)}
                      className={emp.bloqueada ? "btn-success" : "btn-warning"}
                      style={{ 
                        fontSize: '0.8125rem',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap'
                      }}
                      title={emp.bloqueada ? "Desbloquear acesso" : "Bloquear acesso"}
                      disabled={loading}
                    >
                      {emp.bloqueada ? '🔓' : '🔒'}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(emp.id, emp.razao_social)}
                      className="btn-danger"
                      style={{ 
                        fontSize: '0.8125rem',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Excluir empresa"
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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