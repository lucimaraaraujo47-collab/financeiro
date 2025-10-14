import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { validatePasswordStrength, sanitizeInput, formatPhone } from '../utils/validation';

function GerenciarUsuarios({ user, token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    perfil: 'financeiro',
    senha: '',
    empresa_ids: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);

  useEffect(() => {
    if (user.perfil !== 'admin') {
      setMessage('Acesso negado. Apenas administradores podem gerenciar usuários.');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users
      const usersRes = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(usersRes.data || []);

      // Load empresas
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(empresasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      // If endpoint doesn't exist, create it or show message
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      setFormData({ ...formData, [name]: formatPhone(value) });
    } else if (name === 'empresa_ids') {
      const options = e.target.selectedOptions;
      const values = Array.from(options).map(opt => opt.value);
      setFormData({ ...formData, [name]: values });
    } else {
      const sanitized = sanitizeInput(value);
      setFormData({ ...formData, [name]: sanitized });
    }

    if (name === 'senha') {
      const validation = validatePasswordStrength(value);
      setPasswordStrength(validation);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate password
      const validation = validatePasswordStrength(formData.senha);
      if (!validation.isValid) {
        setMessage('Senha fraca. Requisitos: ' + validation.errors.join(', '));
        setLoading(false);
        return;
      }

      await axios.post(`${API}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Usuário cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        perfil: 'financeiro',
        senha: '',
        empresa_ids: []
      });
      setPasswordStrength(null);
      loadData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao cadastrar usuário';
      setMessage(Array.isArray(errorMsg) ? errorMsg[0]?.msg || errorMsg : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (user.perfil !== 'admin') {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-text">Acesso Negado</div>
          <div className="empty-state-subtext">Apenas administradores podem acessar esta página</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Gerenciar Usuários</h1>
        <p className="dashboard-subtitle">Cadastre e gerencie usuários do sistema</p>
      </div>

      {message && (
        <div className={message.includes('sucesso') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Usuários do Sistema</h2>
          <button 
            className="btn-success" 
            onClick={() => setShowForm(!showForm)}
            data-testid="toggle-user-form-button"
          >
            {showForm ? 'Cancelar' : '+ Novo Usuário'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  data-testid="user-nome-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  className="form-input"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="user-email-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  className="form-input"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(11) 98765-4321"
                  data-testid="user-telefone-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Perfil de Acesso *</label>
                <select
                  className="form-select"
                  name="perfil"
                  value={formData.perfil}
                  onChange={handleChange}
                  required
                  data-testid="user-perfil-select"
                >
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="leitura">Apenas Leitura</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Senha *</label>
                <input
                  type="password"
                  className="form-input"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  data-testid="user-senha-input"
                />
                {passwordStrength && formData.senha && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: passwordStrength.strength.color,
                      fontWeight: 500
                    }}>
                      Força da senha: {passwordStrength.strength.level}
                    </div>
                    {passwordStrength.errors.length > 0 && (
                      <ul style={{
                        fontSize: '0.8rem',
                        color: '#fca5a5',
                        marginTop: '0.25rem',
                        paddingLeft: '1.25rem'
                      }}>
                        {passwordStrength.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {empresas.length > 0 && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Empresas (Ctrl+Click para múltiplas)</label>
                  <select
                    className="form-select"
                    name="empresa_ids"
                    multiple
                    value={formData.empresa_ids}
                    onChange={handleChange}
                    style={{ minHeight: '100px' }}
                    data-testid="user-empresas-select"
                  >
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social} - {emp.cnpj}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ marginTop: '1rem' }}
              data-testid="user-submit-button"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </button>
          </form>
        )}

        {usuarios.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Perfil</th>
                  <th>Empresas</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody data-testid="usuarios-table">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td>{usuario.telefone || '-'}</td>
                    <td>
                      <span className={`badge badge-${usuario.perfil === 'admin' ? 'receita' : 'pendente'}`}>
                        {usuario.perfil}
                      </span>
                    </td>
                    <td>{usuario.empresa_ids?.length || 0}</td>
                    <td>{new Date(usuario.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">Nenhum usuário cadastrado</div>
            <div className="empty-state-subtext">Cadastre o primeiro usuário</div>
          </div>
        )}
      </div>

      <div className="content-card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#f1f5f9' }}>ℹ️ Perfis de Acesso</h3>
        <ul style={{ color: '#cbd5e1', lineHeight: '1.8' }}>
          <li><strong style={{ color: '#6ee7b7' }}>Administrador:</strong> Acesso total ao sistema, pode gerenciar usuários</li>
          <li><strong style={{ color: '#fcd34d' }}>Financeiro:</strong> Pode criar e editar transações, categorias e relatórios</li>
          <li><strong style={{ color: '#94a3b8' }}>Apenas Leitura:</strong> Visualiza dados mas não pode criar ou editar</li>
        </ul>
      </div>
    </div>
  );
}

export default GerenciarUsuarios;
