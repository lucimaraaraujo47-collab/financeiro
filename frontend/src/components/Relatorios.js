import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

function Relatorios({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [tipoPeriodo, setTipoPeriodo] = useState('mensal');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadRelatorio();
    }
  }, [empresa, tipoPeriodo]);

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

  const loadRelatorio = async () => {
    if (!empresa) return;

    setLoading(true);
    setMessage('');

    try {
      let url = `${API}/empresas/${empresa.id}/relatorios?tipo_periodo=${tipoPeriodo}`;
      
      if (tipoPeriodo === 'personalizado' && periodoInicio && periodoFim) {
        url += `&periodo_inicio=${periodoInicio}&periodo_fim=${periodoFim}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRelatorio(response.data);
    } catch (error) {
      setMessage('Erro ao carregar relatório: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodoChange = (tipo) => {
    setTipoPeriodo(tipo);
  };

  const handleCustomPeriodoSubmit = () => {
    if (periodoInicio && periodoFim) {
      loadRelatorio();
    }
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExport = async (formato) => {
    if (!empresa) return;

    try {
      let url = `${API}/empresas/${empresa.id}/relatorios/export/${formato}?tipo_periodo=${tipoPeriodo}`;
      
      if (tipoPeriodo === 'personalizado' && periodoInicio && periodoFim) {
        url += `&periodo_inicio=${periodoInicio}&periodo_fim=${periodoFim}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Criar download do arquivo
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const extensoes = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf'
      };
      
      link.download = `relatorio_${tipoPeriodo}.${extensoes[formato]}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setMessage(`Relatório exportado com sucesso em ${formato.toUpperCase()}!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erro ao exportar relatório: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Preparar dados para gráfico de pizza - Despesas por Categoria
  const dadosPizzaCategorias = relatorio?.por_categoria
    .filter(c => c.total_despesas > 0)
    .map(c => ({
      name: c.categoria_nome,
      value: c.total_despesas
    })) || [];

  // Preparar dados para gráfico de barras - Centro de Custo
  const dadosBarrasCentros = relatorio?.por_centro_custo.map(cc => ({
    name: cc.centro_custo_nome,
    Receitas: cc.total_receitas,
    Despesas: cc.total_despesas,
    Lucro: cc.lucro
  })) || [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Relatórios Financeiros</h1>
        <p className="dashboard-subtitle">Análise detalhada por período</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {/* Filtros de Período */}
      <div className="content-card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title">Período de Análise</h3>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            className={tipoPeriodo === 'mensal' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => handlePeriodoChange('mensal')}
          >
            📅 Mensal
          </button>
          <button
            className={tipoPeriodo === 'anual' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => handlePeriodoChange('anual')}
          >
            📆 Anual
          </button>
          <button
            className={tipoPeriodo === 'personalizado' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => handlePeriodoChange('personalizado')}
          >
            🗓️ Personalizado
          </button>
        </div>

        {tipoPeriodo === 'personalizado' && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Data Início</label>
              <input
                type="date"
                className="form-input"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data Fim</label>
              <input
                type="date"
                className="form-input"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
            <button className="btn-success" onClick={handleCustomPeriodoSubmit}>
              Aplicar
            </button>
          </div>
        )}

        {/* Botões de Exportação */}
        {relatorio && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #374151' }}>
            <h4 style={{ marginBottom: '0.75rem', color: '#9ca3af' }}>Exportar Relatório</h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-success" 
                onClick={() => handleExport('csv')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                📄 CSV
              </button>
              <button 
                className="btn-success" 
                onClick={() => handleExport('excel')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                📊 Excel
              </button>
              <button 
                className="btn-success" 
                onClick={() => handleExport('pdf')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                📑 PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Carregando relatório...</div>
      ) : relatorio ? (
        <>
          {/* Resumo Geral */}
          <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
            <div className="metric-card">
              <div className="metric-label">Total de Receitas</div>
              <div className="metric-value" style={{ color: '#6ee7b7' }}>
                {formatCurrency(relatorio.resumo_geral.total_receitas)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total de Despesas</div>
              <div className="metric-value" style={{ color: '#fca5a5' }}>
                {formatCurrency(relatorio.resumo_geral.total_despesas)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Lucro/Prejuízo</div>
              <div 
                className="metric-value" 
                style={{ color: relatorio.resumo_geral.lucro >= 0 ? '#6ee7b7' : '#fca5a5' }}
              >
                {formatCurrency(relatorio.resumo_geral.lucro)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Transações</div>
              <div className="metric-value">{relatorio.resumo_geral.num_transacoes}</div>
            </div>
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Gráfico de Pizza - Despesas por Categoria */}
            <div className="content-card">
              <h3 className="card-title">Despesas por Categoria</h3>
              {dadosPizzaCategorias.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosPizzaCategorias}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosPizzaCategorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">Sem dados para exibir</div>
              )}
            </div>

            {/* Gráfico de Barras - Centro de Custo */}
            <div className="content-card">
              <h3 className="card-title">Análise por Centro de Custo</h3>
              {dadosBarrasCentros.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosBarrasCentros}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    />
                    <Legend />
                    <Bar dataKey="Receitas" fill="#6ee7b7" />
                    <Bar dataKey="Despesas" fill="#fca5a5" />
                    <Bar dataKey="Lucro" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">Sem dados para exibir</div>
              )}
            </div>
          </div>

          {/* Tabela Detalhada - Centro de Custo */}
          <div className="content-card" style={{ marginBottom: '2rem' }}>
            <h3 className="card-title">Detalhamento por Centro de Custo</h3>
            {relatorio.por_centro_custo.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Centro de Custo</th>
                      <th>Receitas</th>
                      <th>Despesas</th>
                      <th>Lucro</th>
                      <th>Transações</th>
                      <th>% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.por_centro_custo.map((cc) => (
                      <tr key={cc.centro_custo_id}>
                        <td>{cc.centro_custo_nome}</td>
                        <td style={{ color: '#6ee7b7' }}>{formatCurrency(cc.total_receitas)}</td>
                        <td style={{ color: '#fca5a5' }}>{formatCurrency(cc.total_despesas)}</td>
                        <td style={{ color: cc.lucro >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>
                          {formatCurrency(cc.lucro)}
                        </td>
                        <td>{cc.num_transacoes}</td>
                        <td>{cc.percentual_total}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">Nenhum centro de custo encontrado</div>
            )}
          </div>

          {/* Tabela Detalhada - Categoria */}
          <div className="content-card">
            <h3 className="card-title">Detalhamento por Categoria</h3>
            {relatorio.por_categoria.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Receitas</th>
                      <th>Despesas</th>
                      <th>Transações</th>
                      <th>% Despesas</th>
                      <th>% Receitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.por_categoria.map((cat) => (
                      <tr key={cat.categoria_id}>
                        <td>{cat.categoria_nome}</td>
                        <td style={{ color: '#6ee7b7' }}>{formatCurrency(cat.total_receitas)}</td>
                        <td style={{ color: '#fca5a5' }}>{formatCurrency(cat.total_despesas)}</td>
                        <td>{cat.num_transacoes}</td>
                        <td>{cat.percentual_despesas}%</td>
                        <td>{cat.percentual_receitas}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">Nenhuma categoria encontrada</div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">Selecione um período para gerar o relatório</div>
        </div>
      )}
    </div>
  );
}

export default Relatorios;
