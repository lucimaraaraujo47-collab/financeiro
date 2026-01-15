import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ModelosContrato({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo_html: ''
  });

  const variaveisDisponiveis = [
    { var: 'nome_cliente', desc: 'Nome completo do cliente' },
    { var: 'cpf_cnpj', desc: 'CPF ou CNPJ' },
    { var: 'endereco_completo', desc: 'Endereço completo' },
    { var: 'telefone', desc: 'Telefone do cliente' },
    { var: 'email', desc: 'E-mail do cliente' },
    { var: 'plano_nome', desc: 'Nome do plano' },
    { var: 'plano_valor', desc: 'Valor do plano' },
    { var: 'periodicidade', desc: 'Periodicidade (mensal, anual)' },
    { var: 'fidelidade_meses', desc: 'Prazo de fidelidade em meses' },
    { var: 'valor_multa', desc: 'Valor da multa por cancelamento' },
    { var: 'data_inicio', desc: 'Data de início do contrato' },
    { var: 'data_fim', desc: 'Data de fim da fidelidade' },
    { var: 'data_assinatura', desc: 'Data da assinatura' }
  ];

  const modeloPadrao = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center; color: #1e40af;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
  
  <h2 style="margin-top: 30px;">1. PARTES</h2>
  <p><strong>CONTRATANTE:</strong> {{nome_cliente}}, inscrito no CPF/CNPJ sob nº {{cpf_cnpj}}, residente/sediado em {{endereco_completo}}, telefone {{telefone}}, e-mail {{email}}.</p>
  <p><strong>CONTRATADA:</strong> [NOME DA EMPRESA], inscrita no CNPJ sob nº [CNPJ], com sede em [ENDEREÇO].</p>
  
  <h2>2. OBJETO</h2>
  <p>O presente contrato tem por objeto a prestação de serviços de <strong>{{plano_nome}}</strong>, conforme especificações do plano contratado.</p>
  
  <h2>3. VALOR E PAGAMENTO</h2>
  <p>O valor do serviço será de <strong>{{plano_valor}}</strong> ({{periodicidade}}), com vencimento conforme acordado entre as partes.</p>
  
  <h2>4. PRAZO E FIDELIDADE</h2>
  <p>Este contrato terá início em <strong>{{data_inicio}}</strong> e prazo de fidelidade de <strong>{{fidelidade_meses}} meses</strong>, com término previsto em <strong>{{data_fim}}</strong>.</p>
  <p>Em caso de cancelamento antecipado por parte do CONTRATANTE, será cobrada multa no valor de <strong>{{valor_multa}}</strong>.</p>
  
  <h2>5. DISPOSIÇÕES GERAIS</h2>
  <p>As partes elegem o foro da comarca de [CIDADE] para dirimir quaisquer dúvidas oriundas deste contrato.</p>
  
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 45%;">
      <p style="border-top: 1px solid #000; padding-top: 10px;">{{nome_cliente}}<br><small>CONTRATANTE</small></p>
    </div>
    <div style="text-align: center; width: 45%;">
      <p style="border-top: 1px solid #000; padding-top: 10px;">[NOME DA EMPRESA]<br><small>CONTRATADA</small></p>
    </div>
  </div>
  
  <p style="text-align: center; margin-top: 30px; color: #666;">Data: {{data_assinatura}}</p>
</div>`;

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
        
        const modelosRes = await axios.get(`${API}/empresas/${emp.id}/modelos-contrato`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setModelos(modelosRes.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa) return;

    try {
      if (editingId) {
        await axios.put(`${API}/modelos-contrato/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Modelo atualizado! Nova versão criada.');
      } else {
        await axios.post(`${API}/empresas/${empresa.id}/modelos-contrato`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('✅ Modelo criado com sucesso!');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ nome: '', descricao: '', conteudo_html: '' });
      loadData();
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Erro ao salvar'));
    }
  };

  const handleEdit = (modelo) => {
    setFormData({
      nome: modelo.nome,
      descricao: modelo.descricao || '',
      conteudo_html: modelo.conteudo_html
    });
    setEditingId(modelo.id);
    setShowForm(true);
  };

  const handlePreview = async (modeloId) => {
    try {
      const res = await axios.get(`${API}/modelos-contrato/${modeloId}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewHtml(res.data.preview_html);
      setShowPreview(true);
    } catch (error) {
      setMessage('❌ Erro ao gerar preview');
    }
  };

  const insertVariable = (varName) => {
    const textarea = document.getElementById('conteudo-editor');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.conteudo_html;
      const newText = text.substring(0, start) + `{{${varName}}}` + text.substring(end);
      setFormData({ ...formData, conteudo_html: newText });
    } else {
      setFormData({ ...formData, conteudo_html: formData.conteudo_html + `{{${varName}}}` });
    }
  };

  const usarModeloPadrao = () => {
    setFormData({ ...formData, conteudo_html: modeloPadrao });
  };

  if (loading) {
    return <div className="dashboard"><div className="loading-screen">Carregando...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📄 Modelos de Contrato</h1>
        <p className="dashboard-subtitle">Crie modelos com variáveis dinâmicas e versionamento</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {/* Modal de Preview */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Preview do Contrato</h3>
              <button onClick={() => setShowPreview(false)} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}>×</button>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '2rem', borderRadius: '8px' }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Modelos Cadastrados</h2>
          <button
            className="btn-success"
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ nome: '', descricao: '', conteudo_html: '' }); }}
          >
            {showForm ? 'Cancelar' : '+ Novo Modelo'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Modelo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Contrato Padrão Fibra"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição do modelo"
                />
              </div>
            </div>

            {/* Variáveis disponíveis */}
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#e0f2fe', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#1e40af' }}>📌 Variáveis Disponíveis (clique para inserir)</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {variaveisDisponiveis.map(v => (
                  <button
                    key={v.var}
                    type="button"
                    onClick={() => insertVariable(v.var)}
                    title={v.desc}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#fff',
                      border: '1px solid #3b82f6',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: '#1e40af'
                    }}
                  >
                    {`{{${v.var}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Conteúdo do Contrato (HTML) *</label>
                <button type="button" onClick={usarModeloPadrao} style={{
                  padding: '0.25rem 0.75rem',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}>
                  📋 Usar Modelo Padrão
                </button>
              </div>
              <textarea
                id="conteudo-editor"
                className="form-input"
                value={formData.conteudo_html}
                onChange={(e) => setFormData({ ...formData, conteudo_html: e.target.value })}
                rows="15"
                placeholder="Cole ou escreva o HTML do contrato aqui..."
                required
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-success">
                {editingId ? 'Atualizar (Nova Versão)' : 'Criar Modelo'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de Modelos */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {modelos.map(modelo => (
            <div key={modelo.id} style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📄 {modelo.nome}
                  <span style={{
                    background: '#dbeafe',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    color: '#1e40af'
                  }}>v{modelo.versao}</span>
                </h3>
                {modelo.descricao && (
                  <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>{modelo.descricao}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.875rem' }}
                  onClick={() => handlePreview(modelo.id)}
                >
                  👁️ Preview
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.875rem' }}
                  onClick={() => handleEdit(modelo)}
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))}
        </div>

        {modelos.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">Nenhum modelo cadastrado</div>
            <div className="empty-state-subtext">Crie seu primeiro modelo de contrato</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelosContrato;