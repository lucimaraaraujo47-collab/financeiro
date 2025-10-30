import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [estoqueOpen, setEstoqueOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  
  const configPaths = ['/categorias', '/centros-custo', '/financas', '/whatsapp', '/usuarios'];
  const estoquePaths = ['/clientes', '/fornecedores', '/locais', '/categorias-equipamentos', '/equipamentos', '/equipamentos-serializados', '/movimentacoes'];
  
  const isConfigActive = configPaths.some(path => location.pathname === path);
  const isEstoqueActive = estoquePaths.some(path => location.pathname === path);

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
            to="/crm" 
            className={`nav-item ${isActive('/crm') ? 'active' : ''}`}
            data-testid="nav-crm"
          >
            <span className="nav-icon">🎯</span>
            {sidebarOpen && <span className="nav-text">CRM</span>}
          </Link>

          {/* Estoque Submenu */}
          <div className="nav-section">
            <div 
              className={`nav-item nav-parent ${isEstoqueActive ? 'active' : ''}`}
              onClick={() => setEstoqueOpen(!estoqueOpen)}
              data-testid="nav-estoque-parent"
            >
              <span className="nav-icon">📦</span>
              {sidebarOpen && (
                <>
                  <span className="nav-text">Estoque</span>
                  <span className="nav-arrow">{estoqueOpen ? '▼' : '▶'}</span>
                </>
              )}
            </div>
            
            {sidebarOpen && estoqueOpen && (
              <div className="nav-submenu">
                <Link 
                  to="/clientes" 
                  className={`nav-item nav-subitem ${isActive('/clientes') ? 'active' : ''}`}
                  data-testid="nav-clientes"
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">Clientes</span>
                </Link>

                <Link 
                  to="/fornecedores" 
                  className={`nav-item nav-subitem ${isActive('/fornecedores') ? 'active' : ''}`}
                  data-testid="nav-fornecedores"
                >
                  <span className="nav-icon">🏭</span>
                  <span className="nav-text">Fornecedores</span>
                </Link>

                <Link 
                  to="/locais" 
                  className={`nav-item nav-subitem ${isActive('/locais') ? 'active' : ''}`}
                  data-testid="nav-locais"
                >
                  <span className="nav-icon">📍</span>
                  <span className="nav-text">Locais/Depósitos</span>
                </Link>

                <Link 
                  to="/categorias-equipamentos" 
                  className={`nav-item nav-subitem ${isActive('/categorias-equipamentos') ? 'active' : ''}`}
                  data-testid="nav-categorias-equipamentos"
                >
                  <span className="nav-icon">🏷️</span>
                  <span className="nav-text">Categorias</span>
                </Link>

                <Link 
                  to="/equipamentos" 
                  className={`nav-item nav-subitem ${isActive('/equipamentos') ? 'active' : ''}`}
                  data-testid="nav-equipamentos"
                >
                  <span className="nav-icon">📱</span>
                  <span className="nav-text">Equipamentos</span>
                </Link>

                <Link 
                  to="/equipamentos-serializados" 
                  className={`nav-item nav-subitem ${isActive('/equipamentos-serializados') ? 'active' : ''}`}
                  data-testid="nav-equipamentos-serializados"
                >
                  <span className="nav-icon">🔢</span>
                  <span className="nav-text">Serializados</span>
                </Link>

                <Link 
                  to="/movimentacoes" 
                  className={`nav-item nav-subitem ${isActive('/movimentacoes') ? 'active' : ''}`}
                  data-testid="nav-movimentacoes"
                >
                  <span className="nav-icon">🔄</span>
                  <span className="nav-text">Movimentações</span>
                </Link>
              </div>
            )}
          </div>

          {/* Configurações Submenu */}
          <div className="nav-section">
            <div 
              className={`nav-item nav-parent ${isConfigActive ? 'active' : ''}`}
              onClick={() => setConfigOpen(!configOpen)}
              data-testid="nav-config-parent"
            >
              <span className="nav-icon">⚙️</span>
              {sidebarOpen && (
                <>
                  <span className="nav-text">Configurações</span>
                  <span className="nav-arrow">{configOpen ? '▼' : '▶'}</span>
                </>
              )}
            </div>
            
            {sidebarOpen && configOpen && (
              <div className="nav-submenu">
                <Link 
                  to="/categorias" 
                  className={`nav-item nav-subitem ${isActive('/categorias') ? 'active' : ''}`}
                  data-testid="nav-categorias"
                >
                  <span className="nav-icon">📋</span>
                  <span className="nav-text">Categorias</span>
                </Link>

                <Link 
                  to="/centros-custo" 
                  className={`nav-item nav-subitem ${isActive('/centros-custo') ? 'active' : ''}`}
                  data-testid="nav-centros-custo"
                >
                  <span className="nav-icon">🎯</span>
                  <span className="nav-text">Centros de Custo</span>
                </Link>

                <Link 
                  to="/financas" 
                  className={`nav-item nav-subitem ${isActive('/financas') ? 'active' : ''}`}
                  data-testid="nav-financas"
                >
                  <span className="nav-icon">🏦</span>
                  <span className="nav-text">Contas & Cartões</span>
                </Link>

                <Link 
                  to="/whatsapp" 
                  className={`nav-item nav-subitem ${isActive('/whatsapp') ? 'active' : ''}`}
                  data-testid="nav-whatsapp"
                >
                  <span className="nav-icon">📱</span>
                  <span className="nav-text">WhatsApp</span>
                </Link>

                {user.perfil === 'admin' && (
                  <Link 
                    to="/usuarios" 
                    className={`nav-item nav-subitem ${isActive('/usuarios') ? 'active' : ''}`}
                    data-testid="nav-usuarios"
                  >
                    <span className="nav-icon">👥</span>
                    <span className="nav-text">Usuários</span>
                  </Link>
                )}
              </div>
            )}
          </div>
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