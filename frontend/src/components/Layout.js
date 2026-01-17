import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Layout.css';

function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [estoqueOpen, setEstoqueOpen] = useState(false);
  const [vendasOpen, setVendasOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  
  const configPaths = ['/categorias', '/centros-custo', '/financas', '/whatsapp', '/usuarios', '/backup', '/app-tecnico'];
  const estoquePaths = ['/clientes', '/fornecedores', '/locais', '/categorias-equipamentos', '/equipamentos', '/equipamentos-serializados', '/movimentacoes', '/equipamentos-servico'];
  const vendasPaths = ['/vendas', '/vendas/dashboard', '/assinaturas', '/planos-servico', '/modelos-contrato', '/vendas-servico', '/ordens-servico'];
  
  const isConfigActive = configPaths.some(path => location.pathname === path);
  const isEstoqueActive = estoquePaths.some(path => location.pathname === path);
  const isVendasActive = vendasPaths.some(path => location.pathname === path);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      {/* Mobile Menu Toggle Button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <button 
          className="sidebar-close-btn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
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

          {/* Vendas Submenu */}
          <div
            className={`nav-item nav-submenu-toggle ${isVendasActive ? 'active' : ''}`}
            onClick={() => setVendasOpen(!vendasOpen)}
          >
            <span className="nav-icon">💼</span>
            {sidebarOpen && (
              <>
                <span className="nav-text">Vendas</span>
                <span className={`nav-arrow ${vendasOpen ? 'open' : ''}`}>▼</span>
              </>
            )}
          </div>
          
          <div className={`nav-submenu ${vendasOpen ? 'open' : ''}`}>
            <Link 
              to="/vendas/dashboard" 
              className={`nav-item nav-subitem ${isActive('/vendas/dashboard') ? 'active' : ''}`}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>
            
            <Link 
              to="/vendas-servico" 
              className={`nav-item nav-subitem ${isActive('/vendas-servico') ? 'active' : ''}`}
            >
              <span className="nav-icon">🛒</span>
              <span className="nav-text">Nova Venda</span>
            </Link>
            
            <Link 
              to="/ordens-servico" 
              className={`nav-item nav-subitem ${isActive('/ordens-servico') ? 'active' : ''}`}
            >
              <span className="nav-icon">🛠️</span>
              <span className="nav-text">Ordens de Serviço</span>
            </Link>
            
            <Link 
              to="/planos-servico" 
              className={`nav-item nav-subitem ${isActive('/planos-servico') ? 'active' : ''}`}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">Planos</span>
            </Link>
            
            <Link 
              to="/modelos-contrato" 
              className={`nav-item nav-subitem ${isActive('/modelos-contrato') ? 'active' : ''}`}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-text">Contratos</span>
            </Link>
            
            <Link 
              to="/assinaturas" 
              className={`nav-item nav-subitem ${isActive('/assinaturas') ? 'active' : ''}`}
            >
              <span className="nav-icon">💼</span>
              <span className="nav-text">Assinaturas SaaS</span>
            </Link>
            
            <Link 
              to="/vendas" 
              className={`nav-item nav-subitem ${isActive('/vendas') ? 'active' : ''}`}
            >
              <span className="nav-icon">📝</span>
              <span className="nav-text">Cobranças Avulsas</span>
            </Link>
          </div>

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
            
            {sidebarOpen && (
              <div className={`nav-submenu ${estoqueOpen ? 'open' : ''}`}>
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

                <Link 
                  to="/equipamentos-servico" 
                  className={`nav-item nav-subitem ${isActive('/equipamentos-servico') ? 'active' : ''}`}
                  data-testid="nav-equipamentos-servico"
                >
                  <span className="nav-icon">📦</span>
                  <span className="nav-text">Equip. Técnicos</span>
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
            
            {sidebarOpen && (
              <div className={`nav-submenu ${configOpen ? 'open' : ''}`}>
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

                {(user.perfil === 'admin' || user.perfil === 'admin_master') && (
                  <Link 
                    to="/usuarios" 
                    className={`nav-item nav-subitem ${isActive('/usuarios') ? 'active' : ''}`}
                    data-testid="nav-usuarios"
                  >
                    <span className="nav-icon">👥</span>
                    <span className="nav-text">Usuários</span>
                  </Link>
                )}

                <Link 
                  to="/logs" 
                  className={`nav-item nav-subitem ${isActive('/logs') ? 'active' : ''}`}
                  data-testid="nav-logs"
                >
                  <span className="nav-icon">📊</span>
                  <span className="nav-text">Logs</span>
                </Link>

                <Link 
                  to="/licencas" 
                  className={`nav-item nav-subitem ${isActive('/licencas') ? 'active' : ''}`}
                  data-testid="nav-licencas"
                >
                  <span className="nav-icon">💳</span>
                  <span className="nav-text">Licenças</span>
                </Link>

                {user.perfil === 'admin' && (
                  <Link 
                    to="/backup" 
                    className={`nav-item nav-subitem ${isActive('/backup') ? 'active' : ''}`}
                    data-testid="nav-backup"
                  >
                    <span className="nav-icon">📦</span>
                    <span className="nav-text">Backup</span>
                  </Link>
                )}

                <Link 
                  to="/app-tecnico" 
                  className={`nav-item nav-subitem ${isActive('/app-tecnico') ? 'active' : ''}`}
                  data-testid="nav-app-tecnico"
                >
                  <span className="nav-icon">📱</span>
                  <span className="nav-text">App Técnico</span>
                </Link>
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
            <button 
              className="btn-theme-toggle" 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
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