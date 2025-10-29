import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function EquipamentosSerializados({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [equipamentosSerial, setEquipamentosSerial] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    equipamento_id: '',
    numero_serie: '',
    numero_linha: '',
    numero_simcard: '',
    local_id: '',
    data_aquisicao: '',
    data_garantia: '',
    custo_especifico: '',
    observacoes: ''
  });

  useEffect(() => {
    loadEmpresa();
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

  const loadData = async () => {
    try {
      const [eqSerialRes, eqRes, locaisRes] = await Promise.all([
        axios.get(`${API}/empresas/${empresa.id}/equipamentos-serializados`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/equipamentos`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/locais`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setEquipamentosSerial(eqSerialRes.data);
      setEquipamentos(eqRes.data.filter(e => e.tipo_controle === 'serializado'));
      setLocais(locaisRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/equipamentos-serializados`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Equipamento serializado cadastrado com sucesso!');
      setShowForm(false);
      setFormData({
        equipamento_id: '', numero_serie: '', numero_linha: '', numero_simcard: '',
        local_id: '', data_aquisicao: '', data_garantia: '', custo_especifico: '', observacoes: ''
      });
      loadData();
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este equipamento serializado?')) return;

    try {
      await axios.delete(`${API}/equipamentos-serializados/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Equipamento serializado excluído com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao excluir equipamento');
    }
  };

  const getEquipamentoNome = (eqId) => {
    const eq = equipamentos.find(e => e.id === eqId);
    return eq ? eq.nome : 'N/A';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'disponivel': { class: 'badge-receita', text: '✅ Disponível' },
      'em_cliente': { class: 'badge-pendente', text: '👥 Em Cliente' },
      'em_manutencao': { class: 'badge-despesa', text: '🔧 Manutenção' },
      'vendido': { class: 'badge-receita', text: '💰 Vendido' },
      'baixado': { class: 'badge', text: '❌ Baixado' }
    };
    const badge = badges[status] || { class: 'badge', text: status };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
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
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🔢 Equipamentos Serializados</h1>
        <p className="dashboard-subtitle">Gerencie equipamentos individuais com número de série</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Novo Equipamento Serializado
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Novo Equipamento Serializado</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Equipamento *</label>
                <select className="form-input" value={formData.equipamento_id} onChange={(e) => setFormData({...formData, equipamento_id: e.target.value})} required>
                  <option value="">Selecione...</option>
                  {equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome} - {e.modelo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Número de Série * (Único)</label>
                <input type="text" className="form-input" value={formData.numero_serie} onChange={(e) => setFormData({...formData, numero_serie: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Número da Linha</label>
                <input type="text" className="form-input" value={formData.numero_linha} onChange={(e) => setFormData({...formData, numero_linha: e.target.value})} placeholder="11987654321" />
              </div>
              <div className="form-group">
                <label>Número do SIM Card</label>
                <input type="text" className="form-input" value={formData.numero_simcard} onChange={(e) => setFormData({...formData, numero_simcard: e.target.value})} placeholder="89551234567890" />
              </div>
              <div className="form-group">
                <label>Local/Depósito</label>
                <select className="form-input" value={formData.local_id} onChange={(e) => setFormData({...formData, local_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Custo Específico (R$)</label>
                <input type="number" step="0.01" className="form-input" value={formData.custo_especifico} onChange={(e) => setFormData({...formData, custo_especifico: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Data de Aquisição</label>
                <input type="date" className="form-input" value={formData.data_aquisicao} onChange={(e) => setFormData({...formData, data_aquisicao: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Data de Garantia</label>
                <input type="date" className="form-input" value={formData.data_garantia} onChange={(e) => setFormData({...formData, data_garantia: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Observações</label>
                <textarea className="form-input" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows="2" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Salvar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card">
        <h3 className="card-title">Equipamentos Serializados ({equipamentosSerial.length})</h3>
        {equipamentosSerial.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Número de Série</th>
                  <th>Linha</th>
                  <th>SIM Card</th>
                  <th>Status</th>
                  <th>Data Aquisição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipamentosSerial.map((es) => (
                  <tr key={es.id}>
                    <td>{getEquipamentoNome(es.equipamento_id)}</td>
                    <td><strong>{es.numero_serie}</strong></td>
                    <td>{es.numero_linha || '-'}</td>
                    <td>{es.numero_simcard || '-'}</td>
                    <td>{getStatusBadge(es.status)}</td>
                    <td>{es.data_aquisicao || '-'}</td>
                    <td>
                      <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(es.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum equipamento serializado cadastrado</div>
        )}
      </div>
    </div>
  );
}

export default EquipamentosSerializados;