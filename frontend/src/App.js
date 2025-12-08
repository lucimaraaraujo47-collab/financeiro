import React, { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmpresaSetup from './components/EmpresaSetup';
import Categorias from './components/Categorias';
import CentrosCusto from './components/CentrosCusto';
import Transacoes from './components/Transacoes';
import MockWhatsApp from './components/MockWhatsApp';
import WhatsAppReal from './components/WhatsAppReal';
import GerenciarUsuarios from './components/GerenciarUsuarios';
import Relatorios from './components/Relatorios';
import ImportarTransacoes from './components/ImportarTransacoes';
import AnaliseIA from './components/AnaliseIA';
import Financas from './components/Financas';
import Clientes from './components/Clientes';
import Fornecedores from './components/Fornecedores';
import Locais from './components/Locais';
import CategoriasEquipamentos from './components/CategoriasEquipamentos';
import Equipamentos from './components/Equipamentos';
import EquipamentosSerializados from './components/EquipamentosSerializados';
import Movimentacoes from './components/Movimentacoes';
import ConfiguracoesBackup from './components/ConfiguracoesBackup';
import Vendas from './components/Vendas';
import DashboardVendas from './components/DashboardVendas';
import Layout from './components/Layout';

// Use relative URL - Kubernetes Ingress will route /api to backend
const API = '/api';

// Debug: Log the API URL being used
console.log('API URL configured:', API);
console.log('Current origin:', window.location.origin);

export { API };

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="loading-screen">Carregando...</div>
      </ThemeProvider>
    );
  }

  if (!token || !user) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} token={token} />} />
            <Route path="/empresas" element={<EmpresaSetup user={user} token={token} onUpdate={loadUser} />} />
            <Route path="/categorias" element={<Categorias user={user} token={token} />} />
            <Route path="/centros-custo" element={<CentrosCusto user={user} token={token} />} />
            <Route path="/financas" element={<Financas user={user} token={token} />} />
            <Route path="/transacoes" element={<Transacoes user={user} token={token} />} />
            <Route path="/relatorios" element={<Relatorios user={user} token={token} />} />
            <Route path="/importar" element={<ImportarTransacoes user={user} token={token} />} />
            <Route path="/analise-ia" element={<AnaliseIA user={user} token={token} />} />
            <Route path="/whatsapp" element={<WhatsAppReal user={user} token={token} />} />
            <Route path="/whatsapp-mock" element={<MockWhatsApp user={user} token={token} />} />
            <Route path="/usuarios" element={<GerenciarUsuarios user={user} token={token} />} />
            
            {/* Estoque Routes */}
            <Route path="/clientes" element={<Clientes user={user} token={token} />} />
            <Route path="/fornecedores" element={<Fornecedores user={user} token={token} />} />
            <Route path="/locais" element={<Locais user={user} token={token} />} />
            <Route path="/categorias-equipamentos" element={<CategoriasEquipamentos user={user} token={token} />} />
            <Route path="/equipamentos" element={<Equipamentos user={user} token={token} />} />
            <Route path="/equipamentos-serializados" element={<EquipamentosSerializados user={user} token={token} />} />
            <Route path="/movimentacoes" element={<Movimentacoes user={user} token={token} />} />
            
            {/* CRM Route */}
            <Route path="/crm" element={<CRM user={user} token={token} />} />
            <Route path="/crm/config" element={<ConfiguracoesCRM user={user} token={token} />} />
            <Route path="/crm/dashboard" element={<DashboardCRM user={user} token={token} />} />
            
            {/* Backup Configuration */}
            <Route path="/backup" element={<ConfiguracoesBackup user={user} token={token} />} />
            
            {/* Vendas */}
            <Route path="/vendas" element={<Vendas user={user} token={token} />} />
            <Route path="/vendas/dashboard" element={<DashboardVendas user={user} token={token} />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;