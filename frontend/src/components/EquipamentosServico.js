import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

function EquipamentosServico({ user, token }) {
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(null);
  const [showTransferir, setShowTransferir] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    numero_serie: '',
    tipo: '',
    marca: '',
    modelo: '',
    descricao: '',
    data_aquisicao: '',
    valor_aquisicao: '',
    garantia_ate: ''
  });
  const [transferenciaForm, setTransferenciaForm] = useState({
    destino_tipo: 'deposito',
    destino_id: '',
    destino_nome: '',
    motivo: ''
  });
  const [tecnicos, setTecnicos] = useState([]);

  const statusLabels = {
    disponivel: { label: 'Disponível', color: '#10b981', icon: '✅' },
    em_uso: { label: 'Em Uso', color: '#3b82f6', icon: '🏠' },
    em_manutencao: { label: 'Em Manutenção', color: '#f59e0b', icon: '🔧' },
    indisponivel: { label: 'Indisponível', color: '#6b7280', icon: '⚠️' },
    baixado: { label: 'Baixado', color: '#ef4444', icon: '❌' }
  };

  useEffect(() => {
    loadData();
  }, [filtroStatus, filtroTipo]);

  const loadData = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (empresasRes.data.length > 0) {
        const emp = empresasRes.data[0];
        setEmpresa(emp);

        let url = `${API}/empresas/${emp.id}/equipamentos-tecnicos`;
        const params = [];
        if (filtroStatus) params.push(`status=${filtroStatus}`);
        if (filtroTipo) params.push(`tipo=${filtroTipo}`);
        if (params.length) url += '?' + params.join('&');

        const [equipRes, tiposRes, depositosRes, dashRes, tecnicosRes] = await Promise.all([
          axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/empresas/${emp.id}/tipos-equipamento`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/empresas/${emp.id}/depositos`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/empresas/${emp.id}/equipamentos-tecnicos/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setEquipamentos(equipRes.data || []);
        setTipos(tiposRes.data || []);
        setDepositos(depositosRes.data || []);
        setDashboard(dashRes.data);
        setTecnicos(tecnicosRes.data?.filter(u => u.perfil === 'tecnico' || u.perfil === 'admin') || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('❌ Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa) return;

    try {
      const payload = {
        ...formData,
        valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null
      };

      await axios.post(`${API}/empresas/${empresa.id}/equipamentos-tecnicos`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('✅ Equipamento cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        numero_serie: '',
        tipo: '',
        marca: '',
        modelo: '',
        descricao: '',
        data_aquisicao: '',
        valor_aquisicao: '',
        garantia_ate: ''
      });
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao cadastrar'));
    }
  };

  const handleTransferir = async (e) => {
    e.preventDefault();
    if (!showTransferir) return;

    try {
      await axios.post(`${API}/equipamentos-tecnicos/${showTransferir.id}/transferir`, transferenciaForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('✅ Equipamento transferido!');
      setShowTransferir(null);
      setTransferenciaForm({ destino_tipo: 'deposito', destino_id: '', destino_nome: '', motivo: '' });
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao transferir'));
    }
  };

  const loadDetalhes = async (equipId) => {
    try {
      const res = await axios.get(`${API}/equipamentos-tecnicos/${equipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDetalhes(res.data);
    } catch (error) {
      setMessage('❌ Erro ao carregar detalhes');
    }
  };

  const handleDestinoChange = (tipo, id, nome) => {
    setTransferenciaForm({
      ...transferenciaForm,
      destino_tipo: tipo,
      destino_id: id,
      destino_nome: nome
    });
  };

  if (loading) {
    return <div className="dashboard"><div className="loading-screen">Carregando...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📦 Equipamentos</h1>
        <p className="dashboard-subtitle">Gestão de equipamentos com histórico vitalício</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-label">Total</div>
            <div className="metric-value" style={{ color: '#1e40af' }}>{dashboard.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">✅ Disponíveis</div>
            <div className="metric-value positive">{dashboard.por_status?.disponivel || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">🏠 Em Uso</div>
            <div className="metric-value" style={{ color: '#3b82f6' }}>{dashboard.por_status?.em_uso || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">🔧 Manutenção</div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{dashboard.por_status?.em_manutencao || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">❌ Baixados</div>
            <div className="metric-value negative">{dashboard.por_status?.baixado || 0}</div>
          </div>
        </div>
      )}

      {/* Modal Detalhes com Histórico */}
      {showDetalhes && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '95%',
            maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>📦 {showDetalhes.numero_serie}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${statusLabels[showDetalhes.status]?.color}20`,
                    color: statusLabels[showDetalhes.status]?.color,
                    borderRadius: '20px', fontSize: '0.875rem'
                  }}>
                    {statusLabels[showDetalhes.status]?.icon} {statusLabels[showDetalhes.status]?.label}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem', background: '#f1f5f9',
                    borderRadius: '20px', fontSize: '0.875rem'
                  }}>
                    {showDetalhes.tipo}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowDetalhes(null)} style={{
                background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'
              }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>📋 Informações</h4>
                <p><strong>Marca:</strong> {showDetalhes.marca || '-'}</p>
                <p><strong>Modelo:</strong> {showDetalhes.modelo || '-'}</p>
                <p><strong>Descrição:</strong> {showDetalhes.descricao || '-'}</p>
              </div>

              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>📍 Localização Atual</h4>
                <p><strong>Tipo:</strong> {showDetalhes.localizacao_tipo}</p>
                <p><strong>Local:</strong> {showDetalhes.localizacao_nome || '-'}</p>
                {showDetalhes.cliente_nome && (
                  <p><strong>Cliente:</strong> {showDetalhes.cliente_nome}</p>
                )}
              </div>
            </div>

            {/* Histórico Vitalício */}
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ color: '#1e40af' }}>📜 Histórico Vitalício</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {showDetalhes.historico?.map((h, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem', borderLeft: '3px solid #3b82f6',
                    marginBottom: '0.5rem', background: '#f8fafc', borderRadius: '0 8px 8px 0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{h.tipo?.replace('_', ' ')}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(h.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {h.cliente_nome && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>👤 {h.cliente_nome}</p>}
                    {h.tecnico_nome && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>👷 {h.tecnico_nome}</p>}
                    {h.os_numero && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>📋 {h.os_numero}</p>}
                    {h.observacao && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#64748b' }}>{h.observacao}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir */}
      {showTransferir && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '90%',
            maxWidth: '500px', padding: '2rem'
          }}>
            <h3 style={{ marginTop: 0 }}>🔄 Transferir Equipamento</h3>
            <p style={{ color: '#64748b' }}>
              <strong>{showTransferir.numero_serie}</strong> - {showTransferir.tipo}
            </p>
            
            <form onSubmit={handleTransferir}>
              <div className="form-group">
                <label className="form-label">Destino *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button type="button"
                    className={transferenciaForm.destino_tipo === 'deposito' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setTransferenciaForm({ ...transferenciaForm, destino_tipo: 'deposito', destino_id: '', destino_nome: '' })}
                  >🏢 Depósito</button>
                  <button type="button"
                    className={transferenciaForm.destino_tipo === 'tecnico' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setTransferenciaForm({ ...transferenciaForm, destino_tipo: 'tecnico', destino_id: '', destino_nome: '' })}
                  >👷 Técnico</button>
                </div>

                {transferenciaForm.destino_tipo === 'deposito' && (
                  <select className="form-select" value={transferenciaForm.destino_id}
                    onChange={(e) => {
                      const dep = depositos.find(d => d.id === e.target.value);
                      handleDestinoChange('deposito', e.target.value, dep?.nome || '');
                    }} required>
                    <option value="">Selecione o depósito</option>
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                )}

                {transferenciaForm.destino_tipo === 'tecnico' && (
                  <select className="form-select" value={transferenciaForm.destino_id}
                    onChange={(e) => {
                      const tec = tecnicos.find(t => t.id === e.target.value);
                      handleDestinoChange('tecnico', e.target.value, tec?.nome || '');
                    }} required>
                    <option value="">Selecione o técnico</option>
                    {tecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Motivo</label>
                <input type="text" className="form-input"
                  value={transferenciaForm.motivo}
                  onChange={(e) => setTransferenciaForm({ ...transferenciaForm, motivo: e.target.value })}
                  placeholder="Ex: Reposição de estoque"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-success">Transferir</button>
                <button type="button" className="btn-secondary" onClick={() => setShowTransferir(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Lista de Equipamentos</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select className="form-select" value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)} style={{ minWidth: '150px' }}>
              <option value="">Todos Status</option>
              {Object.entries(statusLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            <select className="form-select" value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)} style={{ minWidth: '150px' }}>
              <option value="">Todos Tipos</option>
              {tipos.map(t => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              ))}
            </select>
            <button className="btn-success" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Novo Equipamento'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Número de Série *</label>
                <input type="text" className="form-input" value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  placeholder="SN-123456789" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-select" value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Marca</label>
                <input type="text" className="form-input" value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Ex: TP-Link" />
              </div>
              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input type="text" className="form-input" value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex: Archer C6" />
              </div>
              <div className="form-group">
                <label className="form-label">Data Aquisição</label>
                <input type="date" className="form-input" value={formData.data_aquisicao}
                  onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Aquisição (R$)</label>
                <input type="number" step="0.01" className="form-input" value={formData.valor_aquisicao}
                  onChange={(e) => setFormData({ ...formData, valor_aquisicao: e.target.value })}
                  placeholder="199.90" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Descrição</label>
                <input type="text" className="form-input" value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição adicional do equipamento" />
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Cadastrar Equipamento</button>
            </div>
          </form>
        )}

        {/* Tabela de Equipamentos */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Nº Série</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Tipo</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Marca/Modelo</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Localização</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map(equip => {
                const statusInfo = statusLabels[equip.status] || {};
                return (
                  <tr key={equip.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', fontFamily: 'monospace' }}>
                      {equip.numero_serie}
                    </td>
                    <td style={{ padding: '1rem' }}>{equip.tipo}</td>
                    <td style={{ padding: '1rem' }}>
                      {equip.marca || '-'} {equip.modelo ? `/ ${equip.modelo}` : ''}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.25rem 0.75rem', background: `${statusInfo.color}20`,
                        color: statusInfo.color, borderRadius: '20px', fontSize: '0.8rem'
                      }}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>{equip.localizacao_tipo}</span>
                        {equip.localizacao_nome && (
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{equip.localizacao_nome}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                          onClick={() => loadDetalhes(equip.id)}
                          title="Ver detalhes"
                          data-testid={`btn-detalhes-${equip.id}`}>
                          👁️
                        </button>
                        <button className="btn-info" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => navigate('/historico-equipamentos', { state: { equipamentoId: equip.id } })}
                          title="Ver histórico vitalício"
                          data-testid={`btn-historico-${equip.id}`}>
                          📜
                        </button>
                        {equip.status !== 'baixado' && (
                          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            onClick={() => setShowTransferir(equip)}
                            title="Transferir"
                            data-testid={`btn-transferir-${equip.id}`}>
                            🔄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {equipamentos.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Nenhum equipamento encontrado</div>
            <div className="empty-state-subtext">Cadastre seu primeiro equipamento</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EquipamentosServico;
