import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Movimentacoes({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamentosSerial, setEquipamentosSerial] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [locais, setLocais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    data: new Date().toISOString().split('T')[0],
    equipamento_id: '',
    equipamento_serializado_id: '',
    quantidade: 1,
    cliente_id: '',
    local_destino_id: '',
    observacoes: '',
    valor_financeiro: '',
    criar_transacao_financeira: false,
    categoria_financeira_id: '',
    centro_custo_id: ''
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
      const [movRes, eqRes, eqSerialRes, clientesRes, locaisRes, catRes, ccRes] = await Promise.all([
        axios.get(`${API}/empresas/${empresa.id}/movimentacoes`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/equipamentos`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/equipamentos-serializados`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/clientes`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/locais`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/categorias`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/empresas/${empresa.id}/centros-custo`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setMovimentacoes(movRes.data);
      setEquipamentos(eqRes.data);
      setEquipamentosSerial(eqSerialRes.data);
      setClientes(clientesRes.data);
      setLocais(locaisRes.data);
      setCategorias(catRes.data);
      setCentrosCusto(ccRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await axios.post(`${API}/empresas/${empresa.id}/movimentacoes`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Movimentação registrada com sucesso!');
      setShowForm(false);
      setFormData({
        tipo: 'entrada', data: new Date().toISOString().split('T')[0],
        equipamento_id: '', equipamento_serializado_id: '', quantidade: 1,
        cliente_id: '', local_destino_id: '', observacoes: '',
        valor_financeiro: '', criar_transacao_financeira: false,
        categoria_financeira_id: '', centro_custo_id: ''
      });
      loadData();
    } catch (error) {
      setMessage('Erro: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getEquipamentoNome = (eqId) => {
    const eq = equipamentos.find(e => e.id === eqId);
    return eq ? eq.nome : 'N/A';
  };

  const getEquipamentoTipo = (eqId) => {
    const eq = equipamentos.find(e => e.id === eqId);
    return eq ? eq.tipo_controle : 'nao_serializado';
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      'entrada': { class: 'badge-receita', text: '⬆️ Entrada' },
      'saida_venda': { class: 'badge-despesa', text: '💰 Venda' },
      'saida_locacao': { class: 'badge-pendente', text: '📦 Locação' },
      'devolucao': { class: 'badge-receita', text: '↩️ Devolução' },
      'transferencia': { class: 'badge', text: '🔄 Transferência' },
      'perda': { class: 'badge-despesa', text: '❌ Perda' },
      'manutencao': { class: 'badge-pendente', text: '🔧 Manutenção' }
    };
    const badge = badges[tipo] || { class: 'badge', text: tipo };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const selectedEquipamentoTipo = formData.equipamento_id ? getEquipamentoTipo(formData.equipamento_id) : 'nao_serializado';

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
        <h1 className="dashboard-title">🔄 Movimentações de Estoque</h1>
        <p className="dashboard-subtitle">Registre entradas, saídas e transferências</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Nova Movimentação
        </button>
      )}

      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">Nova Movimentação</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Tipo de Movimentação *</label>
                <select className="form-input" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} required>
                  <option value="entrada">Entrada (Compra/Recebimento)</option>
                  <option value="saida_venda">Saída - Venda</option>
                  <option value="saida_locacao">Saída - Locação</option>
                  <option value="devolucao">Devolução</option>
                  <option value="transferencia">Transferência</option>
                  <option value="perda">Perda/Avaria</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </div>
              <div className="form-group">
                <label>Data *</label>
                <input type="date" className="form-input" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Equipamento *</label>
                <select className="form-input" value={formData.equipamento_id} onChange={(e) => setFormData({...formData, equipamento_id: e.target.value, equipamento_serializado_id: ''})} required>
                  <option value="">Selecione...</option>
                  {equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome} ({e.tipo_controle})</option>)}
                </select>
              </div>

              {selectedEquipamentoTipo === 'serializado' ? (
                <div className="form-group">
                  <label>Número de Série</label>
                  <select className="form-input" value={formData.equipamento_serializado_id} onChange={(e) => setFormData({...formData, equipamento_serializado_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {equipamentosSerial.filter(es => es.equipamento_id === formData.equipamento_id).map(es => 
                      <option key={es.id} value={es.id}>{es.numero_serie} ({es.status})</option>
                    )}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input type="number" min="1" className="form-input" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value)})} required />
                </div>
              )}

              {['saida_venda', 'saida_locacao', 'devolucao'].includes(formData.tipo) && (
                <div className="form-group">
                  <label>Cliente</label>
                  <select className="form-input" value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Local Destino</label>
                <select className="form-input" value={formData.local_destino_id} onChange={(e) => setFormData({...formData, local_destino_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={formData.criar_transacao_financeira} onChange={(e) => setFormData({...formData, criar_transacao_financeira: e.target.checked})} />
                  Criar transação financeira automática
                </label>
              </div>

              {formData.criar_transacao_financeira && (
                <>
                  <div className="form-group">
                    <label>Valor Financeiro (R$) *</label>
                    <input type="number" step="0.01" className="form-input" value={formData.valor_financeiro} onChange={(e) => setFormData({...formData, valor_financeiro: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Categoria *</label>
                    <select className="form-input" value={formData.categoria_financeira_id} onChange={(e) => setFormData({...formData, categoria_financeira_id: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Centro de Custo *</label>
                    <select className="form-input" value={formData.centro_custo_id} onChange={(e) => setFormData({...formData, centro_custo_id: e.target.value})} required>
                      <option value="">Selecione...</option>
                      {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Observações</label>
                <textarea className="form-input" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows="2" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Registrar Movimentação</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card">
        <h3 className="card-title">Movimentações Registradas ({movimentacoes.length})</h3>
        {movimentacoes.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Equipamento</th>
                  <th>Quantidade</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                    <td>{getTipoBadge(m.tipo)}</td>
                    <td>{getEquipamentoNome(m.equipamento_id)}</td>
                    <td>{m.quantidade}</td>
                    <td>{m.observacoes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhuma movimentação registrada</div>
        )}
      </div>
    </div>
  );
}

export default Movimentacoes;