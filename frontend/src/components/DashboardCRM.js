import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function DashboardCRM({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#22c55e', '#6b7280'];

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadMetrics();
    }
  }, [empresa]);

  const loadEmpresa = async () => {
    try {
      const res = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.length > 0) setEmpresa(res.data[0]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/crm/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/crm/export/leads`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!empresa) {
    return <div className="dashboard"><div className="empty-state">Nenhuma empresa cadastrada</div></div>;
  }

  if (loading || !metrics) {
    return <div className="dashboard"><div className="empty-state">Carregando métricas...</div></div>;
  }

  const statusData = Object.entries(metrics.leads_por_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count
  }));

  const origemData = Object.entries(metrics.leads_por_origem).map(([origem, count]) => ({
    name: origem.charAt(0).toUpperCase() + origem.slice(1),
    count: count
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📊 Dashboard CRM</h1>
          <p className="dashboard-subtitle">Métricas e Desempenho</p>
        </div>
        <button className="btn-success" onClick={handleExport}>
          📥 Exportar Leads (CSV)
        </button>
      </div>

      {/* KPIs Principais */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-label">Total de Leads</div>
          <div className="metric-value positive">{metrics.total_leads}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Valor Pipeline</div>
          <div className="metric-value positive">R$ {metrics.valor_total_pipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Ganhos no Mês</div>
          <div className="metric-value positive">{metrics.leads_vencidos_mes}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Perdidos no Mês</div>
          <div className="metric-value negative">{metrics.leads_perdidos_mes}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Taxa de Conversão</div>
          <div className="metric-value positive">
            {metrics.leads_vencidos_mes > 0 ? 
              ((metrics.leads_vencidos_mes / (metrics.leads_vencidos_mes + metrics.leads_perdidos_mes)) * 100).toFixed(1) : 0
            }%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {/* Gráfico Pizza - Distribuição por Status */}
        <div className="content-card">
          <h3 className="card-title">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico Barras - Leads por Origem */}
        <div className="content-card">
          <h3 className="card-title">Leads por Origem</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={origemData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Desempenho por Vendedor */}
      {metrics.desempenho_vendedores.length > 0 && (
        <div className="content-card" style={{ marginTop: '2rem' }}>
          <h3 className="card-title">Desempenho por Vendedor</h3>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Total Leads</th>
                  <th>Ganhos</th>
                  <th>Perdidos</th>
                  <th>Taxa Conversão</th>
                  <th>Valor Ganho</th>
                </tr>
              </thead>
              <tbody>
                {metrics.desempenho_vendedores.map((v, idx) => {
                  const taxa = v.total_leads > 0 ? ((v.leads_ganhos / v.total_leads) * 100).toFixed(1) : 0;
                  return (
                    <tr key={idx}>
                      <td>{v.user_id}</td>
                      <td>{v.total_leads}</td>
                      <td><span className="badge badge-receita">{v.leads_ganhos}</span></td>
                      <td><span className="badge badge-despesa">{v.leads_perdidos}</span></td>
                      <td><strong>{taxa}%</strong></td>
                      <td>R$ {v.valor_ganho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Taxas de Conversão por Etapa */}
      <div className="content-card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title">Taxa de Conversão por Etapa</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {Object.entries(metrics.taxa_conversao).map(([status, taxa]) => (
            <div key={status} style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {taxa.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardCRM;
