import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Logs({ user, token }) {
  const [activeTab, setActiveTab] = useState('acoes');
  const [empresa, setEmpresa] = useState(null);
  const [logsAcoes, setLogsAcoes] = useState([]);
  const [logsSessoes, setLogsSessoes] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroModulo, setFiltroModulo] = useState('');

  useEffect(() => {
    if (user?.empresa_ids && user.empresa_ids.length > 0) {
      loadEmpresa(user.empresa_ids[0]);
    }
  }, [user]);

  const loadEmpresa = async (empresaId) => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const emp = response.data.find(e => e.id === empresaId);
      setEmpresa(emp);
      
      if (emp) {
        loadLogsAcoes(emp.id);
        if (user.perfil === 'admin') {
          loadLogsSessoes(emp.id);
          loadRelatorio(emp.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const loadLogsAcoes = async (empresaId) => {
    setLoading(true);
    try {
      const params = { empresa_id: empresaId, limit: 100 };
      if (filtroModulo) params.modulo = filtroModulo;
      
      const response = await axios.get(`${API}/logs/acoes`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setLogsAcoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar logs de ações:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogsSessoes = async (empresaId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/logs/sessoes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { empresa_id: empresaId, limit: 50 }
      });
      setLogsSessoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar logs de sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatorio = async (empresaId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/logs/relatorio`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { empresa_id: empresaId }
      });
      setRelatorio(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuracao = (segundos) => {
    if (!segundos) return '0s';
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    
    if (horas > 0) return `${horas}h ${minutos}m`;
    if (minutos > 0) return `${minutos}m ${segs}s`;
    return `${segs}s`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  if (!empresa) {
    return (
      <div className="container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Selecione uma empresa</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📊 Logs e Relatórios</h2>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Empresa: {empresa.razao_social}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '1.5rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0'
        }}>
          <button
            onClick={() => setActiveTab('acoes')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'acoes' ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === 'acoes' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'acoes' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '0.9375rem'
            }}
          >
            📝 Ações
          </button>
          
          {user.perfil === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('sessoes')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'sessoes' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  color: activeTab === 'sessoes' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'sessoes' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '0.9375rem'
                }}
              >
                ⏱️ Sessões
              </button>
              
              <button
                onClick={() => setActiveTab('relatorio')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'relatorio' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  color: activeTab === 'relatorio' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'relatorio' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '0.9375rem'
                }}
              >
                📈 Relatório
              </button>
            </>
          )}
        </div>

        {/* Conteúdo das Tabs */}
        <div style={{ marginTop: '2rem' }}>
          {activeTab === 'acoes' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <select
                  className="form-input"
                  value={filtroModulo}
                  onChange={(e) => {
                    setFiltroModulo(e.target.value);
                    loadLogsAcoes(empresa.id);
                  }}
                  style={{ maxWidth: '300px' }}
                >
                  <option value="">Todos os módulos</option>
                  <option value="auth">Autenticação</option>
                  <option value="transacoes">Transações</option>
                  <option value="vendas">Vendas</option>
                  <option value="estoque">Estoque</option>
                  <option value="empresas">Empresas</option>
                </select>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</div>
              ) : logsAcoes.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Usuário</th>
                      <th>Ação</th>
                      <th>Módulo</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsAcoes.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.timestamp)}</td>
                        <td>{log.user_email}</td>
                        <td>{log.acao}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.625rem',
                            borderRadius: '1rem',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.8125rem'
                          }}>
                            {log.modulo}
                          </span>
                        </td>
                        <td>{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <div className="empty-state-text">Nenhuma ação registrada</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessoes' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</div>
              ) : logsSessoes.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Login</th>
                      <th>Logout</th>
                      <th>Duração</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsSessoes.map((sessao) => (
                      <tr key={sessao.id}>
                        <td>{sessao.user_email}</td>
                        <td>{formatDateTime(sessao.login_at)}</td>
                        <td>{formatDateTime(sessao.logout_at)}</td>
                        <td>{formatDuracao(sessao.duracao_segundos)}</td>
                        <td>{sessao.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">⏱️</div>
                  <div className="empty-state-text">Nenhuma sessão registrada</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'relatorio' && relatorio && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {relatorio.total_acoes}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de Ações
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
                <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {formatDuracao(relatorio.tempo_medio_sessao_segundos)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Tempo Médio de Sessão
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {relatorio.total_sessoes}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de Sessões
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                gridColumn: 'span 2'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600' }}>
                  📊 Ações por Módulo
                </h3>
                {relatorio.acoes_por_modulo.map((item) => (
                  <div key={item._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span>{item._id}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                gridColumn: 'span 2'
              }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600' }}>
                  👑 Usuários Mais Ativos
                </h3>
                {relatorio.usuarios_mais_ativos.map((item) => (
                  <div key={item._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span>{item._id}</span>
                    <strong>{item.count} ações</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Logs;
