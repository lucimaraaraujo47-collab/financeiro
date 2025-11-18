import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Vendas({ user, token }) {
  const [activeTab, setActiveTab] = useState('clientes'); // clientes, planos, vendas, faturas
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Data states
  const [clientes, setClientes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [faturas, setFaturas] = useState([]);
  
  // Form states
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [showPlanoForm, setShowPlanoForm] = useState(false);
  const [showVendaForm, setShowVendaForm] = useState(false);
  
  const [formCliente, setFormCliente] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });
  
  const [formPlano, setFormPlano] = useState({
    nome: '',
    velocidade_download: '',
    velocidade_upload: '',
    preco_mensal: '',
    descricao: '',
    beneficios: []
  });
  
  const [formVenda, setFormVenda] = useState({
    cliente_id: '',
    plano_id: '',
    data_contratacao: new Date().toISOString().split('T')[0],
    dia_vencimento: 10,
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (empresasRes.data.length > 0) {
        const empresaId = empresasRes.data[0].id;
        
        if (activeTab === 'clientes') {
          const res = await axios.get(`${API}/empresas/${empresaId}/clientes-venda`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClientes(res.data);
        } else if (activeTab === 'planos') {
          const res = await axios.get(`${API}/empresas/${empresaId}/planos-internet`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPlanos(res.data);
        } else if (activeTab === 'vendas') {
          const res = await axios.get(`${API}/empresas/${empresaId}/vendas`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setVendas(res.data);
        } else if (activeTab === 'faturas') {
          const res = await axios.get(`${API}/empresas/${empresaId}/faturas`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setFaturas(res.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar CEP via ViaCEP
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
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const empresaId = empresasRes.data[0].id;
      
      await axios.post(`${API}/empresas/${empresaId}/clientes-venda`, formCliente, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Cliente cadastrado com sucesso!');
      setShowClienteForm(false);
      setFormCliente({
        nome_completo: '', cpf: '', email: '', telefone: '',
        cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', cidade: '', estado: ''
      });
      loadData();
    } catch (error) {
      setMessage('❌ Erro ao cadastrar cliente: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreatePlano = async (e) => {
    e.preventDefault();
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const empresaId = empresasRes.data[0].id;
      
      await axios.post(`${API}/empresas/${empresaId}/planos-internet`, {
        ...formPlano,
        preco_mensal: parseFloat(formPlano.preco_mensal)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Plano cadastrado com sucesso!');
      setShowPlanoForm(false);
      setFormPlano({
        nome: '', velocidade_download: '', velocidade_upload: '',
        preco_mensal: '', descricao: '', beneficios: []
      });
      loadData();
    } catch (error) {
      setMessage('❌ Erro ao cadastrar plano: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateVenda = async (e) => {
    e.preventDefault();
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const empresaId = empresasRes.data[0].id;
      
      await axios.post(`${API}/empresas/${empresaId}/vendas`, {
        ...formVenda,
        dia_vencimento: parseInt(formVenda.dia_vencimento)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Venda registrada com sucesso!');
      setShowVendaForm(false);
      setFormVenda({
        cliente_id: '', plano_id: '',
        data_contratacao: new Date().toISOString().split('T')[0],
        dia_vencimento: 10, observacoes: ''
      });
      loadData();
    } catch (error) {
      setMessage('❌ Erro ao registrar venda: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">💼 Vendas e Assinaturas</h1>
        <p className="dashboard-subtitle">Gerencie clientes, planos e cobranças recorrentes</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        overflowX: 'auto'
      }}>
        {['clientes', 'planos', 'vendas', 'faturas'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? '#3b82f6' : 'transparent',
              color: activeTab === tab ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              fontSize: '16px',
              borderRadius: '8px 8px 0 0',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'clientes' && '👥 Clientes'}
            {tab === 'planos' && '📡 Planos'}
            {tab === 'vendas' && '💰 Vendas/Contratos'}
            {tab === 'faturas' && '📄 Faturas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-screen">Carregando...</div>
      ) : (
        <>
          {/* CLIENTES TAB */}
          {activeTab === 'clientes' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setShowClienteForm(!showClienteForm)}
                  className="btn-success"
                >
                  {showClienteForm ? '❌ Cancelar' : '➕ Novo Cliente'}
                </button>
              </div>

              {showClienteForm && (
                <div className="content-card" style={{ marginBottom: '24px' }}>
                  <h2 className="card-title">Cadastro de Cliente</h2>
                  <form onSubmit={handleCreateCliente}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div className="form-group">
                        <label>Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={formCliente.nome_completo}
                          onChange={(e) => setFormCliente({...formCliente, nome_completo: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>CPF *</label>
                        <input
                          type="text"
                          required
                          placeholder="000.000.000-00"
                          value={formCliente.cpf}
                          onChange={(e) => setFormCliente({...formCliente, cpf: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          required
                          value={formCliente.email}
                          onChange={(e) => setFormCliente({...formCliente, email: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Telefone *</label>
                        <input
                          type="text"
                          required
                          placeholder="(00) 00000-0000"
                          value={formCliente.telefone}
                          onChange={(e) => setFormCliente({...formCliente, telefone: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>CEP *</label>
                        <input
                          type="text"
                          required
                          placeholder="00000-000"
                          value={formCliente.cep}
                          onChange={(e) => {
                            setFormCliente({...formCliente, cep: e.target.value});
                            if (e.target.value.replace(/\D/g, '').length === 8) {
                              buscarCEP(e.target.value);
                            }
                          }}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Logradouro *</label>
                        <input
                          type="text"
                          required
                          value={formCliente.logradouro}
                          onChange={(e) => setFormCliente({...formCliente, logradouro: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Número *</label>
                        <input
                          type="text"
                          required
                          value={formCliente.numero}
                          onChange={(e) => setFormCliente({...formCliente, numero: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Complemento</label>
                        <input
                          type="text"
                          value={formCliente.complemento}
                          onChange={(e) => setFormCliente({...formCliente, complemento: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Bairro *</label>
                        <input
                          type="text"
                          required
                          value={formCliente.bairro}
                          onChange={(e) => setFormCliente({...formCliente, bairro: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Cidade *</label>
                        <input
                          type="text"
                          required
                          value={formCliente.cidade}
                          onChange={(e) => setFormCliente({...formCliente, cidade: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Estado *</label>
                        <input
                          type="text"
                          required
                          placeholder="UF"
                          maxLength="2"
                          value={formCliente.estado}
                          onChange={(e) => setFormCliente({...formCliente, estado: e.target.value.toUpperCase()})}
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions" style={{ marginTop: '16px' }}>
                      <button type="submit" className="btn-success">Cadastrar Cliente</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowClienteForm(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="content-card">
                <h2 className="card-title">Lista de Clientes ({clientes.length})</h2>
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
                          <th>Nome</th>
                          <th>CPF</th>
                          <th>Email</th>
                          <th>Telefone</th>
                          <th>Cidade</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientes.map((cliente) => (
                          <tr key={cliente.id}>
                            <td>{cliente.nome_completo}</td>
                            <td>{cliente.cpf}</td>
                            <td>{cliente.email}</td>
                            <td>{cliente.telefone}</td>
                            <td>{cliente.cidade}/{cliente.estado}</td>
                            <td>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                background: cliente.status === 'ativo' ? '#dcfce7' : '#fee2e2',
                                color: cliente.status === 'ativo' ? '#16a34a' : '#dc2626'
                              }}>
                                {cliente.status}
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

          {/* PLANOS TAB - Continua no próximo arquivo... */}
        </>
      )}
    </div>
  );
}

export default Vendas;
