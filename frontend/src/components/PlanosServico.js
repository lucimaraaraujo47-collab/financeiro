import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function PlanosServico({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    tipo_servico: 'internet',
    valor: '',
    periodicidade: 'mensal',
    tem_contrato: false,
    prazo_fidelidade_meses: 0,
    valor_multa_cancelamento: 0,
    modelo_contrato_id: '',
    descricao: '',
    beneficios: []
  });
  const [novoBeneficio, setNovoBeneficio] = useState('');

  const tiposServico = [
    { value: 'internet', label: '🌐 Internet' },
    { value: 'manutencao', label: '🔧 Manutenção' },
    { value: 'instalacao', label: '📦 Instalação' },
    { value: 'consultoria', label: '💼 Consultoria' },
    { value: 'monitoramento', label: '📡 Monitoramento' },
    { value: 'suporte', label: '🎧 Suporte' }
  ];

  const periodicidades = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
    { value: 'unico', label: 'Pagamento Único' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (empresasRes.data.length > 0) {
        const emp = empresasRes.data[0];
        setEmpresa(emp);
        
        const [planosRes, modelosRes] = await Promise.all([
          axios.get(`${API}/empresas/${emp.id}/planos-servico`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/modelos-contrato`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPlanos(planosRes.data || []);
        setModelos(modelosRes.data || []);
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
        valor: parseFloat(formData.valor),
        prazo_fidelidade_meses: parseInt(formData.prazo_fidelidade_meses) || 0,
        valor_multa_cancelamento: parseFloat(formData.valor_multa_cancelamento) || 0
      };

      if (editingId) {
        await axios.put(`${API}/planos-servico/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Plano atualizado com sucesso!');
      } else {
        await axios.post(`${API}/empresas/${empresa.id}/planos-servico`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Plano criado com sucesso!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao salvar'));
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo_servico: 'internet',
      valor: '',
      periodicidade: 'mensal',
      tem_contrato: false,
      prazo_fidelidade_meses: 0,
      valor_multa_cancelamento: 0,
      modelo_contrato_id: '',
      descricao: '',
      beneficios: []
    });
    setNovoBeneficio('');
  };

  const handleEdit = (plano) => {
    setFormData({
      nome: plano.nome,
      tipo_servico: plano.tipo_servico,
      valor: plano.valor,
      periodicidade: plano.periodicidade,
      tem_contrato: plano.tem_contrato,
      prazo_fidelidade_meses: plano.prazo_fidelidade_meses || 0,
      valor_multa_cancelamento: plano.valor_multa_cancelamento || 0,
      modelo_contrato_id: plano.modelo_contrato_id || '',
      descricao: plano.descricao || '',
      beneficios: plano.beneficios || []
    });
    setEditingId(plano.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja desativar este plano?')) return;
    try {
      await axios.delete(`${API}/planos-servico/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Plano desativado!');
      loadData();
    } catch (error) {
      setMessage('❌ Erro ao desativar plano');
    }
  };

  const addBeneficio = () => {
    if (novoBeneficio.trim()) {
      setFormData({
        ...formData,
        beneficios: [...formData.beneficios, novoBeneficio.trim()]
      });
      setNovoBeneficio('');
    }
  };

  const removeBeneficio = (index) => {
    setFormData({
      ...formData,
      beneficios: formData.beneficios.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return <div className="dashboard"><div className="loading-screen">Carregando...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📋 Planos de Serviço</h1>
        <p className="dashboard-subtitle">Cadastre planos com ou sem contrato de fidelidade</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Planos Cadastrados</h2>
          <button
            className="btn-success"
            onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }}
          >
            {showForm ? 'Cancelar' : '+ Novo Plano'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Plano *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Internet 300MB Fibra"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Serviço *</label>
                <select
                  className="form-select"
                  value={formData.tipo_servico}
                  onChange={(e) => setFormData({ ...formData, tipo_servico: e.target.value })}
                >
                  {tiposServico.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="99.90"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Periodicidade *</label>
                <select
                  className="form-select"
                  value={formData.periodicidade}
                  onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value })}
                >
                  {periodicidades.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Configurações de Contrato */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1e40af' }}>📝 Configurações de Contrato</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.tem_contrato}
                    onChange={(e) => setFormData({ ...formData, tem_contrato: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Este plano possui contrato</span>
                </label>
              </div>

              {formData.tem_contrato && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Modelo de Contrato</label>
                    <select
                      className="form-select"
                      value={formData.modelo_contrato_id}
                      onChange={(e) => setFormData({ ...formData, modelo_contrato_id: e.target.value })}
                    >
                      <option value="">Selecione um modelo</option>
                      {modelos.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (v{m.versao})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fidelidade (meses)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prazo_fidelidade_meses}
                      onChange={(e) => setFormData({ ...formData, prazo_fidelidade_meses: e.target.value })}
                      min="0"
                      placeholder="12"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Multa por Cancelamento (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.valor_multa_cancelamento}
                      onChange={(e) => setFormData({ ...formData, valor_multa_cancelamento: e.target.value })}
                      min="0"
                      placeholder="299.70"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Descrição e Benefícios */}
            <div style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-input"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows="2"
                  placeholder="Descrição do plano..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Benefícios</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={novoBeneficio}
                    onChange={(e) => setNovoBeneficio(e.target.value)}
                    placeholder="Ex: WiFi grátis"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBeneficio())}
                  />
                  <button type="button" className="btn-primary" onClick={addBeneficio}>+</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.beneficios.map((b, i) => (
                    <span key={i} style={{
                      background: '#dbeafe',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {b}
                      <button type="button" onClick={() => removeBeneficio(i)} style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-success">
                {editingId ? 'Atualizar Plano' : 'Criar Plano'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de Planos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {planos.filter(p => p.ativo).map(plano => (
            <div key={plano.id} style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{plano.nome}</h3>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: '#f1f5f9',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    {tiposServico.find(t => t.value === plano.tipo_servico)?.label || plano.tipo_servico}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                    R$ {plano.valor.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    /{periodicidades.find(p => p.value === plano.periodicidade)?.label || plano.periodicidade}
                  </div>
                </div>
              </div>

              {plano.descricao && (
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>{plano.descricao}</p>
              )}

              {plano.tem_contrato && (
                <div style={{
                  background: '#fef3c7',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  📝 <strong>Contrato:</strong> {plano.prazo_fidelidade_meses} meses de fidelidade
                  {plano.valor_multa_cancelamento > 0 && (
                    <span> | Multa: R$ {plano.valor_multa_cancelamento.toFixed(2)}</span>
                  )}
                </div>
              )}

              {plano.beneficios?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {plano.beneficios.map((b, i) => (
                    <div key={i} style={{ fontSize: '0.875rem', color: '#059669', marginBottom: '0.25rem' }}>
                      ✓ {b}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  onClick={() => handleEdit(plano)}
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.875rem' }}
                  onClick={() => handleDelete(plano.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {planos.filter(p => p.ativo).length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Nenhum plano cadastrado</div>
            <div className="empty-state-subtext">Crie seu primeiro plano de serviço</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanosServico;