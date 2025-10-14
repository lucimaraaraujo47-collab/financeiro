import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import './MockWhatsApp.css';

function MockWhatsApp({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [suggestedClassification, setSuggestedClassification] = useState(null);

  useEffect(() => {
    loadData();
    addSystemMessage('Olá! Eu sou o FinAI. Envie informações sobre suas despesas ou receitas que eu vou processar automaticamente. 🚀');
  }, []);

  const loadData = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (empresasRes.data.length > 0) {
        const emp = empresasRes.data[0];
        setEmpresa(emp);

        const [categoriasRes, ccRes] = await Promise.all([
          axios.get(`${API}/empresas/${emp.id}/categorias`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/empresas/${emp.id}/centros-custo`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setCategorias(categoriasRes.data);
        setCentrosCusto(ccRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { type: 'system', text, timestamp: new Date() }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !empresa) return;

    const userMessage = inputText;
    addUserMessage(userMessage);
    setInputText('');
    setLoading(true);

    try {
      // Extract data with AI
      const extractRes = await axios.post(
        `${API}/ai/extrair-texto`,
        {
          texto: userMessage,
          empresa_id: empresa.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const dados = extractRes.data.dados_extraidos;
      const classificacao = extractRes.data.classificacao_sugerida;

      setExtractedData(dados);
      setSuggestedClassification(classificacao);

      // Build response message
      let responseText = '✅ Dados extraídos com sucesso!\n\n';
      responseText += `📊 Tipo: ${dados.tipo || 'N/A'}\n`;
      responseText += `🏢 Fornecedor: ${dados.fornecedor || 'N/A'}\n`;
      responseText += `💵 Valor: R$ ${dados.valor_total ? parseFloat(dados.valor_total).toFixed(2) : 'N/A'}\n`;
      responseText += `📅 Data: ${dados.data_competencia || 'N/A'}\n`;
      responseText += `📝 Descrição: ${dados.descricao || 'N/A'}\n`;

      if (classificacao) {
        responseText += `\n🎯 Classificação sugerida:\n`;
        responseText += `   Categoria: ${classificacao.categoria_nome} (${(classificacao.confidence * 100).toFixed(0)}% confiança)\n`;
        responseText += `   Centro de Custo: ${classificacao.centro_custo_nome}\n`;
        responseText += `   Razão: ${classificacao.reasoning}\n`;
      }

      responseText += '\nDeseja confirmar o lançamento?';
      addSystemMessage(responseText);

    } catch (error) {
      addSystemMessage('❌ Erro ao processar mensagem: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!extractedData || !empresa) return;

    setLoading(true);

    try {
      const payload = {
        tipo: extractedData.tipo || 'despesa',
        fornecedor: extractedData.fornecedor || 'Desconhecido',
        cnpj_cpf: extractedData.cnpj_cpf || null,
        descricao: extractedData.descricao || 'Sem descrição',
        valor_total: parseFloat(extractedData.valor_total) || 0,
        data_competencia: extractedData.data_competencia || new Date().toISOString().split('T')[0],
        categoria_id: suggestedClassification?.categoria_id || categorias[0]?.id,
        centro_custo_id: suggestedClassification?.centro_custo_id || centrosCusto[0]?.id,
        metodo_pagamento: extractedData.metodo_pagamento || null,
        status: 'pendente',
        origem: 'whatsapp'
      };

      await axios.post(`${API}/empresas/${empresa.id}/transacoes`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      addSystemMessage('✅ Transação registrada com sucesso! ID: TRX-' + Date.now());
      setExtractedData(null);
      setSuggestedClassification(null);

    } catch (error) {
      addSystemMessage('❌ Erro ao registrar transação: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!empresa) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-text">Nenhuma empresa cadastrada</div>
          <div className="empty-state-subtext">Configure sua empresa primeiro</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">WhatsApp Simulator</h1>
        <p className="dashboard-subtitle">Envie mensagens como se fosse pelo WhatsApp</p>
      </div>

      <div className="whatsapp-container" data-testid="whatsapp-container">
        <div className="whatsapp-header">
          <div className="whatsapp-header-info">
            <div className="whatsapp-avatar">🤖</div>
            <div>
              <div className="whatsapp-name">ECHO SHOP Bot</div>
              <div className="whatsapp-status">Online</div>
            </div>
          </div>
        </div>

        <div className="whatsapp-messages" data-testid="whatsapp-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.type}`}>
              <div className="message-bubble">
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message message-system">
              <div className="message-bubble">
                <div className="message-text">Processando com IA... 🤖</div>
              </div>
            </div>
          )}
        </div>

        <div className="whatsapp-input-container">
          {extractedData && (
            <div className="action-buttons">
              <button 
                className="btn-success" 
                onClick={handleConfirmTransaction}
                disabled={loading}
                data-testid="confirm-transaction-button"
              >
                ✅ Confirmar Lançamento
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setExtractedData(null);
                  setSuggestedClassification(null);
                  addSystemMessage('Lançamento cancelado. Envie outra mensagem.');
                }}
                data-testid="cancel-transaction-button"
              >
                ❌ Cancelar
              </button>
            </div>
          )}
          <div className="whatsapp-input-area">
            <textarea
              className="whatsapp-input"
              placeholder="Digite sua mensagem..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              rows={2}
              data-testid="whatsapp-input"
            />
            <button 
              className="whatsapp-send-btn" 
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              data-testid="whatsapp-send-button"
            >
              🚀
            </button>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Exemplos de Mensagens</h2>
        </div>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div className="example-message">
            <strong>Exemplo 1:</strong> "Paguei a conta de energia da sede ontem, R$ 842,35, Enel, centro de custo Operações."
          </div>
          <div className="example-message">
            <strong>Exemplo 2:</strong> "Compra de material de escritório na Kalunga, R$ 312,50, hoje."
          </div>
          <div className="example-message">
            <strong>Exemplo 3:</strong> "Recebimento de venda para cliente ACME, R$ 5.000,00, data 15/01/2025."
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockWhatsApp;