import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Vendas({ user, token }) {
  const [activeTab, setActiveTab] = useState('clientes');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [empresaId, setEmpresaId] = useState(null);
  
  const [clientes, setClientes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [faturas, setFaturas] = useState([]);
  
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [showPlanoForm, setShowPlanoForm] = useState(false);
  const [showVendaForm, setShowVendaForm] = useState(false);
  
  const [formCliente, setFormCliente] = useState({
    nome_completo: '', cpf: '', email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: ''
  });
  
  const [formPlano, setFormPlano] = useState({
    nome: '', velocidade_download: '', velocidade_upload: '',
    preco_mensal: '', descricao: ''
  });
  
  const [formVenda, setFormVenda] = useState({
    cliente_id: '', plano_id: '',
    data_contratacao: new Date().toISOString().split('T')[0],
    dia_vencimento: 10, observacoes: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresaId) loadData();
  }, [activeTab, empresaId]);

  const loadEmpresa = async () => {
    try {
      const res = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.length > 0) setEmpresaId(res.data[0].id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const endpoints = {
        clientes: `/empresas/${empresaId}/clientes-venda`,
        planos: `/empresas/${empresaId}/planos-internet`,
        vendas: `/empresas/${empresaId}/vendas`,
        faturas: `/empresas/${empresaId}/faturas`
      };
      
      const res = await axios.get(`${API}${endpoints[activeTab]}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (activeTab === 'clientes') setClientes(res.data);
      else if (activeTab === 'planos') setPlanos(res.data);
      else if (activeTab === 'vendas') setVendas(res.data);
      else if (activeTab === 'faturas') setFaturas(res.data);
    } catch (error) {
      setMessage('❌ Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async (cep) => {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length === 8) {
        const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!res.data.erro) {
          setFormCliente(prev => ({
            ...prev,
            logradouro: res.data.logradouro,
            bairro: res.data.bairro,
            cidade: res.data.localidade,
            estado: res.data.uf
          }));
        }
      }
    } catch (error) {
      console.error('Erro buscar CEP:', error);
    }
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    try {
      let endpoint, data;
      
      if (type === 'cliente') {
        endpoint = `/empresas/${empresaId}/clientes-venda`;
        data = formCliente;
        setFormCliente({
          nome_completo: '', cpf: '', email: '', telefone: '',
          cep: '', logradouro: '', numero: '', complemento: '',
          bairro: '', cidade: '', estado: ''
        });
        setShowClienteForm(false);
      } else if (type === 'plano') {
        endpoint = `/empresas/${empresaId}/planos-internet`;
        data = { ...formPlano, preco_mensal: parseFloat(formPlano.preco_mensal) };
        setFormPlano({ nome: '', velocidade_download: '', velocidade_upload: '', preco_mensal: '', descricao: '' });
        setShowPlanoForm(false);
      } else if (type === 'venda') {
        endpoint = `/empresas/${empresaId}/vendas`;
        data = { ...formVenda, dia_vencimento: parseInt(formVenda.dia_vencimento) };
        setFormVenda({
          cliente_id: '', plano_id: '',
          data_contratacao: new Date().toISOString().split('T')[0],
          dia_vencimento: 10, observacoes: ''
        });
        setShowVendaForm(false);
      }
      
      await axios.post(`${API}${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✅ ${type === 'cliente' ? 'Cliente' : type === 'plano' ? 'Plano' : 'Venda'} cadastrado(a) com sucesso!`);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || error.message));
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">💼 Vendas e Assinaturas</h1>
        <p className="dashboard-subtitle">Gerencie clientes, planos e cobranças recorrentes</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>{message}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
        {['clientes', 'planos', 'vendas', 'faturas'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? '#3b82f6' : 'transparent',
              color: activeTab === tab ? 'white' : '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              fontSize: '16px',
              borderRadius: '8px 8px 0 0'
            }}>
            {tab === 'clientes' && '👥 Clientes'}
            {tab === 'planos' && '📡 Planos'}
            {tab === 'vendas' && '💰 Vendas'}
            {tab === 'faturas' && '📄 Faturas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-screen">Carregando...</div>
      ) : (
        <>
          {/* CLIENTES */}
          {activeTab === 'clientes' && (
            <div>
              <button onClick={() => setShowClienteForm(!showClienteForm)} className="btn-success" style={{marginBottom: '16px'}}>
                {showClienteForm ? '❌ Cancelar' : '➕ Novo Cliente'}
              </button>

              {showClienteForm && (
                <div className="content-card" style={{ marginBottom: '24px' }}>
                  <h2 className="card-title">Cadastro de Cliente</h2>
                  <form onSubmit={(e) => handleSubmit(e, 'cliente')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div className="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" required value={formCliente.nome_completo}
                          onChange={(e) => setFormCliente({...formCliente, nome_completo: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>CPF *</label>
                        <input type="text" required value={formCliente.cpf}
                          onChange={(e) => setFormCliente({...formCliente, cpf: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input type="email" required value={formCliente.email}
                          onChange={(e) => setFormCliente({...formCliente, email: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Telefone *</label>
                        <input type="text" required value={formCliente.telefone}
                          onChange={(e) => setFormCliente({...formCliente, telefone: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>CEP * (busca automática)</label>
                        <input type="text" required value={formCliente.cep}
                          onChange={(e) => {
                            setFormCliente({...formCliente, cep: e.target.value});
                            if (e.target.value.replace(/\D/g, '').length === 8) buscarCEP(e.target.value);
                          }} />
                      </div>
                      <div className="form-group">
                        <label>Logradouro *</label>
                        <input type="text" required value={formCliente.logradouro}
                          onChange={(e) => setFormCliente({...formCliente, logradouro: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Número *</label>
                        <input type="text" required value={formCliente.numero}
                          onChange={(e) => setFormCliente({...formCliente, numero: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Complemento</label>
                        <input type="text" value={formCliente.complemento}
                          onChange={(e) => setFormCliente({...formCliente, complemento: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Bairro *</label>
                        <input type="text" required value={formCliente.bairro}
                          onChange={(e) => setFormCliente({...formCliente, bairro: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Cidade *</label>
                        <input type="text" required value={formCliente.cidade}
                          onChange={(e) => setFormCliente({...formCliente, cidade: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Estado (UF) *</label>
                        <input type="text" required maxLength="2" value={formCliente.estado}
                          onChange={(e) => setFormCliente({...formCliente, estado: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '16px' }}>
                      <button type="submit" className="btn-success">Cadastrar</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowClienteForm(false)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="content-card">
                <h2 className="card-title">Clientes ({clientes.length})</h2>
                {clientes.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">👥</span>
                    <p className="empty-state-text">Nenhum cliente cadastrado</p>
                  </div>
                ) : (
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nome</th><th>CPF</th><th>Email</th><th>Telefone</th><th>Cidade</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientes.map(c => (
                          <tr key={c.id}>
                            <td>{c.nome_completo}</td>
                            <td>{c.cpf}</td>
                            <td>{c.email}</td>
                            <td>{c.telefone}</td>
                            <td>{c.cidade}/{c.estado}</td>
                            <td>
                              <span style={{
                                padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                background: c.status === 'ativo' ? '#dcfce7' : '#fee2e2',
                                color: c.status === 'ativo' ? '#16a34a' : '#dc2626'
                              }}>
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLANOS */}
          {activeTab === 'planos' && (
            <div>
              <button onClick={() => setShowPlanoForm(!showPlanoForm)} className="btn-success" style={{marginBottom: '16px'}}>
                {showPlanoForm ? '❌ Cancelar' : '➕ Novo Plano'}
              </button>

              {showPlanoForm && (
                <div className="content-card" style={{ marginBottom: '24px' }}>
                  <h2 className="card-title">Cadastro de Plano</h2>
                  <form onSubmit={(e) => handleSubmit(e, 'plano')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div className="form-group">
                        <label>Nome *</label>
                        <input type="text" required placeholder="Ex: 100MB Fibra" value={formPlano.nome}
                          onChange={(e) => setFormPlano({...formPlano, nome: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Download *</label>
                        <input type="text" required placeholder="100 Mbps" value={formPlano.velocidade_download}
                          onChange={(e) => setFormPlano({...formPlano, velocidade_download: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Upload *</label>
                        <input type="text" required placeholder="50 Mbps" value={formPlano.velocidade_upload}
                          onChange={(e) => setFormPlano({...formPlano, velocidade_upload: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Preço (R$) *</label>
                        <input type="number" required step="0.01" value={formPlano.preco_mensal}
                          onChange={(e) => setFormPlano({...formPlano, preco_mensal: e.target.value})} />
                      </div>
                      <div className="form-group" style={{gridColumn: '1 / -1'}}>
                        <label>Descrição</label>
                        <textarea rows="2" value={formPlano.descricao}
                          onChange={(e) => setFormPlano({...formPlano, descricao: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '16px' }}>
                      <button type="submit" className="btn-success">Cadastrar</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowPlanoForm(false)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="content-card">
                <h2 className="card-title">Planos ({planos.length})</h2>
                {planos.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">📡</span>
                    <p className="empty-state-text">Nenhum plano cadastrado</p>
                  </div>
                ) : (
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px'}}>
                    {planos.map(p => (
                      <div key={p.id} style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '16px', padding: '24px', color: 'white'
                      }}>
                        <h3 style={{fontSize: '24px', marginBottom: '8px'}}>{p.nome}</h3>
                        <div style={{fontSize: '14px', opacity: 0.9, marginBottom: '16px'}}>
                          ⬇️ {p.velocidade_download} | ⬆️ {p.velocidade_upload}
                        </div>
                        <div style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '8px'}}>
                          R$ {parseFloat(p.preco_mensal).toFixed(2)}
                          <span style={{fontSize: '14px', opacity: 0.8}}>/mês</span>
                        </div>
                        {p.descricao && <p style={{fontSize: '14px', opacity: 0.9}}>{p.descricao}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VENDAS */}
          {activeTab === 'vendas' && (
            <div>
              <button onClick={() => {
                setShowVendaForm(!showVendaForm);
                if (!showVendaForm) {
                  axios.get(`${API}/empresas/${empresaId}/clientes-venda`, {headers: {Authorization: `Bearer ${token}`}}).then(res => setClientes(res.data));
                  axios.get(`${API}/empresas/${empresaId}/planos-internet`, {headers: {Authorization: `Bearer ${token}`}}).then(res => setPlanos(res.data));
                }
              }} className="btn-success" style={{marginBottom: '16px'}}>
                {showVendaForm ? '❌ Cancelar' : '➕ Nova Venda'}
              </button>

              {showVendaForm && (
                <div className="content-card" style={{ marginBottom: '24px' }}>
                  <h2 className="card-title">Registrar Venda</h2>
                  <form onSubmit={(e) => handleSubmit(e, 'venda')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div className="form-group">
                        <label>Cliente *</label>
                        <select required value={formVenda.cliente_id}
                          onChange={(e) => setFormVenda({...formVenda, cliente_id: e.target.value})}>
                          <option value="">Selecione</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Plano *</label>
                        <select required value={formVenda.plano_id}
                          onChange={(e) => setFormVenda({...formVenda, plano_id: e.target.value})}>
                          <option value="">Selecione</option>
                          {planos.map(p => <option key={p.id} value={p.id}>{p.nome} - R$ {parseFloat(p.preco_mensal).toFixed(2)}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Data Contratação *</label>
                        <input type="date" required value={formVenda.data_contratacao}
                          onChange={(e) => setFormVenda({...formVenda, data_contratacao: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Dia Vencimento *</label>
                        <input type="number" required min="1" max="31" value={formVenda.dia_vencimento}
                          onChange={(e) => setFormVenda({...formVenda, dia_vencimento: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '16px' }}>
                      <button type="submit" className="btn-success">Registrar</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowVendaForm(false)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="content-card">
                <h2 className="card-title">Vendas ({vendas.length})</h2>
                {vendas.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">💰</span>
                    <p className="empty-state-text">Nenhuma venda registrada</p>
                  </div>
                ) : (
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Cliente</th><th>Plano</th><th>Valor</th><th>Data</th><th>Vencimento</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendas.map(v => (
                          <tr key={v.id}>
                            <td>{v.cliente?.nome_completo || 'N/A'}</td>
                            <td>{v.plano?.nome || 'N/A'}</td>
                            <td>R$ {parseFloat(v.valor_mensalidade).toFixed(2)}</td>
                            <td>{new Date(v.data_contratacao).toLocaleDateString('pt-BR')}</td>
                            <td>Dia {v.dia_vencimento}</td>
                            <td>
                              <span style={{
                                padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                background: v.status === 'ativo' ? '#dcfce7' : '#fee2e2',
                                color: v.status === 'ativo' ? '#16a34a' : '#dc2626'
                              }}>
                                {v.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FATURAS */}
          {activeTab === 'faturas' && (
            <div className="content-card">
              <h2 className="card-title">Faturas ({faturas.length})</h2>
              {faturas.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">📄</span>
                  <p className="empty-state-text">Nenhuma fatura gerada</p>
                  <p style={{fontSize: '14px', color: '#6b7280', marginTop: '8px'}}>
                    As faturas serão geradas automaticamente
                  </p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cliente</th><th>Referência</th><th>Vencimento</th><th>Valor</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturas.map(f => (
                        <tr key={f.id}>
                          <td>{f.cliente?.nome_completo || 'N/A'}</td>
                          <td>{f.mes_referencia}</td>
                          <td>{new Date(f.data_vencimento).toLocaleDateString('pt-BR')}</td>
                          <td>R$ {parseFloat(f.valor_total).toFixed(2)}</td>
                          <td>
                            <span style={{
                              padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                              background: f.status === 'pago' ? '#dcfce7' : f.status === 'vencido' ? '#fee2e2' : '#fef3c7',
                              color: f.status === 'pago' ? '#16a34a' : f.status === 'vencido' ? '#dc2626' : '#ca8a04'
                            }}>
                              {f.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Vendas;
