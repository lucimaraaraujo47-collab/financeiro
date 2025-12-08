import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Usuarios({ user, token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    perfil: 'financeiro',
    senha: '',
    empresa_ids: user?.empresa_ids || []
  });
  const [loading, setLoading] = useState(false);
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
    try {
      // TODO: Criar endpoint para listar usuários da empresa
      setUsuarios([]);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post(`${API}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Usuário cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        perfil: 'financeiro',
        senha: '',
        empresa_ids: user?.empresa_ids || []
      });
      loadUsuarios();
    } catch (error) {
      setMessage('❌ Erro ao cadastrar usuário: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">👥 Gerenciamento de Usuários</h2>
          <button 
            className="btn-success" 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✖️ Cancelar' : '➕ Novo Usuário'}
          </button>
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
                ➕ Novo Usuário
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
                    placeholder="email@exemplo.com"
                  />
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

                <div className="form-group">
                  <label className="form-label">🔐 Senha *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
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
                  {loading ? '⏳ Cadastrando...' : '➕ Cadastrar Usuário'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  style={{ padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  ✖️ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">Nenhum usuário cadastrado ainda</div>
            <div className="empty-state-subtext">Cadastre usuários para sua equipe</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Usuarios;
