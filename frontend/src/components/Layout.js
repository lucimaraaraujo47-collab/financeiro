import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {sidebarOpen ? (
              <img src="/echo-shop-logo.jpg" alt="ECHO SHOP" style={{ maxWidth: '150px', height: 'auto' }} />
            ) : (
              <img src="/echo-shop-logo.jpg" alt="ECHO SHOP" style={{ width: '45px', height: 'auto' }} />
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
            data-testid="nav-dashboard"
          >
            <span className="nav-icon">📈</span>
            {sidebarOpen && <span className="nav-text">Dashboard</span>}
          </Link>

          <Link 
            to="/empresas" 
            className={`nav-item ${isActive('/empresas') ? 'active' : ''}`}
            data-testid="nav-empresas"
          >
            <span className="nav-icon">🏢</span>
            {sidebarOpen && <span className="nav-text">Empresas</span>}
          </Link>

          <Link 
            to="/categorias" 
            className={`nav-item ${isActive('/categorias') ? 'active' : ''}`}
            data-testid="nav-categorias"
          >
            <span className="nav-icon">📋</span>
            {sidebarOpen && <span className="nav-text">Categorias</span>}
          </Link>

          <Link 
            to="/centros-custo" 
            className={`nav-item ${isActive('/centros-custo') ? 'active' : ''}`}
            data-testid="nav-centros-custo"
          >
            <span className="nav-icon">🎯</span>
            {sidebarOpen && <span className="nav-text">Centros de Custo</span>}
          </Link>

          <Link 
            to="/transacoes" 
            className={`nav-item ${isActive('/transacoes') ? 'active' : ''}`}
            data-testid="nav-transacoes"
          >
            <span className="nav-icon">💰</span>
            {sidebarOpen && <span className="nav-text">Transações</span>}
          </Link>

          <Link 
            to="/relatorios" 
            className={`nav-item ${isActive('/relatorios') ? 'active' : ''}`}
            data-testid="nav-relatorios"
          >
            <span className="nav-icon">📊</span>
            {sidebarOpen && <span className="nav-text">Relatórios</span>}
          </Link>

          <Link 
            to="/importar" 
            className={`nav-item ${isActive('/importar') ? 'active' : ''}`}
            data-testid="nav-importar"
          >
            <span className="nav-icon">📥</span>
            {sidebarOpen && <span className="nav-text">Importar</span>}
          </Link>

          <Link 
            to="/analise-ia" 
            className={`nav-item ${isActive('/analise-ia') ? 'active' : ''}`}
            data-testid="nav-analise-ia"
          >
            <span className="nav-icon">🤖</span>
            {sidebarOpen && <span className="nav-text">Análise IA</span>}
          </Link>

          <Link 
            to="/whatsapp" 
            className={`nav-item ${isActive('/whatsapp') ? 'active' : ''}`}
            data-testid="nav-whatsapp"
          >
            <span className="nav-icon">📱</span>
            {sidebarOpen && <span className="nav-text">WhatsApp</span>}
          </Link>

          {user.perfil === 'admin' && (
            <Link 
              to="/usuarios" 
              className={`nav-item ${isActive('/usuarios') ? 'active' : ''}`}
              data-testid="nav-usuarios"
            >
              <span className="nav-icon">👥</span>
              {sidebarOpen && <span className="nav-text">Usuários</span>}
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="toggle-sidebar-btn" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="toggle-sidebar-button"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">Sistema Financeiro</h2>
          </div>
          <div className="top-bar-right">
            <div className="user-info">
              <span className="user-name">{user.nome}</span>
              <span className="user-badge">{user.perfil}</span>
            </div>
            <button 
              className="btn-logout" 
              onClick={onLogout}
              data-testid="logout-button"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;