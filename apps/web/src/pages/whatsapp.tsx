// @ts-nocheck
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { ErrorMessage, LoadingSpinner } from '../components/LoadingSpinner';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/auth-context';

interface WhatsappInstance {
  id: string;
  name: string;
  phoneNumber?: string;
  status: string;
  createdAt: string;
}

interface QRCodeData {
  qrCode: string | null;
  status: string;
}

export default function WhatsappInstancesPage() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsappInstance | null>(null);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (user) {
      loadInstances();
    } else {
      // Se não houver usuário, pare o loading após 2 segundos
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Timeout de segurança: se demorar mais de 5 segundos, mostrar erro
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError('⏱️ Timeout ao carregar instâncias. Verifique se a API está rodando.');
      }, 5000);
      
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        clearTimeout(timeoutId);
        console.warn('⚠️ No organization found');
        setError('Organização não encontrada. Você precisa estar conectado e ter uma organização ativa.');
        setLoading(false);
        return;
      }
      
      console.log('📊 Loading instances for organization:', organizationId);
      const response = await apiClient.get(`/whatsapp/instances?organizationId=${organizationId}`);
      console.log('✅ Instances loaded:', response.data);
      clearTimeout(timeoutId);
      setInstances(response.data);
    } catch (err: any) {
      console.error('❌ Error loading instances:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar instâncias';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || !err.response) {
        setError('🔌 API Offline: O servidor não está respondendo. Inicie a API com: cd apps/api && npm run dev');
      } else if (err.response?.status === 401) {
        setError('🔒 Não autenticado. Faça login novamente.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Obter organizationId do usuário
    const organizationId = user?.memberships?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }

    try {
      await apiClient.post(`/whatsapp/instances?organizationId=${organizationId}`, formData);
      setShowAddModal(false);
      setFormData({ name: '', phoneNumber: '' });
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar instância');
    }
  };

  const handleEdit = (instance: WhatsappInstance) => {
    setSelectedInstance(instance);
    setFormData({
      name: instance.name,
      phoneNumber: instance.phoneNumber || '',
    });
    setShowEditModal(true);
    setError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstance) return;
    
    setError(null);
    const organizationId = user?.memberships?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada.');
      return;
    }

    try {
      await apiClient.patch(
        `/whatsapp/instances/${selectedInstance.id}?organizationId=${organizationId}`,
        formData
      );
      setShowEditModal(false);
      setSelectedInstance(null);
      setFormData({ name: '', phoneNumber: '' });
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar instância');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

    try {
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        setError('Organização não encontrada. Por favor, faça login novamente.');
        return;
      }
      
      await apiClient.delete(`/whatsapp/instances/${id}?organizationId=${organizationId}`);
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir instância');
    }
  };

  const handleShowDetails = (instance: WhatsappInstance) => {
    setSelectedInstance(instance);
    setShowDetailsModal(true);
  };

  const handleConnect = async (id: string) => {
    try {
      setError(null);
      
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        setError('Organização não encontrada. Por favor, faça login novamente.');
        return;
      }
      
      console.log('🔌 Connecting instance:', id);
      await apiClient.post(`/whatsapp/instances/${id}/connect?organizationId=${organizationId}`);
      
      // Wait a bit then show QR code
      setTimeout(() => {
        const instance = instances.find(i => i.id === id);
        if (instance) {
          handleShowQR(instance);
        }
      }, 2000);
    } catch (err: any) {
      console.error('❌ Error connecting:', err);
      setError(err.response?.data?.message || 'Erro ao conectar instância');
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Desconectar esta instância?')) return;

    try {
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        setError('Organização não encontrada. Por favor, faça login novamente.');
        return;
      }
      
      await apiClient.post(`/whatsapp/instances/${id}/disconnect?organizationId=${organizationId}`);
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desconectar instância');
    }
  };

  const handleShowQR = async (instance: WhatsappInstance) => {
    setSelectedInstance(instance);
    setShowQRModal(true);
    setLoadingQR(true);
    setQRCodeData(null);

    try {
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        setError('Organização não encontrada. Por favor, faça login novamente.');
        return;
      }
      
      console.log('📱 Getting QR code for instance:', instance.id);
      const response = await apiClient.get(`/whatsapp/instances/${instance.id}/qrcode?organizationId=${organizationId}`);
      console.log('✅ QR code response:', response.data);
      setQRCodeData(response.data);
      
      // Auto-refresh QR code if needed
      if (response.data.status === 'CONNECTING' || response.data.status === 'QR_CODE') {
        setTimeout(() => {
          if (showQRModal) {
            refreshQR(instance.id);
          }
        }, 5000);
      }
    } catch (err: any) {
      console.error('❌ Error getting QR code:', err);
      setError(err.response?.data?.message || 'Erro ao obter QR code');
    } finally {
      setLoadingQR(false);
    }
  };

  const refreshQR = async (id: string) => {
    try {
      // Obter organizationId do usuário
      const organizationId = user?.memberships?.[0]?.organization?.id;
      
      if (!organizationId) {
        return;
      }
      
      const response = await apiClient.get(`/whatsapp/instances/${id}/qrcode?organizationId=${organizationId}`);
      console.log('🔄 QR code refreshed:', response.data);
      setQRCodeData(response.data);
      
      // Continue refreshing if still waiting
      if (response.data.status === 'CONNECTING' || response.data.status === 'QR_CODE') {
        setTimeout(() => {
          if (showQRModal && selectedInstance?.id === id) {
            refreshQR(id);
          }
        }, 5000);
      } else if (response.data.status === 'CONNECTED') {
        // Instance connected, reload list
        setShowQRModal(false);
        loadInstances();
      }
    } catch (err: any) {
      console.error('Error refreshing QR:', err);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormData({ name: '', phoneNumber: '' });
    setError(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedInstance(null);
    setFormData({ name: '', phoneNumber: '' });
    setError(null);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedInstance(null);
    setQRCodeData(null);
    loadInstances();
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedInstance(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; label: string; icon: string }> = {
      CONNECTED: { class: 'status-connected', label: 'Conectado', icon: '✅' },
      CONNECTING: { class: 'status-connecting', label: 'Conectando', icon: '⏳' },
      QR_CODE: { class: 'status-connecting', label: 'QR Code', icon: '📷' },
      DISCONNECTED: { class: 'status-disconnected', label: 'Desconectado', icon: '⭕' },
      ERROR: { class: 'status-error', label: 'Erro', icon: '⚠️' },
    };

    const config = statusConfig[status] || statusConfig.DISCONNECTED;

    return (
      <span className={`status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Apenas mostrar loading spinner se estiver carregando E não houver erro
  const showLoading = loading && instances.length === 0 && !error;

  return (
    <Layout title="Instâncias WhatsApp">
      <Head>
        <title>Instâncias WhatsApp — WhatsApp SaaS</title>
      </Head>

      <div className="whatsapp-container">
        {/* Connection Status Banner */}
        {!user && (
          <div style={{
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700' }}>
              ⚠️ Carregando dados do usuário...
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>
              Aguarde enquanto verificamos suas credenciais.
            </p>
          </div>
        )}
        
        {/* Header */}
        <header className="page-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="page-title">
                <span className="icon">📱</span>
                Instâncias WhatsApp
              </h1>
              <p className="page-subtitle">Gerencie suas conexões e dispositivos WhatsApp</p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <span className="btn-icon">➕</span>
              Nova Instância
            </button>
          </div>
        </header>

        {error && <ErrorMessage message={error} onRetry={() => loadInstances()} />}

        {/* Loading Indicator */}
        {showLoading && (
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <LoadingSpinner message="Carregando instâncias WhatsApp..." />
          </div>
        )}

        {/* Stats Cards */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon">📱</div>
              <div className="stat-content">
                <h3 className="stat-number">{instances.length}</h3>
                <p className="stat-label">Total de Instâncias</p>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {instances.filter(i => i.status === 'CONNECTED').length}
                </h3>
                <p className="stat-label">Conectadas</p>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {instances.filter(i => i.status === 'CONNECTING' || i.status === 'QR_CODE').length}
                </h3>
                <p className="stat-label">Conectando</p>
              </div>
            </div>

            <div className="stat-card stat-error">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {instances.filter(i => i.status === 'DISCONNECTED' || i.status === 'ERROR').length}
                </h3>
                <p className="stat-label">Desconectadas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Instances Grid */}
        <section className="instances-section">
          {instances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3 className="empty-title">Nenhuma instância configurada</h3>
              <p className="empty-message">
                Crie sua primeira instância WhatsApp para começar a enviar mensagens
              </p>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <span className="btn-icon">➕</span>
                Criar Primeira Instância
              </button>
            </div>
          ) : (
            <div className="instances-grid">
              {instances.map((instance) => (
                <div key={instance.id} className="instance-card">
                  <div className="card-header">
                    <div className="header-info">
                      <div className="instance-avatar">
                        <span>{instance.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="instance-details">
                        <h3 className="instance-name">{instance.name}</h3>
                        {instance.phoneNumber && (
                          <p className="instance-phone">
                            <span className="phone-icon">📞</span>
                            {instance.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(instance.status)}
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="info-label">Criado em:</span>
                      <span className="info-value">
                        {new Date(instance.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="action-row">
                      {instance.status === 'DISCONNECTED' || instance.status === 'ERROR' ? (
                        <button
                          className="btn-success btn-flex"
                          onClick={() => handleConnect(instance.id)}
                        >
                          <span className="btn-icon">🔌</span>
                          Conectar
                        </button>
                      ) : instance.status === 'CONNECTED' ? (
                        <button
                          className="btn-warning btn-flex"
                          onClick={() => handleDisconnect(instance.id)}
                        >
                          <span className="btn-icon">⏸️</span>
                          Desconectar
                        </button>
                      ) : (
                        <button
                          className="btn-info btn-flex"
                          onClick={() => handleShowQR(instance)}
                        >
                          <span className="btn-icon">�</span>
                          Ver QR Code
                        </button>
                      )}
                      
                      <button
                        className="btn-secondary btn-flex"
                        onClick={() => handleEdit(instance)}
                      >
                        <span className="btn-icon">✏️</span>
                        Editar
                      </button>
                    </div>
                    
                    <div className="action-row mt-2">
                      <button
                        className="btn-outline btn-flex"
                        onClick={() => handleShowDetails(instance)}
                      >
                        <span className="btn-icon">ℹ️</span>
                        Detalhes
                      </button>
                      
                      <button
                        className="btn-danger btn-flex"
                        onClick={() => handleDelete(instance.id)}
                      >
                        <span className="btn-icon">🗑️</span>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nova Instância WhatsApp</h5>
                <button type="button" className="btn-close" onClick={closeAddModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  
                  <div className="mb-3">
                    <label className="form-label">Nome da Instância *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: WhatsApp Principal"
                      required
                    />
                    <small className="form-text text-muted">
                      Nome identificador para esta instância
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Número de Telefone (opcional)</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="5511999999999"
                    />
                    <small className="form-text text-muted">
                      Número que será conectado (apenas referência)
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Criar Instância
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedInstance && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h2 className="modal-title-custom">
                <span className="modal-icon">✏️</span>
                Editar Instância
              </h2>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body-custom">
                {error && (
                  <div className="alert-danger-custom">
                    <span className="alert-icon">⚠️</span>
                    {error}
                  </div>
                )}
                
                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <span className="label-icon">📝</span>
                    Nome da Instância *
                  </label>
                  <input
                    type="text"
                    className="form-input-custom"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: WhatsApp Principal"
                    required
                  />
                  <small className="form-hint">Nome identificador para esta instância</small>
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <span className="label-icon">📞</span>
                    Número de Telefone
                  </label>
                  <input
                    type="tel"
                    className="form-input-custom"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="5511999999999"
                  />
                  <small className="form-hint">Número que será conectado (apenas referência)</small>
                </div>
              </div>
              
              <div className="modal-footer-custom">
                <button type="button" className="btn-secondary-custom" onClick={closeEditModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-custom">
                  <span className="btn-icon">💾</span>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedInstance && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h2 className="modal-title-custom">
                <span className="modal-icon">ℹ️</span>
                Detalhes da Instância
              </h2>
              <button className="modal-close" onClick={closeDetailsModal}>✕</button>
            </div>
            
            <div className="modal-body-custom">
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-icon">📝</div>
                  <div className="detail-content">
                    <label className="detail-label">Nome</label>
                    <p className="detail-value">{selectedInstance.name}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">📞</div>
                  <div className="detail-content">
                    <label className="detail-label">Telefone</label>
                    <p className="detail-value">{selectedInstance.phoneNumber || 'Não informado'}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">🔑</div>
                  <div className="detail-content">
                    <label className="detail-label">ID</label>
                    <p className="detail-value code">{selectedInstance.id}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">📊</div>
                  <div className="detail-content">
                    <label className="detail-label">Status</label>
                    <p className="detail-value">{getStatusBadge(selectedInstance.status)}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">📅</div>
                  <div className="detail-content">
                    <label className="detail-label">Criado em</label>
                    <p className="detail-value">
                      {new Date(selectedInstance.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="info-box">
                <div className="info-icon">💡</div>
                <div className="info-content">
                  <h4>Sobre esta instância</h4>
                  <p>Esta instância WhatsApp está usando a <strong>Evolution API v2</strong> com integração <strong>Baileys</strong>.</p>
                  <ul className="info-list">
                    <li>✓ Envio de mensagens de texto</li>
                    <li>✓ Envio de mídia (imagens, vídeos, áudios, documentos)</li>
                    <li>✓ Webhooks para status de entrega</li>
                    <li>✓ Conexão via QR Code ou Pairing Code</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-footer-custom">
              <button className="btn-outline-custom" onClick={() => {
                closeDetailsModal();
                handleEdit(selectedInstance);
              }}>
                <span className="btn-icon">✏️</span>
                Editar
              </button>
              <button className="btn-secondary-custom" onClick={closeDetailsModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedInstance && (
        <div className="modal-overlay" onClick={closeQRModal}>
          <div className="modal-container modal-qr" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h2 className="modal-title-custom">
                <span className="modal-icon">📱</span>
                Conectar WhatsApp - {selectedInstance.name}
              </h2>
              <button className="modal-close" onClick={closeQRModal}>✕</button>
            </div>
            
            <div className="modal-body-custom text-center">
              {loadingQR ? (
                <LoadingSpinner message="Gerando QR Code..." />
              ) : qrCodeData ? (
                <>
                  {qrCodeData.status === 'CONNECTED' ? (
                    <div className="success-message">
                      <div className="success-icon">✅</div>
                      <h3>Conectado com sucesso!</h3>
                      <p>Seu WhatsApp está pronto para enviar mensagens</p>
                    </div>
                  ) : qrCodeData.qrCode ? (
                    <>
                      <div className="qr-section">
                        <p className="qr-instruction">Escaneie o QR Code com seu WhatsApp:</p>
                        <div className="qr-frame">
                          <img
                            src={qrCodeData.qrCode}
                            alt="QR Code"
                            className="qr-image"
                          />
                        </div>
                        <div className="refresh-indicator">
                          <span className="spinner">⟳</span>
                          Atualizando automaticamente...
                        </div>
                      </div>

                      <div className="instructions-box">
                        <h4 className="instructions-title">📱 Como conectar:</h4>
                        <ol className="instructions-list">
                          <li>
                            <strong>1.</strong> Abra o WhatsApp no seu celular
                          </li>
                          <li>
                            <strong>2.</strong> Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong>
                          </li>
                          <li>
                            <strong>3.</strong> Toque em <strong>Aparelhos conectados</strong>
                          </li>
                          <li>
                            <strong>4.</strong> Toque em <strong>Conectar um aparelho</strong>
                          </li>
                          <li>
                            <strong>5.</strong> Aponte seu celular para esta tela para escanear o código QR
                          </li>
                        </ol>
                      </div>
                    </>
                  ) : (
                    <div className="warning-message">
                      <div className="warning-icon">⏳</div>
                      <h3>Aguardando QR Code...</h3>
                      <p>Gerando código de conexão</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="error-message">
                  <div className="error-icon">❌</div>
                  <h3>Erro ao carregar QR Code</h3>
                  <p>Tente novamente ou verifique a conexão</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer-custom">
              <button className="btn-secondary-custom" onClick={closeQRModal}>
                Fechar
              </button>
              <button className="btn-outline-custom" onClick={() => handleShowQR(selectedInstance)}>
                <span className="btn-icon">🔄</span>
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .whatsapp-container {
          width: 100%;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .icon {
          font-size: 2.5rem;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.8);
          margin: 0.5rem 0 0 0;
          font-size: 1.1rem;
        }

        .btn-primary {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        .stats-section {
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        }

        .stat-total { border-color: #667eea; }
        .stat-success { border-color: #4CAF50; }
        .stat-warning { border-color: #ff9800; }
        .stat-error { border-color: #f44336; }

        .stat-icon {
          font-size: 2.5rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.1);
        }

        .stat-success .stat-icon { background: rgba(76, 175, 80, 0.1); }
        .stat-warning .stat-icon { background: rgba(255, 152, 0, 0.1); }
        .stat-error .stat-icon { background: rgba(244, 67, 54, 0.1); }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #333;
          margin: 0;
        }

        .stat-label {
          color: #666;
          margin: 0;
          font-size: 0.9rem;
        }

        .instances-section {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-title {
          font-size: 1.8rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.5rem;
        }

        .empty-message {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .instances-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .instance-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 2px solid rgba(102, 126, 234, 0.2);
        }

        .instance-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
          border-color: #667eea;
        }

        .card-header {
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .instance-avatar {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .instance-details {
          flex: 1;
        }

        .instance-name {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }

        .instance-phone {
          margin: 0.25rem 0 0 0;
          font-size: 0.9rem;
          opacity: 0.9;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .phone-icon {
          font-size: 0.8rem;
        }

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .status-icon {
          font-size: 0.9rem;
        }

        .status-connected {
          background: rgba(76, 175, 80, 0.2);
          color: #2e7d32;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .status-connecting {
          background: rgba(255, 152, 0, 0.2);
          color: #e65100;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .status-disconnected {
          background: rgba(158, 158, 158, 0.2);
          color: #424242;
          border: 1px solid rgba(158, 158, 158, 0.3);
        }

        .status-error {
          background: rgba(244, 67, 54, 0.2);
          color: #c62828;
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .card-body {
          padding: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .info-label {
          color: #666;
          font-size: 0.9rem;
        }

        .info-value {
          color: #333;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .card-footer {
          padding: 1rem 1.5rem;
          background: #f5f5f5;
          display: flex;
          gap: 0.5rem;
        }

        .btn-block {
          width: 100%;
        }

        .btn-flex {
          flex: 1;
        }

        .btn-success {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
        }

        .btn-warning {
          background: linear-gradient(45deg, #ff9800, #f57c00);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-warning:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 152, 0, 0.3);
        }

        .btn-info {
          background: linear-gradient(45deg, #2196F3, #1976D2);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-info:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(33, 150, 243, 0.3);
        }

        .btn-danger {
          background: linear-gradient(45deg, #f44336, #d32f2f);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(244, 67, 54, 0.3);
        }

        .action-row {
          display: flex;
          gap: 0.5rem;
        }

        .mt-2 {
          margin-top: 0.5rem;
        }

        .btn-secondary {
          background: linear-gradient(45deg, #6c757d, #5a6268);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(108, 117, 125, 0.3);
        }

        .btn-outline {
          background: transparent;
          color: #667eea;
          border: 2px solid #667eea;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-outline:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 24px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s ease;
        }

        .modal-qr {
          max-width: 700px;
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header-custom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 24px 24px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title-custom {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .modal-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 1.8rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .modal-body-custom {
          padding: 2rem;
        }

        .form-group-custom {
          margin-bottom: 1.5rem;
        }

        .form-label-custom {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .label-icon {
          font-size: 1.2rem;
        }

        .form-input-custom {
          width: 100%;
          padding: 0.9rem 1.2rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          color: #333;
        }

        .form-input-custom:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .form-hint {
          display: block;
          margin-top: 0.4rem;
          color: #666;
          font-size: 0.85rem;
        }

        .alert-danger-custom {
          background: #fee;
          border: 2px solid #fcc;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #c33;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-weight: 500;
        }

        .alert-icon {
          font-size: 1.5rem;
        }

        .modal-footer-custom {
          padding: 1.5rem 2rem;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn-primary-custom,
        .btn-secondary-custom,
        .btn-outline-custom {
          padding: 0.8rem 1.8rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          border: none;
        }

        .btn-primary-custom {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
        }

        .btn-primary-custom:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary-custom {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary-custom:hover {
          background: #d0d0d0;
          transform: translateY(-2px);
        }

        .btn-outline-custom {
          background: transparent;
          color: #667eea;
          border: 2px solid #667eea;
        }

        .btn-outline-custom:hover {
          background: #667eea;
          color: white;
        }

        /* Details Modal */
        .details-grid {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 14px;
          border: 2px solid #e0e0e0;
          transition: all 0.3s ease;
        }

        .detail-item:hover {
          border-color: #667eea;
          transform: translateX(5px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.1);
        }

        .detail-icon {
          font-size: 1.8rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          flex-shrink: 0;
        }

        .detail-content {
          flex: 1;
        }

        .detail-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.3rem;
          display: block;
        }

        .detail-value {
          font-size: 1rem;
          color: #333;
          font-weight: 600;
          margin: 0;
          word-break: break-all;
        }

        .detail-value.code {
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          background: #f0f0f0;
          padding: 0.5rem;
          border-radius: 6px;
        }

        .info-box {
          background: linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 100%);
          border: 2px solid #c5d9f2;
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
        }

        .info-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .info-content h4 {
          margin: 0 0 0.8rem 0;
          color: #333;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .info-content p {
          margin: 0 0 1rem 0;
          color: #555;
          line-height: 1.6;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-list li {
          padding: 0.4rem 0;
          color: #555;
          font-size: 0.95rem;
        }

        /* QR Code Modal */
        .text-center {
          text-align: center;
        }

        .success-message,
        .warning-message,
        .error-message {
          padding: 3rem 2rem;
        }

        .success-icon,
        .warning-icon,
        .error-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
        }

        .success-message h3 {
          color: #4CAF50;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
        }

        .success-message p {
          color: #666;
          font-size: 1.1rem;
        }

        .warning-message h3 {
          color: #ff9800;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
        }

        .warning-message p {
          color: #666;
          font-size: 1.1rem;
        }

        .error-message h3 {
          color: #f44336;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
        }

        .error-message p {
          color: #666;
          font-size: 1.1rem;
        }

        .qr-section {
          padding: 2rem 1rem;
        }

        .qr-instruction {
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1.5rem;
        }

        .qr-frame {
          background: white;
          padding: 1.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          display: inline-block;
          border: 3px solid #667eea;
        }

        .qr-image {
          display: block;
          max-width: 300px;
          width: 100%;
          height: auto;
          border-radius: 12px;
        }

        .refresh-indicator {
          margin-top: 1.5rem;
          color: #666;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .spinner {
          font-size: 1.5rem;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .instructions-box {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-top: 2rem;
          border: 2px solid #e0e0e0;
          text-align: left;
        }

        .instructions-title {
          color: #333;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
        }

        .instructions-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .instructions-list li {
          padding: 0.8rem 0;
          color: #555;
          font-size: 1rem;
          line-height: 1.6;
          border-bottom: 1px solid #e0e0e0;
        }

        .instructions-list li:last-child {
          border-bottom: none;
        }

        .instructions-list strong {
          color: #667eea;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 2rem;
          }

          .instances-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .modal-container {
            width: 95%;
            max-height: 95vh;
          }

          .modal-header-custom {
            padding: 1.5rem;
          }

          .modal-title-custom {
            font-size: 1.2rem;
          }

          .modal-body-custom {
            padding: 1.5rem;
          }

          .qr-image {
            max-width: 250px;
          }

          .action-row {
            flex-direction: column;
          }

          .btn-flex {
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
