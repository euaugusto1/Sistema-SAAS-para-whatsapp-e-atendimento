import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/auth-context';
import { apiClient } from '../lib/api/client';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingSpinner';

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
  const [showQRModal, setShowQRModal] = useState(false);
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
    }
  }, [user]);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/whatsapp/instances');
      setInstances(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await apiClient.post('/whatsapp/instances', formData);
      setShowAddModal(false);
      setFormData({ name: '', phoneNumber: '' });
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar instância');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

    try {
      await apiClient.delete(`/whatsapp/instances/${id}`);
      loadInstances();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir instância');
    }
  };

  const handleConnect = async (id: string) => {
    try {
      setError(null);
      await apiClient.post(`/whatsapp/instances/${id}/connect`);
      
      // Wait a bit then show QR code
      setTimeout(() => {
        handleShowQR(instances.find(i => i.id === id)!);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao conectar instância');
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Desconectar esta instância?')) return;

    try {
      await apiClient.post(`/whatsapp/instances/${id}/disconnect`);
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
      const response = await apiClient.get(`/whatsapp/instances/${instance.id}/qrcode`);
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
      setError(err.response?.data?.message || 'Erro ao obter QR code');
    } finally {
      setLoadingQR(false);
    }
  };

  const refreshQR = async (id: string) => {
    try {
      const response = await apiClient.get(`/whatsapp/instances/${id}/qrcode`);
      setQRCodeData(response.data);
      
      // Continue refreshing if still waiting
      if (response.data.status === 'CONNECTING' || response.data.status === 'QR_CODE') {
        setTimeout(() => {
          if (showQRModal && selectedInstance?.id === id) {
            refreshQR(id);
          }
        }, 5000);
      } else if (response.data.status === 'CONNECTED') {
        // Connected! Close modal and reload
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

  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedInstance(null);
    setQRCodeData(null);
    loadInstances();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      CONNECTED: 'success',
      CONNECTING: 'warning',
      QR_CODE: 'info',
      DISCONNECTED: 'secondary',
      ERROR: 'danger',
    };
    
    const labels: Record<string, string> = {
      CONNECTED: 'Conectado',
      CONNECTING: 'Conectando',
      QR_CODE: 'QR Code',
      DISCONNECTED: 'Desconectado',
      ERROR: 'Erro',
    };

    return (
      <span className={`badge bg-${badges[status] || 'secondary'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading && instances.length === 0) {
    return <LoadingSpinner message="Carregando instâncias..." />;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Instâncias WhatsApp</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-circle"></i> Nova Instância
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => loadInstances()} />}

      <div className="row">
        {instances.length === 0 ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-whatsapp" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                <p className="mt-3 text-muted">Nenhuma instância configurada</p>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  Criar Primeira Instância
                </button>
              </div>
            </div>
          </div>
        ) : (
          instances.map((instance) => (
            <div key={instance.id} className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0">{instance.name}</h5>
                    {getStatusBadge(instance.status)}
                  </div>
                  
                  {instance.phoneNumber && (
                    <p className="card-text text-muted">
                      <i className="bi bi-phone"></i> {instance.phoneNumber}
                    </p>
                  )}
                  
                  <p className="card-text">
                    <small className="text-muted">
                      Criado em {new Date(instance.createdAt).toLocaleDateString('pt-BR')}
                    </small>
                  </p>
                  
                  <div className="btn-group w-100 mt-2" role="group">
                    {instance.status === 'DISCONNECTED' || instance.status === 'ERROR' ? (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleConnect(instance.id)}
                      >
                        <i className="bi bi-power"></i> Conectar
                      </button>
                    ) : instance.status === 'CONNECTED' ? (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleDisconnect(instance.id)}
                      >
                        <i className="bi bi-x-circle"></i> Desconectar
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleShowQR(instance)}
                      >
                        <i className="bi bi-qr-code"></i> Ver QR Code
                      </button>
                    )}
                    
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(instance.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
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

      {/* QR Code Modal */}
      {showQRModal && selectedInstance && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-whatsapp text-success"></i> Conectar WhatsApp - {selectedInstance.name}
                </h5>
                <button type="button" className="btn-close" onClick={closeQRModal}></button>
              </div>
              <div className="modal-body text-center">
                {loadingQR ? (
                  <LoadingSpinner message="Gerando QR Code..." />
                ) : qrCodeData ? (
                  <>
                    {qrCodeData.status === 'CONNECTED' ? (
                      <div className="alert alert-success">
                        <i className="bi bi-check-circle"></i> Conectado com sucesso!
                      </div>
                    ) : qrCodeData.qrCode ? (
                      <>
                        <p className="mb-3">Escaneie o QR Code com seu WhatsApp:</p>
                        <img
                          src={qrCodeData.qrCode}
                          alt="QR Code"
                          className="img-fluid"
                          style={{ maxWidth: '300px' }}
                        />
                        <div className="mt-3">
                          <small className="text-muted">
                            <i className="bi bi-arrow-clockwise"></i> Atualizando automaticamente...
                          </small>
                        </div>
                        <div className="mt-3 text-start">
                          <p className="small"><strong>Como conectar:</strong></p>
                          <ol className="small">
                            <li>Abra o WhatsApp no seu celular</li>
                            <li>Toque em Mais opções (⋮) &gt; Aparelhos conectados</li>
                            <li>Toque em Conectar um aparelho</li>
                            <li>Aponte seu celular para esta tela para escanear o código QR</li>
                          </ol>
                        </div>
                      </>
                    ) : (
                      <div className="alert alert-warning">
                        <i className="bi bi-hourglass-split"></i> Aguardando QR Code...
                      </div>
                    )}
                  </>
                ) : (
                  <div className="alert alert-danger">Erro ao carregar QR Code</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeQRModal}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
