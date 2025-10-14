import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { validatePasswordStrength, sanitizeInput } from '../utils/validation';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    telefone: '',
    perfil: 'financeiro'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register
        await axios.post(`${API}/auth/register`, formData);
        // Then login
        const loginRes = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          senha: formData.senha
        });
        onLogin(loginRes.data.access_token, loginRes.data.user);
      } else {
        // Login
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          senha: formData.senha
        });
        onLogin(response.data.access_token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">📊</div>
          <h1 className="auth-title">FinAI</h1>
          <p className="auth-subtitle">
            {isRegister ? 'Crie sua conta' : 'Entre na sua conta'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  data-testid="register-name-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  className="form-input"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(11) 98765-4321"
                  data-testid="register-phone-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Perfil de Acesso</label>
                <select
                  name="perfil"
                  className="form-select"
                  value={formData.perfil}
                  onChange={handleChange}
                  data-testid="register-perfil-select"
                >
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="leitura">Apenas Leitura</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              data-testid="login-email-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              name="senha"
              className="form-input"
              value={formData.senha}
              onChange={handleChange}
              required
              data-testid="login-password-input"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            data-testid="login-submit-button"
          >
            {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            data-testid="toggle-auth-mode-button"
          >
            {isRegister ? 'Faça login' : 'Registre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;