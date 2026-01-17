import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function OrdensServico({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [showDetalhes, setShowDetalhes] = useState(null);
  const [showAtribuir, setShowAtribuir] = useState(null);
  const [showReagendar, setShowReagendar] = useState(null);
  const [message, setMessage] = useState('');
  const [atribuirForm, setAtribuirForm] = useState({
    tecnico_id: '',
    data_agendamento: '',
    horario_previsto: ''
  });
  const [reagendarForm, setReagendarForm] = useState({
    tecnico_id: '',
    data_agendamento: '',
    horario_previsto: '',
    motivo: ''
  });

  const statusLabels = {
    aberta: { label: 'Aberta', color: '#6b7280', icon: '📄' },
    agendada: { label: 'Agendada', color: '#8b5cf6', icon: '📅' },
    em_andamento: { label: 'Em Andamento', color: '#f59e0b', icon: '⚡' },
    aguardando_assinatura: { label: 'Aguardando Assinatura', color: '#3b82f6', icon: '✍️' },
    concluida: { label: 'Concluída', color: '#10b981', icon: '✅' },
    cancelada: { label: 'Cancelada', color: '#ef4444', icon: '❌' }
  };

  const tipoLabels = {
    instalacao: { label: 'Instalação', color: '#3b82f6', icon: '📦' },
    manutencao: { label: 'Manutenção', color: '#f59e0b', icon: '🔧' },
    troca: { label: 'Troca', color: '#8b5cf6', icon: '🔄' },
    retirada: { label: 'Retirada', color: '#ef4444', icon: '📤' }
  };

  const prioridadeLabels = {
    baixa: { label: 'Baixa', color: '#6b7280' },
    normal: { label: 'Normal', color: '#3b82f6' },
    alta: { label: 'Alta', color: '#f59e0b' },
    urgente: { label: 'Urgente', color: '#ef4444' }
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
        
        let url = `${API}/empresas/${emp.id}/ordens-servico`;
        const params = [];
        if (filtroStatus) params.push(`status=${filtroStatus}`);
        if (filtroTipo) params.push(`tipo=${filtroTipo}`);
        if (params.length) url += '?' + params.join('&');
        
        const [ordensRes, tecnicosRes] = await Promise.all([
          axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setOrdens(ordensRes.data || []);
        // Filtrar apenas técnicos
        setTecnicos(tecnicosRes.data?.filter(u => u.perfil === 'tecnico' || u.perfil === 'admin') || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetalhes = async (osId) => {
    try {
      const res = await axios.get(`${API}/ordens-servico/${osId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDetalhes(res.data);
    } catch (error) {
      setMessage('❌ Erro ao carregar detalhes');
    }
  };

  const handleAtribuir = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/ordens-servico/${showAtribuir}/atribuir`, atribuirForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Técnico atribuído com sucesso!');
      setShowAtribuir(null);
      setAtribuirForm({ tecnico_id: '', data_agendamento: '', horario_previsto: '' });
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao atribuir'));
    }
  };

  const handleReagendar = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/ordens-servico/${showReagendar.id}/atribuir`, {
        tecnico_id: reagendarForm.tecnico_id || showReagendar.tecnico_id,
        data_agendamento: reagendarForm.data_agendamento,
        horario_previsto: reagendarForm.horario_previsto
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ OS reagendada com sucesso!');
      setShowReagendar(null);
      setReagendarForm({ tecnico_id: '', data_agendamento: '', horario_previsto: '', motivo: '' });
      loadData();
      if (showDetalhes?.id === showReagendar.id) {
        loadDetalhes(showReagendar.id);
      }
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao reagendar'));
    }
  };

  const openReagendar = (os) => {
    setReagendarForm({
      tecnico_id: os.tecnico_id || '',
      data_agendamento: os.data_agendamento || '',
      horario_previsto: os.horario_previsto || '',
      motivo: ''
    });
    setShowReagendar(os);
  };
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao atribuir'));
    }
  };

  const handleStatusChange = async (osId, novoStatus) => {
    try {
      await axios.patch(`${API}/ordens-servico/${osId}/status`, { status: novoStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`✅ Status atualizado para ${statusLabels[novoStatus]?.label}`);
      loadData();
      if (showDetalhes?.id === osId) {
        loadDetalhes(osId);
      }
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao atualizar status'));
    }
  };

  const handleChecklistUpdate = async (osId, itemIndex, concluido) => {
    try {
      await axios.patch(`${API}/ordens-servico/${osId}/checklist`, {
        item_index: itemIndex,
        concluido: concluido
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadDetalhes(osId);
    } catch (error) {
      setMessage('❌ Erro ao atualizar checklist');
    }
  };

  if (loading) {
    return <div className="dashboard"><div className="loading-screen">Carregando...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🛠️ Ordens de Serviço</h1>
        <p className="dashboard-subtitle">Gerencie instalações, manutenções e retiradas</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Modal de Atribuir Técnico */}
      {showAtribuir && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            padding: '2rem'
          }}>
            <h3 style={{ marginTop: 0 }}>👷 Atribuir Técnico</h3>
            <form onSubmit={handleAtribuir}>
              <div className="form-group">
                <label className="form-label">Técnico *</label>
                <select
                  className="form-select"
                  value={atribuirForm.tecnico_id}
                  onChange={(e) => setAtribuirForm({ ...atribuirForm, tecnico_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data do Agendamento</label>
                <input
                  type="date"
                  className="form-input"
                  value={atribuirForm.data_agendamento}
                  onChange={(e) => setAtribuirForm({ ...atribuirForm, data_agendamento: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Horário Previsto</label>
                <input
                  type="time"
                  className="form-input"
                  value={atribuirForm.horario_previsto}
                  onChange={(e) => setAtribuirForm({ ...atribuirForm, horario_previsto: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-success">Atribuir</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAtribuir(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhes && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{showDetalhes.numero}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${tipoLabels[showDetalhes.tipo]?.color}20`,
                    color: tipoLabels[showDetalhes.tipo]?.color,
                    borderRadius: '20px',
                    fontSize: '0.875rem'
                  }}>
                    {tipoLabels[showDetalhes.tipo]?.icon} {tipoLabels[showDetalhes.tipo]?.label}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${statusLabels[showDetalhes.status]?.color}20`,
                    color: statusLabels[showDetalhes.status]?.color,
                    borderRadius: '20px',
                    fontSize: '0.875rem'
                  }}>
                    {statusLabels[showDetalhes.status]?.icon} {statusLabels[showDetalhes.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowDetalhes(null)} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Cliente */}
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>👤 Cliente</h4>
                <p><strong>Nome:</strong> {showDetalhes.cliente?.nome_completo}</p>
                <p><strong>Telefone:</strong> {showDetalhes.cliente?.telefone}</p>
                <p><strong>Endereço:</strong> {showDetalhes.endereco_servico}</p>
              </div>

              {/* Agendamento */}
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>📅 Agendamento</h4>
                <p><strong>Técnico:</strong> {showDetalhes.tecnico_nome || 'Não atribuído'}</p>
                <p><strong>Data:</strong> {showDetalhes.data_agendamento || 'Não agendado'}</p>
                <p><strong>Horário:</strong> {showDetalhes.horario_previsto || '-'}</p>
              </div>

              {/* Checklist */}
              <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                <h4 style={{ marginTop: 0, color: '#1e40af' }}>✅ Checklist</h4>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {showDetalhes.checklist?.map((item, idx) => (
                    <label key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem',
                      background: item.concluido ? '#ecfdf5' : '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={(e) => handleChecklistUpdate(showDetalhes.id, idx, e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span style={{
                        textDecoration: item.concluido ? 'line-through' : 'none',
                        color: item.concluido ? '#6b7280' : '#1e293b'
                      }}>
                        {item.item}
                        {item.obrigatorio && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contrato */}
              {showDetalhes.contrato && (
                <div style={{ padding: '1rem', background: showDetalhes.contrato_assinado ? '#ecfdf5' : '#fef3c7', borderRadius: '8px', gridColumn: 'span 2' }}>
                  <h4 style={{ marginTop: 0, color: showDetalhes.contrato_assinado ? '#065f46' : '#92400e' }}>
                    📝 Contrato {showDetalhes.contrato_assinado ? '✅ Assinado' : '⚠️ Pendente'}
                  </h4>
                  <p><strong>Status:</strong> {showDetalhes.contrato.status}</p>
                  {!showDetalhes.contrato_assinado && (
                    <p style={{ color: '#92400e' }}>
                      O contrato deve ser assinado pelo cliente antes de concluir a OS.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {showDetalhes.status === 'aberta' && (
                <button className="btn-primary" onClick={() => { setShowAtribuir(showDetalhes.id); setShowDetalhes(null); }}>
                  👷 Atribuir Técnico
                </button>
              )}
              {showDetalhes.status === 'agendada' && (
                <button className="btn-success" onClick={() => handleStatusChange(showDetalhes.id, 'em_andamento')}>
                  ▶️ Iniciar Execução
                </button>
              )}
              {showDetalhes.status === 'em_andamento' && (
                <button className="btn-success" onClick={() => handleStatusChange(showDetalhes.id, 'concluida')}>
                  ✅ Concluir OS
                </button>
              )}
              {['aberta', 'agendada'].includes(showDetalhes.status) && (
                <button className="btn-secondary" style={{ color: '#ef4444' }} onClick={() => handleStatusChange(showDetalhes.id, 'cancelada')}>
                  ❌ Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Lista de OS</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select
              className="form-select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">Todos Status</option>
              {Object.entries(statusLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">Todos Tipos</option>
              {Object.entries(tipoLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de OS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
          {ordens.map(os => {
            const statusInfo = statusLabels[os.status] || {};
            const tipoInfo = tipoLabels[os.tipo] || {};
            const prioridadeInfo = prioridadeLabels[os.prioridade] || {};
            
            return (
              <div key={os.id} style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                borderLeft: `4px solid ${statusInfo.color}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{os.numero}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        background: `${tipoInfo.color}20`,
                        color: tipoInfo.color,
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        background: `${prioridadeInfo.color}20`,
                        color: prioridadeInfo.color,
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>
                        {prioridadeInfo.label}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${statusInfo.color}20`,
                    color: statusInfo.color,
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>👤</strong> {os.cliente_nome}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: '#64748b' }}>
                    <strong>📍</strong> {os.endereco_servico?.substring(0, 50)}...
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>👷</strong> {os.tecnico_nome}
                  </p>
                  {os.data_agendamento && (
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>📅</strong> {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
                      {os.horario_previsto && ` às ${os.horario_previsto}`}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    onClick={() => loadDetalhes(os.id)}
                  >
                    👁️ Detalhes
                  </button>
                  {os.status === 'aberta' && (
                    <button
                      className="btn-success"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => setShowAtribuir(os.id)}
                    >
                      👷 Atribuir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {ordens.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🛠️</div>
            <div className="empty-state-text">Nenhuma OS encontrada</div>
            <div className="empty-state-subtext">As OS são geradas automaticamente nas vendas</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdensServico;