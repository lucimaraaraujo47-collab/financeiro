import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Dashboard({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get empresas
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (empresasRes.data.length > 0) {
        const emp = empresasRes.data[0];
        setEmpresa(emp);

        // Get dashboard data
        const dashRes = await axios.get(`${API}/empresas/${emp.id}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboard(dashRes.data);

        // Get contas bancárias
        const contasRes = await axios.get(`${API}/empresas/${emp.id}/contas-bancarias`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContasBancarias(contasRes.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard"><div className="loading-screen">Carregando dashboard...</div></div>;
  }

  if (!empresa) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-text">Nenhuma empresa cadastrada</div>
          <div className="empty-state-subtext">Configure sua empresa primeiro para começar</div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="dashboard"><div className="loading-screen">Carregando dados...</div></div>;
  }

  const maxValue = Math.max(...dashboard.despesas_por_categoria.map(d => d.valor), 1);
  const maxCC = Math.max(...dashboard.despesas_por_centro_custo.map(d => d.valor), 1);

  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Financeiro</h1>
        <p className="dashboard-subtitle">{empresa.razao_social}</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Receitas</div>
          <div className="metric-value positive" data-testid="total-receitas">
            R$ {dashboard.total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Despesas</div>
          <div className="metric-value negative" data-testid="total-despesas">
            R$ {dashboard.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Saldo (Receitas - Despesas)</div>
          <div className={`metric-value ${dashboard.saldo >= 0 ? 'positive' : 'negative'}`} data-testid="saldo">
            R$ {dashboard.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">💰 Saldo em Contas ({dashboard.num_contas || 0})</div>
          <div className={`metric-value ${dashboard.saldo_contas >= 0 ? 'positive' : 'negative'}`} data-testid="saldo-contas">
            R$ {(dashboard.saldo_contas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">💳 Limite Disponível ({dashboard.num_cartoes || 0} cartões)</div>
          <div className="metric-value positive" data-testid="limite-cartoes">
            R$ {(dashboard.saldo_cartoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Despesas por Categoria</h2>
        </div>
        {dashboard.despesas_por_categoria.length > 0 ? (
          <div className="chart-container" data-testid="despesas-por-categoria">
            {dashboard.despesas_por_categoria.map((item, idx) => (
              <div className="chart-item" key={idx}>
                <div className="chart-label">
                  <span>{item.categoria}</span>
                  <span>R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ width: `${(item.valor / maxValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-text">Nenhuma despesa registrada</div>
          </div>
        )}
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Despesas por Centro de Custo</h2>
        </div>
        {dashboard.despesas_por_centro_custo.length > 0 ? (
          <div className="chart-container" data-testid="despesas-por-centro-custo">
            {dashboard.despesas_por_centro_custo.map((item, idx) => (
              <div className="chart-item" key={idx}>
                <div className="chart-label">
                  <span>{item.centro_custo}</span>
                  <span>R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ width: `${(item.valor / maxCC) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-text">Nenhuma despesa registrada</div>
          </div>
        )}
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Transações Recentes</h2>
        </div>
        {dashboard.transacoes_recentes.length > 0 ? (
          <div className="transactions-list" data-testid="transacoes-recentes">
            {dashboard.transacoes_recentes.map((t, idx) => (
              <div className="transaction-item" key={idx}>
                <div className="transaction-info">
                  <div className="transaction-description">{t.descricao}</div>
                  <div className="transaction-meta">
                    {t.fornecedor} • {new Date(t.data_competencia).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className={`transaction-amount ${t.tipo}`}>
                  {t.tipo === 'despesa' ? '-' : '+'} R$ {t.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-text">Nenhuma transação registrada</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;