import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { validatePasswordStrength, sanitizeInput } from '../utils/validation';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(value, name === 'senha' ? 100 : 500);
    setFormData({ ...formData, [name]: sanitized });
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
            {isRegister ? 'Crie sua conta' : 'Entre na sua conta'}
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
            {isRegister && passwordStrength && formData.senha && (
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