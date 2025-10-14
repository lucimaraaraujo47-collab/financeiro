import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: formData.email,
        senha: formData.senha
      });
      onLogin(response.data.access_token, response.data.user);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Erro ao processar solicitação';
      setError(Array.isArray(errorMsg) ? errorMsg[0]?.msg || 'Erro desconhecido' : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/echo-shop-logo.jpg" alt="ECHO SHOP" style={{ maxWidth: '200px', height: 'auto' }} />
          </div>
          <p className="auth-subtitle" style={{ marginTop: '1.5rem' }}>
            Entre na sua conta
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Apenas usuários autorizados podem acessar este sistema.
        </div>
      </div>
    </div>
  );
}

export default Login;