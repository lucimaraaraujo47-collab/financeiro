import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

function ImportarTransacoes({ user, token }) {
  const [empresa, setEmpresa] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('csv');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadEmpresa();
  }, []);

  const loadEmpresa = async () => {
    try {
      const empresasRes = await axios.get(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (empresasRes.data.length > 0) {
        setEmpresa(empresasRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading empresa:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    const validExtensions = {
      'csv': 'csv',
      'xlsx': 'excel',
      'xls': 'excel',
      'ofx': 'ofx',
      'pdf': 'pdf'
    };

    if (validExtensions[extension]) {
      setSelectedFile(file);
      setFileType(validExtensions[extension]);
      setResult(null);
    } else {
      alert('Formato não suportado. Use CSV, Excel, OFX ou PDF');
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !empresa) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${API}/empresas/${empresa.id}/transacoes/import/${fileType}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setResult(response.data);
      setSelectedFile(null);
    } catch (error) {
      setResult({
        status: 'error',
        message: error.response?.data?.detail || error.message
      });
    } finally {
      setUploading(false);
    }
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
        <h1 className="dashboard-title">Importar Transações</h1>
        <p className="dashboard-subtitle">Carregue extratos e arquivos financeiros</p>
      </div>

      {/* Guia de Formato */}
      <div className="content-card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title">Formatos Aceitos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>CSV</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Colunas: data, tipo, fornecedor, valor
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Excel</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              .xlsx ou .xls com colunas padrão
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏦</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>OFX</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Extrato bancário padrão
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📑</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>PDF</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Extração com IA (GPT-4)
            </div>
          </div>
        </div>
      </div>

      {/* Área de Upload */}
      <div className="content-card">
        <h3 className="card-title">Upload de Arquivo</h3>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            marginTop: '1rem',
            padding: '3rem',
            border: `2px dashed ${dragActive ? '#6366f1' : '#374151'}`,
            borderRadius: '12px',
            textAlign: 'center',
            background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
            transition: 'all 0.3s',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".csv,.xlsx,.xls,.ofx,.pdf"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {selectedFile ? '📄' : '⬆️'}
          </div>
          
          {selectedFile ? (
            <>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {selectedFile.name}
              </div>
              <div style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                {(selectedFile.size / 1024).toFixed(2)} KB | Tipo: {fileType.toUpperCase()}
              </div>
              <button
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={uploading}
                style={{ marginRight: '0.5rem' }}
              >
                {uploading ? '⏳ Processando...' : '✅ Importar'}
              </button>
              <button
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setResult(null);
                }}
              >
                ❌ Cancelar
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Arraste e solte seu arquivo aqui
              </div>
              <div style={{ color: '#9ca3af' }}>
                ou clique para selecionar
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                CSV, Excel, OFX ou PDF
              </div>
            </>
          )}
        </div>

        {/* Resultado */}
        {result && (
          <div 
            className={result.status === 'success' ? 'success-message' : 'error-message'}
            style={{ marginTop: '1.5rem' }}
          >
            {result.status === 'success' ? (
              <>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  ✅ Importação Concluída!
                </div>
                <div>
                  Importadas: <strong>{result.imported}</strong> de <strong>{result.total || result.imported}</strong> transações
                </div>
                {result.account && (
                  <div style={{ marginTop: '0.5rem' }}>
                    Conta: {result.account}
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600 }}>Erros encontrados:</div>
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                      {result.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.message && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {result.message}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  ❌ Erro na Importação
                </div>
                <div>{result.message}</div>
                {result.columns_found && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
                    <div>Colunas encontradas: {result.columns_found.join(', ')}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Template de CSV */}
      <div className="content-card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title">Modelo CSV</h3>
        <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
          Use este modelo para preparar seu arquivo CSV:
        </p>
        <div style={{ 
          background: '#1f2937', 
          padding: '1rem', 
          borderRadius: '8px', 
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          overflowX: 'auto'
        }}>
          <div>data,tipo,fornecedor,valor,descricao</div>
          <div>2025-10-15,despesa,Fornecedor A,150.00,Descrição opcional</div>
          <div>2025-10-16,receita,Cliente B,500.00,Pagamento recebido</div>
          <div>2025-10-17,despesa,Fornecedor C,75.50,Compra de material</div>
        </div>
      </div>
    </div>
  );
}

export default ImportarTransacoes;
