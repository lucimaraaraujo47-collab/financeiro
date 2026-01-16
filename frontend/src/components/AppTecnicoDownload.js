import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';

function AppTecnicoDownload({ user, token }) {
  const [apkInfo, setApkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [uploadVersion, setUploadVersion] = useState('1.0.0');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);
  
  const APP_VERSION = '1.0.0';
  
  useEffect(() => {
    loadApkInfo();
  }, []);

  const loadApkInfo = async () => {
    try {
      const response = await axios.get(`${API}/app-tecnico/apk/info`);
      setApkInfo(response.data);
    } catch (error) {
      console.error('Error loading APK info:', error);
      setApkInfo({ available: false });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Direct download via browser
    window.location.href = `${API}/app-tecnico/apk/download`;
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.apk')) {
      alert('Por favor, selecione um arquivo APK');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', uploadVersion);

    try {
      await axios.post(`${API}/app-tecnico/apk/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('APK enviado com sucesso!');
      setShowUploadModal(false);
      loadApkInfo();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao enviar APK');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Deseja realmente remover o APK?')) return;

    try {
      await axios.delete(`${API}/app-tecnico/apk`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('APK removido com sucesso');
      loadApkInfo();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao remover APK');
    }
  };

  const isAdmin = user?.perfil === 'admin';

  return (
    <div className="app-download-container">
      <style>{`
        .app-download-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .download-header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .download-header h1 {
          font-size: 2rem;
          color: #1e293b;
          margin-bottom: 10px;
        }
        
        .download-header p {
          color: #64748b;
          font-size: 1.1rem;
        }
        
        .admin-actions {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
          border: 1px solid #fbbf24;
        }
        
        .admin-actions h3 {
          color: #92400e;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .admin-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .admin-btn.upload {
          background: #1e40af;
          color: white;
        }
        
        .admin-btn.upload:hover {
          background: #1e3a8a;
        }
        
        .admin-btn.delete {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .admin-btn.delete:hover {
          background: #fecaca;
        }
        
        .download-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .download-card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .download-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        
        .download-card.android {
          border-top: 4px solid #3ddc84;
        }
        
        .download-card.android.available {
          background: linear-gradient(180deg, #ecfdf5 0%, white 30%);
        }
        
        .download-card.ios {
          border-top: 4px solid #007aff;
        }
        
        .download-card.expo {
          border-top: 4px solid #000;
        }
        
        .card-icon {
          font-size: 4rem;
          margin-bottom: 15px;
        }
        
        .card-title {
          font-size: 1.4rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 10px;
        }
        
        .card-description {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        
        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          text-decoration: none;
        }
        
        .download-btn.primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .download-btn.primary:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: scale(1.02);
        }
        
        .download-btn.secondary {
          background: #f1f5f9;
          color: #1e293b;
        }
        
        .download-btn.secondary:hover {
          background: #e2e8f0;
        }
        
        .download-btn.disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
        
        .version-badge {
          display: inline-block;
          background: #ecfdf5;
          color: #059669;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-top: 15px;
        }
        
        .apk-details {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          text-align: left;
        }
        
        .apk-detail {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 5px;
        }
        
        .apk-detail strong {
          color: #1e293b;
        }
        
        .instructions-section {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin-bottom: 30px;
        }
        
        .instructions-section h2 {
          font-size: 1.3rem;
          color: #1e293b;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .instruction-steps {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .step {
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }
        
        .step-number {
          background: #1e40af;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        
        .step-content {
          flex: 1;
        }
        
        .step-content strong {
          color: #1e293b;
        }
        
        .step-content p {
          color: #64748b;
          margin-top: 4px;
          font-size: 0.95rem;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
        }
        
        .feature-icon {
          font-size: 1.5rem;
        }
        
        .feature-text {
          color: #1e293b;
          font-size: 0.95rem;
        }
        
        .code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 15px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.9rem;
          overflow-x: auto;
          margin: 15px 0;
        }
        
        .alert-info {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          border-radius: 0 8px 8px 0;
          margin: 20px 0;
        }
        
        .alert-info p {
          color: #1e40af;
          margin: 0;
        }
        
        .alert-warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 0 8px 8px 0;
          margin: 20px 0;
        }
        
        .alert-warning p {
          color: #92400e;
          margin: 0;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          width: 90%;
          max-width: 450px;
        }
        
        .modal-content h2 {
          margin-bottom: 20px;
          color: #1e293b;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #1e293b;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
        }
        
        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .modal-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        
        .modal-btn.cancel {
          background: #f1f5f9;
          color: #64748b;
        }
        
        .modal-btn.submit {
          background: #1e40af;
          color: white;
        }
        
        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="download-header">
        <h1>📱 App do Técnico</h1>
        <p>Aplicativo mobile para técnicos gerenciarem ordens de serviço em campo</p>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="admin-actions">
          <h3>⚙️ Gerenciamento do APK (Admin)</h3>
          <div className="admin-buttons">
            <button 
              className="admin-btn upload" 
              onClick={() => setShowUploadModal(true)}
            >
              📤 Enviar novo APK
            </button>
            {apkInfo?.available && (
              <button className="admin-btn delete" onClick={handleDelete}>
                🗑️ Remover APK
              </button>
            )}
          </div>
        </div>
      )}

      <div className="download-cards">
        {/* Android APK */}
        <div className={`download-card android ${apkInfo?.available ? 'available' : ''}`}>
          <div className="card-icon">🤖</div>
          <h3 className="card-title">Android (APK)</h3>
          <p className="card-description">
            {apkInfo?.available 
              ? 'APK disponível para download e instalação direta'
              : 'Baixe o APK diretamente para instalar em qualquer dispositivo Android'
            }
          </p>
          
          {loading ? (
            <div className="loading-spinner"></div>
          ) : apkInfo?.available ? (
            <>
              <button className="download-btn primary" onClick={handleDownload}>
                ⬇️ Baixar APK
              </button>
              <div className="version-badge">Versão {apkInfo.version}</div>
              <div className="apk-details">
                <div className="apk-detail">
                  <span>Tamanho:</span>
                  <strong>{apkInfo.size_mb} MB</strong>
                </div>
                <div className="apk-detail">
                  <span>Atualizado:</span>
                  <strong>{new Date(apkInfo.upload_date).toLocaleDateString('pt-BR')}</strong>
                </div>
                {apkInfo.uploaded_by && (
                  <div className="apk-detail">
                    <span>Por:</span>
                    <strong>{apkInfo.uploaded_by}</strong>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="download-btn disabled" disabled>
                🔄 APK não disponível
              </button>
              <div className="version-badge">Aguardando upload</div>
            </>
          )}
        </div>

        {/* Expo Go */}
        <div className="download-card expo">
          <div className="card-icon">📲</div>
          <h3 className="card-title">Expo Go (Teste)</h3>
          <p className="card-description">
            Para desenvolvedores: teste o app usando o Expo Go
          </p>
          <button 
            className="download-btn secondary"
            onClick={() => setShowQRCode(!showQRCode)}
          >
            📖 Ver Instruções
          </button>
          <div className="version-badge">Desenvolvimento</div>
        </div>

        {/* iOS */}
        <div className="download-card ios">
          <div className="card-icon">🍎</div>
          <h3 className="card-title">iOS (TestFlight)</h3>
          <p className="card-description">
            Em breve disponível para dispositivos Apple via TestFlight
          </p>
          <button className="download-btn disabled" disabled>
            🔜 Em breve
          </button>
          <div className="version-badge">Pendente</div>
        </div>
      </div>

      {showQRCode && (
        <div className="instructions-section">
          <h2>📱 Instruções para Desenvolvedores</h2>
          
          <div className="alert-info">
            <p><strong>Nota:</strong> Este método é para testes durante o desenvolvimento. Para uso em produção, baixe o APK.</p>
          </div>

          <div className="instruction-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <strong>Instale o Expo Go</strong>
                <p>Baixe o app "Expo Go" na Play Store (Android) ou App Store (iOS)</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>Clone o repositório</strong>
                <div className="code-block">
                  git clone [seu-repositorio]<br/>
                  cd app-tecnico<br/>
                  npm install
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Inicie o servidor de desenvolvimento</strong>
                <div className="code-block">
                  npx expo start --tunnel
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <strong>Escaneie o QR Code</strong>
                <p>Use o Expo Go para escanear o QR code exibido no terminal</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="instructions-section">
        <h2>✨ Funcionalidades do App</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <span className="feature-text">Login seguro</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <span className="feature-text">Lista de OS</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span className="feature-text">Checklist interativo</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✍️</span>
            <span className="feature-text">Assinatura digital</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📷</span>
            <span className="feature-text">Fotos do serviço</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📞</span>
            <span className="feature-text">Contato rápido</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🗺️</span>
            <span className="feature-text">Navegação GPS</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <span className="feature-text">WhatsApp direto</span>
          </div>
        </div>
      </div>

      <div className="instructions-section">
        <h2>📥 Como instalar o APK</h2>
        
        <div className="alert-warning">
          <p><strong>Android:</strong> Você pode precisar habilitar "Fontes desconhecidas" nas configurações para instalar o APK.</p>
        </div>

        <div className="instruction-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <strong>Baixe o APK</strong>
              <p>Clique no botão "Baixar APK" acima ou envie o link para o técnico</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <strong>Permita a instalação</strong>
              <p>Configurações → Segurança → Fontes desconhecidas → Permitir</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <strong>Instale o app</strong>
              <p>Abra o arquivo APK baixado e toque em "Instalar"</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <strong>Faça login</strong>
              <p>Use suas credenciais do sistema para acessar o app</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>📤 Enviar APK</h2>
            
            <div className="form-group">
              <label>Versão do App</label>
              <input
                type="text"
                value={uploadVersion}
                onChange={e => setUploadVersion(e.target.value)}
                placeholder="Ex: 1.0.0"
              />
            </div>

            <div className="form-group">
              <label>Arquivo APK</label>
              <input
                type="file"
                accept=".apk"
                ref={fileInputRef}
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="alert-info">
                <p>⏳ Enviando APK... Aguarde.</p>
              </div>
            )}

            <div className="modal-buttons">
              <button 
                className="modal-btn cancel" 
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppTecnicoDownload;
