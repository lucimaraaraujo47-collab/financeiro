import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function HistoricoEquipamento({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showManutencaoForm, setShowManutencaoForm] = useState(false);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [message, setMessage] = useState('');
  const [manutencaoForm, setManutencaoForm] = useState({
    defeito_relatado: '',
    diagnostico: '',
    custo_estimado: 0,
    data_previsao_saida: '',
    observacoes: ''
  });
  const [eventoForm, setEventoForm] = useState({
    tipo: 'OBSERVACAO',
    descricao: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) loadEquipamentos();
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

  const loadEquipamentos = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/equipamentos-tecnicos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEquipamentos(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadHistorico = async (equipId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/equipamentos/${equipId}/historico-completo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorico(res.data);
      setSelectedEquip(res.data.equipamento);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const handleManutencao = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/equipamentos/${selectedEquip.id}/manutencao`, manutencaoForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Manutenção registrada!');
      setShowManutencaoForm(false);
      setManutencaoForm({ defeito_relatado: '', diagnostico: '', custo_estimado: 0, data_previsao_saida: '', observacoes: '' });
      loadHistorico(selectedEquip.id);
    } catch (error) {
      setMessage('❌ Erro ao registrar manutenção');
    }
  };

  const handleEvento = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/equipamentos/${selectedEquip.id}/evento`, eventoForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Evento registrado!');
      setShowEventoForm(false);
      setEventoForm({ tipo: 'OBSERVACAO', descricao: '' });
      loadHistorico(selectedEquip.id);
    } catch (error) {
      setMessage('❌ Erro ao registrar evento');
    }
  };

  const filteredEquipamentos = equipamentos.filter(eq =>
    eq.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      disponivel: '#10b981',
      em_uso: '#3b82f6',
      em_manutencao: '#f59e0b',
      baixado: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      disponivel: 'Disponível',
      em_uso: 'Em Uso',
      em_manutencao: 'Manutenção',
      baixado: 'Baixado'
    };
    return labels[status] || status;
  };

  if (!empresa) {
    return <div className="dashboard-container"><p>Carregando...</p></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📜 Histórico Vitalício de Equipamentos</h1>
          <p className="dashboard-subtitle">Rastreie toda a vida útil de cada equipamento</p>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`}>
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedEquip ? '350px 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Lista de Equipamentos */}
        <div className="card">
          <div className="card-header">
            <h3>📦 Equipamentos</h3>
          </div>
          <div className="card-content">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Buscar por série, tipo, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredEquipamentos.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                  Nenhum equipamento encontrado
                </p>
              ) : (
                filteredEquipamentos.map(eq => (
                  <div
                    key={eq.id}
                    onClick={() => loadHistorico(eq.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      background: selectedEquip?.id === eq.id ? '#eff6ff' : '#f8fafc',
                      border: selectedEquip?.id === eq.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#1e293b' }}>{eq.numero_serie}</strong>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        background: getStatusColor(eq.status) + '20',
                        color: getStatusColor(eq.status)
                      }}>
                        {getStatusLabel(eq.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      {eq.tipo} {eq.marca && `• ${eq.marca}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detalhes e Timeline */}
        {selectedEquip && (
          <div>
            {/* Card do Equipamento */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>🔧 {selectedEquip.numero_serie}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => setShowEventoForm(true)}>
                    📝 Adicionar Evento
                  </button>
                  {selectedEquip.status !== 'em_manutencao' && (
                    <button className="btn-primary" onClick={() => setShowManutencaoForm(true)}>
                      🔧 Enviar para Manutenção
                    </button>
                  )}
                </div>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Tipo</span>
                    <p style={{ fontWeight: '600', margin: '4px 0' }}>{selectedEquip.tipo || 'N/A'}</p>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Marca/Modelo</span>
                    <p style={{ fontWeight: '600', margin: '4px 0' }}>{selectedEquip.marca} {selectedEquip.modelo}</p>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Status</span>
                    <p style={{ 
                      fontWeight: '600', 
                      margin: '4px 0',
                      color: getStatusColor(selectedEquip.status)
                    }}>
                      {getStatusLabel(selectedEquip.status)}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Localização</span>
                    <p style={{ fontWeight: '600', margin: '4px 0' }}>{selectedEquip.localizacao || 'N/A'}</p>
                  </div>
                </div>
                
                {historico && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '2rem', 
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>{historico.total_eventos}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Eventos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{historico.total_os}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ordens de Serviço</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>{historico.total_manutencoes}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Manutenções</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="card-header">
                <h3>📅 Timeline Completa</h3>
              </div>
              <div className="card-content">
                {loading ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando...</p>
                ) : historico?.timeline?.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Nenhum evento registrado</p>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: '30px' }}>
                    {/* Linha vertical */}
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: '#e2e8f0'
                    }} />
                    
                    {historico?.timeline?.map((evento, index) => (
                      <div key={index} style={{ 
                        position: 'relative', 
                        paddingBottom: '1.5rem',
                        paddingLeft: '20px'
                      }}>
                        {/* Bolinha */}
                        <div style={{
                          position: 'absolute',
                          left: '-19px',
                          top: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'white',
                          border: '2px solid #3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}>
                          {evento.icone}
                        </div>
                        
                        <div style={{
                          background: '#f8fafc',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <strong style={{ color: '#1e293b' }}>{evento.titulo}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {evento.data ? new Date(evento.data).toLocaleString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                          {evento.descricao && (
                            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                              {evento.descricao}
                            </p>
                          )}
                          {evento.os_numero && (
                            <span style={{
                              display: 'inline-block',
                              marginTop: '8px',
                              padding: '2px 8px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}>
                              OS: {evento.os_numero}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedEquip && (
          <div className="card">
            <div className="card-content" style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{ color: '#64748b' }}>Selecione um equipamento</h3>
              <p style={{ color: '#94a3b8' }}>Clique em um equipamento na lista para ver seu histórico completo</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Manutenção */}
      {showManutencaoForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>🔧 Enviar para Manutenção</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Equipamento: <strong>{selectedEquip?.numero_serie}</strong>
            </p>
            <form onSubmit={handleManutencao}>
              <div className="form-group">
                <label className="form-label">Defeito Relatado *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  required
                  value={manutencaoForm.defeito_relatado}
                  onChange={(e) => setManutencaoForm({...manutencaoForm, defeito_relatado: e.target.value})}
                  placeholder="Descreva o problema identificado..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnóstico Inicial</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={manutencaoForm.diagnostico}
                  onChange={(e) => setManutencaoForm({...manutencaoForm, diagnostico: e.target.value})}
                  placeholder="Diagnóstico preliminar..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={manutencaoForm.custo_estimado}
                    onChange={(e) => setManutencaoForm({...manutencaoForm, custo_estimado: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Previsão de Retorno</label>
                  <input
                    type="date"
                    className="form-input"
                    value={manutencaoForm.data_previsao_saida}
                    onChange={(e) => setManutencaoForm({...manutencaoForm, data_previsao_saida: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={manutencaoForm.observacoes}
                  onChange={(e) => setManutencaoForm({...manutencaoForm, observacoes: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary">🔧 Registrar Manutenção</button>
                <button type="button" className="btn-secondary" onClick={() => setShowManutencaoForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Evento */}
      {showEventoForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3>📝 Registrar Evento</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Equipamento: <strong>{selectedEquip?.numero_serie}</strong>
            </p>
            <form onSubmit={handleEvento}>
              <div className="form-group">
                <label className="form-label">Tipo de Evento</label>
                <select
                  className="form-select"
                  value={eventoForm.tipo}
                  onChange={(e) => setEventoForm({...eventoForm, tipo: e.target.value})}
                >
                  <option value="OBSERVACAO">📝 Observação</option>
                  <option value="INSPECAO">🔍 Inspeção</option>
                  <option value="AJUSTE">⚙️ Ajuste/Configuração</option>
                  <option value="TROCA_PECAS">🔧 Troca de Peças</option>
                  <option value="LIMPEZA">🧹 Limpeza</option>
                  <option value="GARANTIA">📋 Evento de Garantia</option>
                  <option value="OUTRO">📌 Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <textarea
                  className="form-input"
                  rows="4"
                  required
                  value={eventoForm.descricao}
                  onChange={(e) => setEventoForm({...eventoForm, descricao: e.target.value})}
                  placeholder="Descreva o evento..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary">💾 Salvar Evento</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEventoForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoricoEquipamento;
