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
      console.error('Login error:', err);
      
      if (err.response) {
        // Server responded with error
        const errorMsg = err.response?.data?.detail || `Erro ${err.response.status}: ${err.response.statusText}`;
        setError(Array.isArray(errorMsg) ? errorMsg[0]?.msg || 'Erro desconhecido' : errorMsg);
      } else if (err.request) {
        // Request was made but no response
        setError('❌ Erro de conexão: Servidor não responde. Verifique se o backend está rodando.');
      } else {
        // Something else happened
        setError('❌ Erro ao processar solicitação: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              📦 ECHO SHOP
            </h1>
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