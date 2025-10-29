import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function AnaliseIA({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [analiseFinanceira, setAnaliseFinanceira] = useState(null);
  const [anomalias, setAnomalias] = useState(null);
  const [previsao, setPrevisao] = useState(null);
  const [loading, setLoading] = useState({});
  const [activeTab, setActiveTab] = useState('analise');

  useEffect(() => {
    loadEmpresa();
  }, []);

  const loadEmpresa = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (empresasRes.data.length > 0) {
        setEmpresa(empresasRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading empresa:', error);
    }
  };

  const loadAnaliseFinanceira = async () => {
    if (!empresa) return;
    
    setLoading(prev => ({ ...prev, analise: true }));
    try {
      const response = await axios.get(
        `${API}/empresas/${empresa.id}/ai/analise-financeira?periodo_dias=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnaliseFinanceira(response.data);
    } catch (error) {
      console.error('Error:', error);
      setAnaliseFinanceira({ status: 'error', message: error.response?.data?.detail || error.message });
    } finally {
      setLoading(prev => ({ ...prev, analise: false }));
    }
  };

  const loadAnomalias = async () => {
    if (!empresa) return;
    
    setLoading(prev => ({ ...prev, anomalias: true }));
    try {
      const response = await axios.get(
        `${API}/empresas/${empresa.id}/ai/anomalias`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnomalias(response.data);
    } catch (error) {
      console.error('Error:', error);
      setAnomalias({ status: 'error', message: error.response?.data?.detail || error.message });
    } finally {
      setLoading(prev => ({ ...prev, anomalias: false }));
    }
  };

  const loadPrevisao = async () => {
    if (!empresa) return;
    
    setLoading(prev => ({ ...prev, previsao: true }));
    try {
      const response = await axios.get(
        `${API}/empresas/${empresa.id}/ai/previsao-fluxo?dias_futuros=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrevisao(response.data);
    } catch (error) {
      console.error('Error:', error);
      setPrevisao({ status: 'error', message: error.response?.data?.detail || error.message });
    } finally {
      setLoading(prev => ({ ...prev, previsao: false }));
    }
  };

  useEffect(() => {
    if (empresa) {
      if (activeTab === 'analise' && !analiseFinanceira) loadAnaliseFinanceira();
      if (activeTab === 'anomalias' && !anomalias) loadAnomalias();
      if (activeTab === 'previsao' && !previsao) loadPrevisao();
    }
  }, [activeTab, empresa]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatAnaliseText = (text) => {
    // Converter markdown básico em HTML
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={idx} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#6366f1' }}>{line.replace(/\*\*/g, '')}</h4>;
      } else if (line.startsWith('- ')) {
        return <li key={idx} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{line.substring(2)}</li>;
      } else if (line.trim()) {
        return <p key={idx} style={{ marginBottom: '0.75rem' }}>{line}</p>;
      }
      return null;
    });
  };

  if (!empresa) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-text">Nenhuma empresa cadastrada</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🤖 Análise com IA</h1>
        <p className="dashboard-subtitle">Insights inteligentes sobre suas finanças</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #374151', paddingBottom: '0.5rem' }}>
        <button
          className={activeTab === 'analise' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('analise')}
          style={{ borderRadius: '8px 8px 0 0' }}
        >
          📊 Análise Financeira
        </button>
        <button
          className={activeTab === 'anomalias' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('anomalias')}
          style={{ borderRadius: '8px 8px 0 0' }}
        >
          ⚠️ Anomalias
        </button>
        <button
          className={activeTab === 'previsao' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('previsao')}
          style={{ borderRadius: '8px 8px 0 0' }}
        >
          🔮 Previsão
        </button>
      </div>

      {/* Análise Financeira */}
      {activeTab === 'analise' && (
        <>
          {loading.analise ? (
            <div className="loading-state">🤖 Analisando dados com IA...</div>
          ) : analiseFinanceira ? (
            <>
              {analiseFinanceira.status === 'success' ? (
                <>
                  {/* Métricas */}
                  <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
                    <div className="metric-card">
                      <div className="metric-label">Receitas (30 dias)</div>
                      <div className="metric-value" style={{ color: '#6ee7b7' }}>
                        {formatCurrency(analiseFinanceira.metricas.total_receitas)}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Despesas (30 dias)</div>
                      <div className="metric-value" style={{ color: '#fca5a5' }}>
                        {formatCurrency(analiseFinanceira.metricas.total_despesas)}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Saldo</div>
                      <div 
                        className="metric-value" 
                        style={{ color: analiseFinanceira.metricas.saldo >= 0 ? '#6ee7b7' : '#fca5a5' }}
                      >
                        {formatCurrency(analiseFinanceira.metricas.saldo)}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Transações</div>
                      <div className="metric-value">{analiseFinanceira.metricas.num_transacoes}</div>
                    </div>
                  </div>

                  {/* Análise da IA */}
                  <div className="content-card">
                    <h3 className="card-title">💡 Insights da IA (GPT-4)</h3>
                    <div style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                      {formatAnaliseText(analiseFinanceira.analise_ia)}
                    </div>
                  </div>

                  <button 
                    className="btn-primary" 
                    onClick={loadAnaliseFinanceira}
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Atualizar Análise
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-text">{analiseFinanceira.message}</div>
                </div>
              )}
            </>
          ) : (
            <button className="btn-primary" onClick={loadAnaliseFinanceira}>
              🚀 Gerar Análise com IA
            </button>
          )}
        </>
      )}

      {/* Anomalias */}
      {activeTab === 'anomalias' && (
        <>
          {loading.anomalias ? (
            <div className="loading-state">🔍 Detectando anomalias...</div>
          ) : anomalias ? (
            <>
              {anomalias.status === 'success' ? (
                <>
                  <div className="content-card" style={{ marginBottom: '2rem' }}>
                    <h3 className="card-title">
                      ⚠️ Alertas de Gastos Incomuns
                    </h3>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                      Transações com valores significativamente acima da média da categoria
                    </p>
                  </div>

                  {anomalias.num_anomalias > 0 ? (
                    <div className="content-card">
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Fornecedor</th>
                              <th>Categoria</th>
                              <th>Valor</th>
                              <th>Média Cat.</th>
                              <th>Desvio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anomalias.anomalias.map((a, idx) => (
                              <tr key={idx}>
                                <td>{a.data}</td>
                                <td>{a.fornecedor}</td>
                                <td>{a.categoria}</td>
                                <td style={{ color: '#fca5a5', fontWeight: 600 }}>
                                  {formatCurrency(a.valor)}
                                </td>
                                <td>{formatCurrency(a.media_categoria)}</td>
                                <td>
                                  <span style={{ 
                                    background: a.desvio > 3 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: a.desvio > 3 ? '#fca5a5' : '#fcd34d',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px'
                                  }}>
                                    +{a.desvio.toFixed(1)}σ
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">✅</div>
                      <div className="empty-state-text">
                        Nenhuma anomalia detectada! Seus gastos estão dentro do padrão.
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn-primary" 
                    onClick={loadAnomalias}
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Atualizar
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-text">{anomalias.message}</div>
                </div>
              )}
            </>
          ) : (
            <button className="btn-primary" onClick={loadAnomalias}>
              🚀 Detectar Anomalias
            </button>
          )}
        </>
      )}

      {/* Previsão */}
      {activeTab === 'previsao' && (
        <>
          {loading.previsao ? (
            <div className="loading-state">🔮 Gerando previsão com IA...</div>
          ) : previsao ? (
            <>
              {previsao.status === 'success' ? (
                <>
                  {/* Previsão Numérica */}
                  <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
                    <div className="metric-card">
                      <div className="metric-label">Receitas Estimadas (30d)</div>
                      <div className="metric-value" style={{ color: '#6ee7b7' }}>
                        {formatCurrency(previsao.previsao_numerica.receitas_estimadas)}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Despesas Estimadas (30d)</div>
                      <div className="metric-value" style={{ color: '#fca5a5' }}>
                        {formatCurrency(previsao.previsao_numerica.despesas_estimadas)}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Saldo Estimado</div>
                      <div 
                        className="metric-value" 
                        style={{ color: previsao.previsao_numerica.saldo_estimado >= 0 ? '#6ee7b7' : '#fca5a5' }}
                      >
                        {formatCurrency(previsao.previsao_numerica.saldo_estimado)}
                      </div>
                    </div>
                  </div>

                  {/* Análise da IA */}
                  <div className="content-card">
                    <h3 className="card-title">🔮 Previsão da IA (GPT-4)</h3>
                    <div style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                      {formatAnaliseText(previsao.previsao_ia)}
                    </div>
                  </div>

                  <button 
                    className="btn-primary" 
                    onClick={loadPrevisao}
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Atualizar Previsão
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-text">{previsao.message}</div>
                </div>
              )}
            </>
          ) : (
            <button className="btn-primary" onClick={loadPrevisao}>
              🚀 Gerar Previsão
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AnaliseIA;
