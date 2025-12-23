import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function Fornecedores({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    telefone: '',
    endereco: ''
  });

  useEffect(() => {
    loadEmpresa();
  }, []);

  useEffect(() => {
    if (empresa) {
      loadFornecedores();
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

  const loadFornecedores = async () => {
    try {
      const res = await axios.get(`${API}/empresas/${empresa.id}/fornecedores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFornecedores(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', cnpj: '', contato: '', email: '', telefone: '', endereco: '' });
    setEditingFornecedor(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (editingFornecedor) {
        // Atualizar fornecedor existente
        await axios.put(`${API}/fornecedores/${editingFornecedor.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Fornecedor atualizado com sucesso!');
      } else {
        // Criar novo fornecedor
        await axios.post(`${API}/empresas/${empresa.id}/fornecedores`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Fornecedor cadastrado com sucesso!');
      }

      resetForm();
      loadFornecedores();
    } catch (error) {
      setMessage('❌ Erro: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      nome: fornecedor.nome || '',
      cnpj: fornecedor.cnpj || '',
      contato: fornecedor.contato || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      endereco: fornecedor.endereco || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

    try {
      await axios.delete(`${API}/fornecedores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Fornecedor excluído com sucesso!');
      loadFornecedores();
    } catch (error) {
      setMessage('❌ Erro ao excluir: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Filtrar fornecedores pela busca
  const filteredFornecedores = fornecedores.filter(f => 
    f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!empresa) {
    return (
      <div className="container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-text">Nenhuma empresa cadastrada</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🏭 Fornecedores / Clientes</h2>
          <button 
            className="btn-success"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {showForm ? '✖️ Cancelar' : '➕ Novo Fornecedor'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            margin: '1rem 0',
            borderRadius: '8px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
          </div>
        )}

        {/* Formulário de Criação/Edição */}
        {showForm && (
          <div style={{
            marginTop: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid var(--border-color)'
          }}>
            <form onSubmit={handleSubmit}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                {editingFornecedor ? '✏️ Editar Fornecedor' : '➕ Novo Fornecedor'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">🏢 Nome / Razão Social *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    placeholder="Nome do fornecedor ou cliente"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📄 CNPJ / CPF *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    required
                    placeholder="00.000.000/0001-00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">👤 Contato</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.contato}
                    onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                    placeholder="Nome do contato"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📧 Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📱 Telefone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📍 Endereço</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  {loading ? '⏳ Salvando...' : (editingFornecedor ? '💾 Salvar Alterações' : '➕ Cadastrar Fornecedor')}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={resetForm}
                  disabled={loading}
                  style={{ padding: '0.75rem', fontSize: '0.9375rem' }}
                >
                  ✖️ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Barra de Busca */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '1rem' }}
              />
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {filteredFornecedores.length} de {fornecedores.length}
            </span>
          </div>
        </div>

        {/* Lista de Fornecedores */}
        <div style={{ marginTop: '1rem' }}>
          {filteredFornecedores.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏭</div>
              <div className="empty-state-text">
                {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              </div>
              <div className="empty-state-subtext">
                {searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Fornecedor" para começar'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.875rem'
              }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '2px solid var(--border-color)'
                  }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Fornecedor</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>CNPJ/CPF</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Contato</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Telefone</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFornecedores.map((f) => (
                    <tr 
                      key={f.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '1rem'
                          }}>
                            {f.nome?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500' }}>{f.nome}</div>
                            {f.endereco && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                📍 {f.endereco}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>{f.cnpj || '-'}</td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>{f.contato || '-'}</td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>{f.email || '-'}</td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>{f.telefone || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(f)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              border: '1px solid #93c5fd',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title="Editar fornecedor"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(f.id, f.nome)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title="Excluir fornecedor"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumo */}
        {fornecedores.length > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            📊 Total: <strong>{fornecedores.length}</strong> fornecedor(es) cadastrado(s)
          </div>
        )}
      </div>
    </div>
  );
}

export default Fornecedores;
