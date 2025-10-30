import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ConfiguracoesCRM({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [aiAgents, setAiAgents] = useState([]);
  const [routingConfig, setRoutingConfig] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [message, setMessage] = useState('');
  
  // Template Form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    conteudo: '',
    tipo: 'whatsapp'
  });

  // AI Agent Form
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentForm, setAgentForm] = useState({
    nome: '',
    prompt_sistema: '',
    palavras_chave_ativacao: '',
    autonomia: 'baixa'
  });

  useEffect(() => {
    loadEmpresa();
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadData();
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

  const loadData = async () => {
    try {
      const [templatesRes, agentsRes, routingRes] = await Promise.all([
        axios.get(`${API}/empresas/${empresa.id}/templates`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/ai-agents`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/routing-config`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setTemplates(templatesRes.data);
      setAiAgents(agentsRes.data);
      setRoutingConfig(routingRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Template handlers
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/empresas/${empresa.id}/templates`, templateForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Template criado com sucesso!');
      setShowTemplateForm(false);
      setTemplateForm({ nome: '', conteudo: '', tipo: 'whatsapp' });
      loadData();
    } catch (error) {
      setMessage('Erro ao criar template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Excluir este template?')) return;
    try {
      await axios.delete(`${API}/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Template deletado');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar');
    }
  };

  // AI Agent handlers
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...agentForm,
        palavras_chave_ativacao: agentForm.palavras_chave_ativacao.split(',').map(p => p.trim()).filter(p => p)
      };
      await axios.post(`${API}/empresas/${empresa.id}/ai-agents`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Agente IA criado com sucesso!');
      setShowAgentForm(false);
      setAgentForm({ nome: '', prompt_sistema: '', palavras_chave_ativacao: '', autonomia: 'baixa' });
      loadData();
    } catch (error) {
      setMessage('Erro ao criar agente');
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!window.confirm('Excluir este agente?')) return;
    try {
      await axios.delete(`${API}/ai-agents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Agente deletado');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar');
    }
  };

  // Routing handlers
  const handleUpdateRouting = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${API}/empresas/${empresa.id}/routing-config`,
        null,
        {
          params: {
            tipo: routingConfig.tipo,
            usuarios_ativos: routingConfig.usuarios_ativos.join(',')
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage('Roteamento atualizado!');
      loadData();
    } catch (error) {
      setMessage('Erro ao atualizar');
    }
  };

  if (!empresa) {
    return <div className="dashboard"><div className="empty-state">Nenhuma empresa cadastrada</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">⚙️ Configurações do CRM</h1>
        <p className="dashboard-subtitle">Templates, Automações e IA</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 Templates
        </button>
        <button
          className={`tab ${activeTab === 'ia' ? 'active' : ''}`}
          onClick={() => setActiveTab('ia')}
        >
          🤖 Agentes IA
        </button>
        <button
          className={`tab ${activeTab === 'roteamento' ? 'active' : ''}`}
          onClick={() => setActiveTab('roteamento')}
        >
          🎯 Roteamento
        </button>
      </div>

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="card-title">Templates de Mensagem</h3>
            <button className="btn-success" onClick={() => setShowTemplateForm(true)}>+ Novo Template</button>
          </div>

          {showTemplateForm && (
            <form onSubmit={handleCreateTemplate} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={templateForm.nome} onChange={(e) => setTemplateForm({...templateForm, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Conteúdo (use {'{nome}'}, {'{valor}'}, {'{empresa}'})</label>
                <textarea className="form-input" rows="4" value={templateForm.conteudo} onChange={(e) => setTemplateForm({...templateForm, conteudo: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-success">Salvar</button>
                <button type="button" className="btn-secondary" onClick={() => setShowTemplateForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {templates.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {templates.map(t => (
                <div key={t.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{t.nome}</strong>
                      <p style={{ margin: '0.5rem 0', color: '#64748b', whiteSpace: 'pre-wrap' }}>{t.conteudo}</p>
                    </div>
                    <button className="btn-danger" style={{ height: 'fit-content' }} onClick={() => handleDeleteTemplate(t.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum template cadastrado</div>
          )}
        </div>
      )}

      {/* AI TAB */}
      {activeTab === 'ia' && (
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="card-title">Agentes de IA</h3>
            <button className="btn-success" onClick={() => setShowAgentForm(true)}>+ Novo Agente</button>
          </div>

          {showAgentForm && (
            <form onSubmit={handleCreateAgent} style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" className="form-input" value={agentForm.nome} onChange={(e) => setAgentForm({...agentForm, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Prompt do Sistema *</label>
                <textarea className="form-input" rows="4" value={agentForm.prompt_sistema} onChange={(e) => setAgentForm({...agentForm, prompt_sistema: e.target.value})} required placeholder="Ex: Você é um assistente de vendas amigável..." />
              </div>
              <div className="form-group">
                <label>Palavras-chave de Ativação (separadas por vírgula)</label>
                <input type="text" className="form-input" value={agentForm.palavras_chave_ativacao} onChange={(e) => setAgentForm({...agentForm, palavras_chave_ativacao: e.target.value})} placeholder="Ex: preço, orçamento, quanto custa" />
              </div>
              <div className="form-group">
                <label>Nível de Autonomia</label>
                <select className="form-input" value={agentForm.autonomia} onChange={(e) => setAgentForm({...agentForm, autonomia: e.target.value})}>
                  <option value="baixa">Baixa (confirma com humano)</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta (responde sozinho)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-success">Salvar</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAgentForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {aiAgents.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {aiAgents.map(a => (
                <div key={a.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{a.nome}</strong>
                      <p style={{ margin: '0.5rem 0', color: '#64748b' }}>{a.prompt_sistema}</p>
                      {a.palavras_chave_ativacao && a.palavras_chave_ativacao.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Ativa com:</strong> {a.palavras_chave_ativacao.join(', ')}
                        </div>
                      )}
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className="badge">Autonomia: {a.autonomia}</span>
                        <span className={`badge ${a.ativo ? 'badge-receita' : 'badge-despesa'}`} style={{ marginLeft: '0.5rem' }}>
                          {a.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <button className="btn-danger" style={{ height: 'fit-content' }} onClick={() => handleDeleteAgent(a.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum agente configurado</div>
          )}
        </div>
      )}

      {/* ROTEAMENTO TAB */}
      {activeTab === 'roteamento' && routingConfig && (
        <div className="content-card">
          <h3 className="card-title">Configuração de Roteamento</h3>
          <form onSubmit={handleUpdateRouting} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Tipo de Roteamento</label>
              <select 
                className="form-input" 
                value={routingConfig.tipo} 
                onChange={(e) => setRoutingConfig({...routingConfig, tipo: e.target.value})}
              >
                <option value="round_robin">Round Robin (Distribuição Igual)</option>
                <option value="manual">Manual (Sem Roteamento Automático)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Usuários Ativos no Roteamento</label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {usuarios.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      checked={routingConfig.usuarios_ativos.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoutingConfig({...routingConfig, usuarios_ativos: [...routingConfig.usuarios_ativos, u.id]});
                        } else {
                          setRoutingConfig({...routingConfig, usuarios_ativos: routingConfig.usuarios_ativos.filter(id => id !== u.id)});
                        }
                      }}
                    />
                    {u.nome} ({u.email})
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-success">Salvar Configuração</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ConfiguracoesCRM;
