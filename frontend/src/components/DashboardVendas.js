import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function DashboardVendas({ user, token }) {
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [metrics, setMetrics] = useState({
    total_clientes: 0,
    clientes_ativos: 0,
    vendas_ativas: 0,
    vendas_total: 0,
    receita_mensal: 0,
    faturas_pendentes: 0,
    faturas_vencidas: 0,
    taxa_inadimplencia: 0
  });
  const [ultimasVendas, setUltimasVendas] = useState([]);
  const [planosMaisVendidos, setPlanosMaisVendidos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get empresa
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (empresasRes.data.length > 0) {
        const empId = empresasRes.data[0].id;
        setEmpresaId(empId);
        
        // Load all data in parallel
        const [clientesRes, vendasRes, faturasRes] = await Promise.all([
          axios.get(`${API}/empresas/${empId}/clientes-venda`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${empId}/vendas`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${empId}/faturas`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        const clientes = clientesRes.data;
        const vendas = vendasRes.data;
        const faturas = faturasRes.data;
        
        // Calculate metrics
        const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
        const vendasAtivas = vendas.filter(v => v.status === 'ativo').length;
        const receitaMensal = vendas
          .filter(v => v.status === 'ativo')
          .reduce((sum, v) => sum + parseFloat(v.valor_mensalidade || 0), 0);
        
        const faturasPendentes = faturas.filter(f => f.status === 'pendente').length;
        const faturasVencidas = faturas.filter(f => f.status === 'vencido').length;
        const taxaInadimplencia = faturas.length > 0 
          ? ((faturasVencidas / faturas.length) * 100).toFixed(1)
          : 0;
        
        setMetrics({
          total_clientes: clientes.length,
          clientes_ativos: clientesAtivos,
          vendas_ativas: vendasAtivas,
          vendas_total: vendas.length,
          receita_mensal: receitaMensal,
          faturas_pendentes: faturasPendentes,
          faturas_vencidas: faturasVencidas,
          taxa_inadimplencia: taxaInadimplencia
        });
        
        // Last 5 sales
        setUltimasVendas(vendas.slice(0, 5));
        
        // Most sold plans
        const planosCount = {};
        vendas.forEach(v => {
          if (v.plano) {
            const planoNome = v.plano.nome;
            planosCount[planoNome] = (planosCount[planoNome] || 0) + 1;
          }
        });
        
        const planosArray = Object.entries(planosCount)
          .map(([nome, count]) => ({ nome, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setPlanosMaisVendidos(planosArray);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-screen">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📊 Dashboard de Vendas</h1>
        <p className="dashboard-subtitle">Visão geral de vendas e assinaturas</p>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div className="metric-icon">👥</div>
          <div className="metric-value">{metrics.total_clientes}</div>
          <div className="metric-label">Total de Clientes</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            {metrics.clientes_ativos} ativos
          </div>
        </div>

        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        }}>
          <div className="metric-icon">💰</div>
          <div className="metric-value">{metrics.vendas_ativas}</div>
          <div className="metric-label">Vendas Ativas</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            de {metrics.vendas_total} total
          </div>
        </div>

        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white'
        }}>
          <div className="metric-icon">💵</div>
          <div className="metric-value">R$ {metrics.receita_mensal.toFixed(2)}</div>
          <div className="metric-label">Receita Mensal Recorrente</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            MRR (Monthly Recurring Revenue)
          </div>
        </div>

        <div className="metric-card" style={{
          background: metrics.faturas_vencidas > 0 
            ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
            : 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          color: 'white'
        }}>
          <div className="metric-icon">{metrics.faturas_vencidas > 0 ? '⚠️' : '✅'}</div>
          <div className="metric-value">{metrics.taxa_inadimplencia}%</div>
          <div className="metric-label">Taxa de Inadimplência</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            {metrics.faturas_vencidas} faturas vencidas
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Últimas Vendas */}
        <div className="content-card">
          <h2 className="card-title">📋 Últimas Vendas</h2>
          {ultimasVendas.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📝</span>
              <p className="empty-state-text">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div>
              {ultimasVendas.map((venda, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderBottom: idx < ultimasVendas.length - 1 ? '1px solid #e5e7eb' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {venda.cliente?.nome_completo || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {venda.plano?.nome || 'N/A'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#16a34a' }}>
                      R$ {parseFloat(venda.valor_mensalidade || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Planos Mais Vendidos */}
        <div className="content-card">
          <h2 className="card-title">🏆 Planos Mais Vendidos</h2>
          {planosMaisVendidos.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📊</span>
              <p className="empty-state-text">Sem dados de vendas</p>
            </div>
          ) : (
            <div>
              {planosMaisVendidos.map((plano, idx) => {
                const maxCount = planosMaisVendidos[0]?.count || 1;
                const percentage = (plano.count / maxCount) * 100;
                
                return (
                  <div key={idx} style={{
                    padding: '12px 0',
                    borderBottom: idx < planosMaisVendidos.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: 'bold' }}>{plano.nome}</span>
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                        {plano.count} vendas
                      </span>
                    </div>
                    <div style={{
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      height: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        height: '100%',
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {(metrics.faturas_vencidas > 0 || metrics.faturas_pendentes > 5) && (
        <div className="content-card" style={{ 
          marginTop: '24px',
          background: '#fef3c7',
          border: '2px solid #f59e0b'
        }}>
          <h2 className="card-title" style={{ color: '#92400e' }}>⚠️ Alertas</h2>
          <div style={{ color: '#78350f' }}>
            {metrics.faturas_vencidas > 0 && (
              <div style={{ 
                padding: '12px',
                background: '#fee2e2',
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <strong>🚨 {metrics.faturas_vencidas} fatura(s) vencida(s)</strong>
                <p style={{ marginTop: '4px', fontSize: '14px' }}>
                  Ação necessária: Entre em contato com os clientes inadimplentes
                </p>
              </div>
            )}
            {metrics.faturas_pendentes > 5 && (
              <div style={{ 
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px'
              }}>
                <strong>📄 {metrics.faturas_pendentes} fatura(s) pendente(s)</strong>
                <p style={{ marginTop: '4px', fontSize: '14px' }}>
                  Lembre-se de acompanhar os pagamentos
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardVendas;
