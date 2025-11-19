import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Financas({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [activeTab, setActiveTab] = useState('contas');
  const [contas, setContas] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTransferencia, setShowTransferencia] = useState(false);
  const [message, setMessage] = useState('');
  
  // Forms
  const [formConta, setFormConta] = useState({
    nome: '', tipo: 'corrente', banco: '', agencia: '', numero_conta: '', saldo_inicial: 0
  });
  const [formInv, setFormInv] = useState({
    nome: '', tipo: 'renda_fixa', valor_investido: 0, valor_atual: 0, 
    data_aplicacao: '', rentabilidade_percentual: 0, instituicao: ''
  });
  const [formCartao, setFormCartao] = useState({
    nome: '', bandeira: 'Visa', limite_total: 0, dia_fechamento: 10, dia_vencimento: 15
  });
  const [formTransferencia, setFormTransferencia] = useState({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: '',
    descricao: '',
    data_transferencia: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadData();
    }
  }, [empresa, activeTab]);

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
    if (!empresa) return;
    try {
      if (activeTab === 'contas') {
        const res = await axios.get(`${API}/empresas/${empresa.id}/contas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContas(res.data);
      } else if (activeTab === 'investimentos') {
        const res = await axios.get(`${API}/empresas/${empresa.id}/investimentos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInvestimentos(res.data);
      } else if (activeTab === 'cartoes') {
        const res = await axios.get(`${API}/empresas/${empresa.id}/cartoes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCartoes(res.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      let endpoint, data;
      if (activeTab === 'contas') {
        endpoint = `${API}/empresas/${empresa.id}/contas`;
        data = formConta;
      } else if (activeTab === 'investimentos') {
        endpoint = `${API}/empresas/${empresa.id}/investimentos`;
        data = formInv;
      } else {
        endpoint = `${API}/empresas/${empresa.id}/cartoes`;
        data = formCartao;
      }

      await axios.post(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Cadastrado com sucesso!');
      setShowForm(false);
      loadData();
      
      // Reset forms
      setFormConta({ nome: '', tipo: 'corrente', banco: '', agencia: '', numero_conta: '', saldo_inicial: 0 });
      setFormInv({ nome: '', tipo: 'renda_fixa', valor_investido: 0, valor_atual: 0, data_aplicacao: '', rentabilidade_percentual: 0, instituicao: '' });
      setFormCartao({ nome: '', bandeira: 'Visa', limite_total: 0, dia_fechamento: 10, dia_vencimento: 15 });
    } catch (error) {
      setMessage('Erro ao cadastrar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza?')) return;

    try {
      let endpoint;
      if (activeTab === 'contas') endpoint = `${API}/contas/${id}`;
      else if (activeTab === 'investimentos') endpoint = `${API}/investimentos/${id}`;
      else endpoint = `${API}/cartoes/${id}`;

      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Deletado com sucesso!');
      loadData();
    } catch (error) {
      setMessage('Erro ao deletar');
    }
  };

  const handleTransferencia = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await axios.post(
        `${API}/empresas/${empresa.id}/transferencias`,
        {
          ...formTransferencia,
          valor: parseFloat(formTransferencia.valor)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`✅ ${response.data.message}`);
      setShowTransferencia(false);
      setFormTransferencia({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        descricao: '',
        data_transferencia: new Date().toISOString().split('T')[0]
      });
      loadData();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || error.message));
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
        <h1 className="dashboard-title">💰 Gestão Financeira</h1>
        <p className="dashboard-subtitle">Contas, Investimentos e Cartões</p>
      </div>

      {message && (
        <div className={message.includes('Erro') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <button
          className={activeTab === 'contas' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('contas'); setShowForm(false); }}
        >
          🏦 Contas Bancárias
        </button>
        <button
          className={activeTab === 'investimentos' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('investimentos'); setShowForm(false); }}
        >
          📈 Investimentos
        </button>
        <button
          className={activeTab === 'cartoes' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('cartoes'); setShowForm(false); }}
        >
          💳 Cartões de Crédito
        </button>
      </div>

      {/* Add Button */}
      {!showForm && (
        <button className="btn-success" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          ➕ Adicionar {activeTab === 'contas' ? 'Conta' : activeTab === 'investimentos' ? 'Investimento' : 'Cartão'}
        </button>
      )}
      
      {!showForm && activeTab === 'contas' && contas.length >= 2 && (
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowTransferencia(true);
            if (contas.length > 0) loadData(); // Reload to ensure fresh data
          }} 
          style={{ marginBottom: '1rem', marginLeft: '0.5rem' }}
        >
          🔄 Transferir Entre Contas
        </button>
      )}

      {/* Formulário de Transferência */}
      {showTransferencia && (
        <div className="content-card" style={{ marginBottom: '2rem', background: '#f0f9ff', border: '2px solid #3b82f6' }}>
          <h3 className="card-title" style={{ color: '#1e40af' }}>🔄 Transferência Entre Contas</h3>
          <form onSubmit={handleTransferencia} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Conta de Origem *</label>
                <select 
                  className="form-input" 
                  value={formTransferencia.conta_origem_id}
                  onChange={(e) => setFormTransferencia({...formTransferencia, conta_origem_id: e.target.value})}
                  required
                >
                  <option value="">Selecione a conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - Saldo: {formatCurrency(conta.saldo_atual || 0)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Conta de Destino *</label>
                <select 
                  className="form-input" 
                  value={formTransferencia.conta_destino_id}
                  onChange={(e) => setFormTransferencia({...formTransferencia, conta_destino_id: e.target.value})}
                  required
                >
                  <option value="">Selecione a conta</option>
                  {contas
                    .filter(c => c.id !== formTransferencia.conta_origem_id)
                    .map(conta => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome} - Saldo: {formatCurrency(conta.saldo_atual || 0)}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  className="form-input" 
                  value={formTransferencia.valor}
                  onChange={(e) => setFormTransferencia({...formTransferencia, valor: e.target.value})}
                  placeholder="0.00"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Data da Transferência *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formTransferencia.data_transferencia}
                  onChange={(e) => setFormTransferencia({...formTransferencia, data_transferencia: e.target.value})}
                  required 
                />
              </div>
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formTransferencia.descricao}
                  onChange={(e) => setFormTransferencia({...formTransferencia, descricao: e.target.value})}
                  placeholder="Ex: Transferência para conta poupança"
                  required 
                />
              </div>
            </div>
            
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Realizar Transferência</button>
              <button type="button" className="btn-secondary" onClick={() => setShowTransferencia(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Forms */}
      {showForm && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">
            Novo {activeTab === 'contas' ? 'Conta Bancária' : activeTab === 'investimentos' ? 'Investimento' : 'Cartão'}
          </h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            {activeTab === 'contas' && (
              <>
                <div className="form-group">
                  <label>Nome da Conta *</label>
                  <input type="text" className="form-input" value={formConta.nome} onChange={(e) => setFormConta({...formConta, nome: e.target.value})} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select className="form-input" value={formConta.tipo} onChange={(e) => setFormConta({...formConta, tipo: e.target.value})}>
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Poupança</option>
                      <option value="caixa">Caixa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Banco *</label>
                    <input type="text" className="form-input" value={formConta.banco} onChange={(e) => setFormConta({...formConta, banco: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Agência</label>
                    <input type="text" className="form-input" value={formConta.agencia} onChange={(e) => setFormConta({...formConta, agencia: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Número da Conta</label>
                    <input type="text" className="form-input" value={formConta.numero_conta} onChange={(e) => setFormConta({...formConta, numero_conta: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Saldo Inicial *</label>
                    <input type="number" step="0.01" className="form-input" value={formConta.saldo_inicial} onChange={(e) => setFormConta({...formConta, saldo_inicial: parseFloat(e.target.value)})} required />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'investimentos' && (
              <>
                <div className="form-group">
                  <label>Nome do Investimento *</label>
                  <input type="text" className="form-input" value={formInv.nome} onChange={(e) => setFormInv({...formInv, nome: e.target.value})} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select className="form-input" value={formInv.tipo} onChange={(e) => setFormInv({...formInv, tipo: e.target.value})}>
                      <option value="renda_fixa">Renda Fixa</option>
                      <option value="renda_variavel">Renda Variável</option>
                      <option value="fundos">Fundos</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Instituição</label>
                    <input type="text" className="form-input" value={formInv.instituicao} onChange={(e) => setFormInv({...formInv, instituicao: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Valor Investido *</label>
                    <input type="number" step="0.01" className="form-input" value={formInv.valor_investido} onChange={(e) => setFormInv({...formInv, valor_investido: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label>Valor Atual *</label>
                    <input type="number" step="0.01" className="form-input" value={formInv.valor_atual} onChange={(e) => setFormInv({...formInv, valor_atual: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label>Data de Aplicação *</label>
                    <input type="date" className="form-input" value={formInv.data_aplicacao} onChange={(e) => setFormInv({...formInv, data_aplicacao: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Rentabilidade (%)</label>
                    <input type="number" step="0.01" className="form-input" value={formInv.rentabilidade_percentual} onChange={(e) => setFormInv({...formInv, rentabilidade_percentual: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'cartoes' && (
              <>
                <div className="form-group">
                  <label>Nome do Cartão *</label>
                  <input type="text" className="form-input" value={formCartao.nome} onChange={(e) => setFormCartao({...formCartao, nome: e.target.value})} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Bandeira *</label>
                    <select className="form-input" value={formCartao.bandeira} onChange={(e) => setFormCartao({...formCartao, bandeira: e.target.value})}>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Elo">Elo</option>
                      <option value="American Express">American Express</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Limite Total *</label>
                    <input type="number" step="0.01" className="form-input" value={formCartao.limite_total} onChange={(e) => setFormCartao({...formCartao, limite_total: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label>Dia de Fechamento *</label>
                    <input type="number" min="1" max="31" className="form-input" value={formCartao.dia_fechamento} onChange={(e) => setFormCartao({...formCartao, dia_fechamento: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label>Dia de Vencimento *</label>
                    <input type="number" min="1" max="31" className="form-input" value={formCartao.dia_vencimento} onChange={(e) => setFormCartao({...formCartao, dia_vencimento: parseInt(e.target.value)})} required />
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-success">Salvar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lists */}
      <div className="content-card">
        {activeTab === 'contas' && (
          <>
            <h3 className="card-title">Contas Bancárias ({contas.length})</h3>
            {contas.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Banco</th>
                      <th>Tipo</th>
                      <th>Saldo Inicial</th>
                      <th>Saldo Atual</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contas.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td>{c.banco}</td>
                        <td><span className="badge">{c.tipo}</span></td>
                        <td>{formatCurrency(c.saldo_inicial)}</td>
                        <td style={{ fontWeight: 600, color: c.saldo_atual >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                          {formatCurrency(c.saldo_atual)}
                        </td>
                        <td>
                          <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(c.id)}>
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhuma conta cadastrada</div>
            )}
          </>
        )}

        {activeTab === 'investimentos' && (
          <>
            <h3 className="card-title">Investimentos ({investimentos.length})</h3>
            {investimentos.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Valor Investido</th>
                      <th>Valor Atual</th>
                      <th>Rentabilidade</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investimentos.map((i) => {
                      const rentabilidade = ((i.valor_atual - i.valor_investido) / i.valor_investido * 100);
                      return (
                        <tr key={i.id}>
                          <td>{i.nome}</td>
                          <td><span className="badge">{i.tipo}</span></td>
                          <td>{formatCurrency(i.valor_investido)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(i.valor_atual)}</td>
                          <td style={{ color: rentabilidade >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                            {rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(2)}%
                          </td>
                          <td>
                            <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(i.id)}>
                              🗑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum investimento cadastrado</div>
            )}
          </>
        )}

        {activeTab === 'cartoes' && (
          <>
            <h3 className="card-title">Cartões de Crédito ({cartoes.length})</h3>
            {cartoes.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Bandeira</th>
                      <th>Limite Total</th>
                      <th>Limite Disponível</th>
                      <th>Fatura Atual</th>
                      <th>Fechamento/Venc.</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartoes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td><span className="badge">{c.bandeira}</span></td>
                        <td>{formatCurrency(c.limite_total)}</td>
                        <td style={{ fontWeight: 600, color: c.limite_disponivel > 0 ? '#6ee7b7' : '#fca5a5' }}>
                          {formatCurrency(c.limite_disponivel)}
                        </td>
                        <td style={{ color: '#fca5a5' }}>{formatCurrency(c.fatura_atual)}</td>
                        <td>Dia {c.dia_fechamento} / {c.dia_vencimento}</td>
                        <td>
                          <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(c.id)}>
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: '1rem' }}>Nenhum cartão cadastrado</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Financas;
