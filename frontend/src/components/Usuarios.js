import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Usuarios({ user, token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    perfil: 'financeiro',
    senha: '',
    empresa_ids: user?.empresa_ids || []
  });
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPerfis();
    loadUsuarios();
  }, []);

  const loadPerfis = async () => {
    try {
      const response = await axios.get(`${API}/auth/perfis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPerfis(response.data);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
    }
  };

  const loadUsuarios = async () => {
    setLoadingList(true);
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      if (error.response?.status === 403) {
        setMessage('❌ Acesso negado. Apenas administradores podem ver usuários.');
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingUser) {
        // Atualizar usuário existente
        await axios.put(`${API}/users/${editingUser.id}`, {
          nome: formData.nome,
          telefone: formData.telefone,
          perfil: formData.perfil
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        await axios.post(`${API}/auth/register`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Usuário cadastrado com sucesso!');
      }
      
      setShowForm(false);
      setEditingUser(null);
      resetForm();
      loadUsuarios();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      setMessage('❌ Erro: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone || '',
      perfil: usuario.perfil,
      senha: '',
      empresa_ids: usuario.empresa_ids || []
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Usuário excluído com sucesso!');
      loadUsuarios();
    } catch (error) {
      setMessage('❌ Erro ao excluir: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      perfil: 'financeiro',
      senha: '',
      empresa_ids: user?.empresa_ids || []
    });
  };

  const getPerfilBadge = (perfil) => {
    const colors = {
      'admin_master': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
      'admin': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
      'financeiro': { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
      'vendas': { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
      'operacional': { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
      'consulta': { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
    };
    const style = colors[perfil] || colors['consulta'];
    const nome = perfis[perfil]?.nome || perfil;
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`
      }}>
        {nome}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">👥 Gerenciamento de Usuários</h2>
          {user?.perfil === 'admin_master' || user?.perfil === 'admin' ? (
            <button 
              className="btn-success" 
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setEditingUser(null);
                  resetForm();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {showForm ? '✖️ Cancelar' : '➕ Novo Usuário'}
            </button>
          ) : null}
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            margin: '1rem 0',
            borderRadius: '8px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}

        {/* Formulário de Criação/Edição */}
        {showForm && (
          <div style={{
            marginTop: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleSubmit}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                {editingUser ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">👤 Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Nome do usuário"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📧 Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={editingUser}
                    placeholder="email@exemplo.com"
                    style={editingUser ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  />
                  {editingUser && (
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      Email não pode ser alterado
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">📱 Telefone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">🔐 Senha *</label>
                    <input
                      type="password"
                      className="form-input"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      required={!editingUser}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">🎭 Perfil de Acesso *</label>
                <select
                  className="form-input"
                  value={formData.perfil}
                  onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                  required
                  style={{ fontSize: '0.9375rem' }}
                >
                  {Object.entries(perfis).map(([key, perfil]) => (
                    <option key={key} value={key}>
                      {perfil.nome} - {perfil.descricao}
                    </option>
                  ))}
                </select>
                
                {formData.perfil && perfis[formData.perfil] && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#0369a1'
                  }}>
                    <strong>Permissões:</strong> {perfis[formData.perfil].permissoes.join(', ')}
                  </div>
                )}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  {loading ? '⏳ Salvando...' : (editingUser ? '💾 Salvar Alterações' : '➕ Cadastrar Usuário')}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  disabled={loading}
                  style={{ padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  ✖️ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Usuários */}
        <div style={{ marginTop: '2rem' }}>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>Carregando usuários...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">Nenhum usuário cadastrado ainda</div>
              <div className="empty-state-subtext">Cadastre usuários para sua equipe</div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                📋 Usuários Cadastrados ({usuarios.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: '2px solid var(--border-color)'
                    }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Usuário</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Telefone</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Perfil</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Criado em</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario) => (
                      <tr 
                        key={usuario.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '1rem'
                            }}>
                              {usuario.nome?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{usuario.nome}</div>
                              {usuario.id === user?.id && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#059669',
                                  fontWeight: '500'
                                }}>
                                  (você)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>
                          {usuario.email}
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>
                          {usuario.telefone || '-'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {getPerfilBadge(usuario.perfil)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                          {formatDate(usuario.created_at)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEdit(usuario)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: '1px solid #93c5fd',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              title="Editar usuário"
                            >
                              ✏️ Editar
                            </button>
                            {usuario.id !== user?.id && (
                              <button
                                onClick={() => handleDelete(usuario.id)}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  fontSize: '0.75rem',
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                title="Excluir usuário"
                              >
                                🗑️ Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Legenda de Perfis */}
        {Object.keys(perfis).length > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              📖 Legenda de Perfis
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {Object.entries(perfis).map(([key, perfil]) => (
                <div key={key} style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '8px'
                }}>
                  {getPerfilBadge(key)}
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                    {perfil.descricao}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Usuarios;
