import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import './CRM.css';

function CRM({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [leads, setLeads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: 'manual',
    valor_estimado: 0,
    assigned_to: '',
    notes: '',
    tags: []
  });

  const colunas = [
    { id: 'novo', title: '🆕 Novo', color: '#3b82f6' },
    { id: 'contatado', title: '📞 Contatado', color: '#8b5cf6' },
    { id: 'qualificado', title: '✅ Qualificado', color: '#10b981' },
    { id: 'proposta', title: '📄 Proposta', color: '#f59e0b' },
    { id: 'negociacao', title: '🤝 Negociação', color: '#ef4444' },
    { id: 'ganho', title: '🎉 Ganho', color: '#22c55e' },
    { id: 'perdido', title: '❌ Perdido', color: '#6b7280' }
  ];

  useEffect(() => {
    loadEmpresa();
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadLeads();
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

  const loadUsuarios = async () => {
    try {
      const res = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/leads`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Lead criado com sucesso!');
      setShowForm(false);
      setFormData({
        nome: '', telefone: '', email: '', origem: 'manual',
        valor_estimado: 0, assigned_to: '', notes: '', tags: []
      });
      loadLeads();
    } catch (error) {
      setMessage('Erro: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    
    try {
      await axios.patch(`${API}/leads/${leadId}/status?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadLeads();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAssign = async (leadId, userId) => {
    try {
      await axios.patch(`${API}/leads/${leadId}/assign?user_id=${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadLeads();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };

  const getLeadsByStatus = (status) => {
    return leads.filter(l => l.status_funil === status);
  };

  const getUserName = (userId) => {
    const u = usuarios.find(user => user.id === userId);
    return u ? u.nome : 'Não atribuído';
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
    <div className="crm-container">
      <div className="crm-header">
        <div>
          <h1 className="dashboard-title">🎯 CRM - Funil de Vendas</h1>
          <p className="dashboard-subtitle">Gerencie seus leads e oportunidades</p>
        </div>
        <button className="btn-success" onClick={() => setShowForm(true)}>
          ➕ Novo Lead
        </button>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Novo Lead</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label>Nome *</label>
                  <input type="text" className="form-input" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Telefone *</label>
                  <input type="text" className="form-input" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Origem</label>
                  <select className="form-input" value={formData.origem} onChange={(e) => setFormData({...formData, origem: e.target.value})}>
                    <option value="manual">Manual</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="landing">Landing Page</option>
                    <option value="indicacao">Indicação</option>
                    <option value="importacao">Importação</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor Estimado (R$)</label>
                  <input type="number" step="0.01" className="form-input" value={formData.valor_estimado} onChange={(e) => setFormData({...formData, valor_estimado: parseFloat(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>Atribuir para</label>
                  <select className="form-input" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}>
                    <option value="">Não atribuído</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Observações</label>
                  <textarea className="form-input" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-success">Salvar</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {colunas.map(coluna => (
          <div 
            key={coluna.id} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, coluna.id)}
          >
            <div className="kanban-column-header" style={{ borderLeftColor: coluna.color }}>
              <h3>{coluna.title}</h3>
              <span className="kanban-count">{getLeadsByStatus(coluna.id).length}</span>
            </div>
            <div className="kanban-cards">
              {getLeadsByStatus(coluna.id).map(lead => (
                <div
                  key={lead.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onClick={() => openLeadDetails(lead)}
                >
                  <div className="kanban-card-header">
                    <strong>{lead.nome}</strong>
                    {lead.valor_estimado > 0 && (
                      <span className="kanban-card-value">
                        R$ {lead.valor_estimado.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className="kanban-card-phone">📱 {lead.telefone}</div>
                  {lead.email && <div className="kanban-card-email">📧 {lead.email}</div>}
                  <div className="kanban-card-footer">
                    <span className="kanban-card-origem">{lead.origem}</span>
                    <span className="kanban-card-assigned">
                      👤 {getUserName(lead.assigned_to)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedLead && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Detalhes do Lead</h3>
            <div className="lead-details">
              <div className="lead-info">
                <h4>{selectedLead.nome}</h4>
                <p><strong>Telefone:</strong> {selectedLead.telefone}</p>
                {selectedLead.email && <p><strong>Email:</strong> {selectedLead.email}</p>}
                <p><strong>Origem:</strong> {selectedLead.origem}</p>
                <p><strong>Status:</strong> {selectedLead.status_funil}</p>
                <p><strong>Valor Estimado:</strong> R$ {selectedLead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Atribuído:</strong> {getUserName(selectedLead.assigned_to)}</p>
                <p><strong>Criado em:</strong> {new Date(selectedLead.created_at).toLocaleString('pt-BR')}</p>
                {selectedLead.notes && (
                  <div>
                    <strong>Observações:</strong>
                    <p>{selectedLead.notes}</p>
                  </div>
                )}
              </div>
              <div className="lead-actions">
                <h4>Atribuir para:</h4>
                <select 
                  className="form-input" 
                  value={selectedLead.assigned_to || ''} 
                  onChange={(e) => handleAssign(selectedLead.id, e.target.value)}
                >
                  <option value="">Não atribuído</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRM;
