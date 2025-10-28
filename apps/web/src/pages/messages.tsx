import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/hooks';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showSendModal, setShowSendModal] = useState(false);
  const [instances, setInstances] = useState([]);

  const [formData, setFormData] = useState({
    instanceId: '',
    to: '',
    message: '',
  });

  const organizationId = user?.memberships?.[0]?.organization?.id;

  useEffect(() => {
    if (organizationId) {
      loadMessages();
      loadStats();
      loadInstances();
    }
  }, [organizationId, page]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/messages?organizationId=${organizationId}&page=${page}&limit=50`
      );
      setMessages(response.data.messages || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get(`/messages/stats?organizationId=${organizationId}`);
      setStats(response.data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const loadInstances = async () => {
    try {
      const response = await apiClient.get(`/whatsapp/instances?organizationId=${organizationId}`);
      setInstances(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar instâncias:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await apiClient.post('/messages', {
        ...formData,
        organizationId,
      });

      setShowSendModal(false);
      setFormData({ instanceId: '', to: '', message: '' });
      loadMessages();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar mensagem');
    }
  };

  const handleRetry = async (id: string) => {
    if (!confirm('Deseja reenviar esta mensagem?')) return;

    try {
      await apiClient.post(`/messages/${id}/retry?organizationId=${organizationId}`);
      loadMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reenviar mensagem');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'badge bg-secondary',
      SENT: 'badge bg-info',
      DELIVERED: 'badge bg-success',
      READ: 'badge bg-primary',
      FAILED: 'badge bg-danger',
    };
    return badges[status] || 'badge bg-secondary';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      PENDING: 'bi-clock',
      SENT: 'bi-check',
      DELIVERED: 'bi-check-all',
      READ: 'bi-check-all text-primary',
      FAILED: 'bi-x-circle',
    };
    return icons[status] || 'bi-circle';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Mensagens</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowSendModal(true)}
        >
          <i className="bi bi-send"></i> Enviar Mensagem
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* Estatísticas */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3>{stats.total}</h3>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-secondary">{stats.pending}</h3>
                <small className="text-muted">Pendentes</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-info">{stats.sent}</h3>
                <small className="text-muted">Enviadas</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-success">{stats.delivered}</h3>
                <small className="text-muted">Entregues</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-primary">{stats.read}</h3>
                <small className="text-muted">Lidas</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-danger">{stats.failed}</h3>
                <small className="text-muted">Falhas</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Mensagens */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Para</th>
                  <th>Mensagem</th>
                  <th>Instância</th>
                  <th>Campanha</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">
                      Nenhuma mensagem encontrada
                    </td>
                  </tr>
                ) : (
                  messages.map((message: any) => (
                    <tr key={message.id}>
                      <td>
                        <i className={`bi ${getStatusIcon(message.status)}`}></i>
                      </td>
                      <td>{message.to}</td>
                      <td>
                        <div
                          style={{
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={message.body}
                        >
                          {message.body}
                        </div>
                      </td>
                      <td>{message.instance?.name || 'N/A'}</td>
                      <td>{message.campaign?.name || '-'}</td>
                      <td>
                        <span className={getStatusBadge(message.status)}>
                          {message.status}
                        </span>
                        {message.error && (
                          <div className="text-danger small mt-1" title={message.error}>
                            {message.error.substring(0, 50)}...
                          </div>
                        )}
                      </td>
                      <td>{new Date(message.createdAt).toLocaleString()}</td>
                      <td>
                        {message.status === 'FAILED' && (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleRetry(message.id)}
                            title="Reenviar"
                          >
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <nav className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Modal de Envio */}
      {showSendModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enviar Mensagem</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowSendModal(false);
                    setFormData({ instanceId: '', to: '', message: '' });
                  }}
                ></button>
              </div>
              <form onSubmit={handleSendMessage}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Instância WhatsApp *</label>
                    <select
                      className="form-select"
                      value={formData.instanceId}
                      onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
                      required
                    >
                      <option value="">Selecione uma instância</option>
                      {instances
                        .filter((i: any) => i.status === 'CONNECTED')
                        .map((instance: any) => (
                          <option key={instance.id} value={instance.id}>
                            {instance.name} ({instance.phoneNumber})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Número do Destinatário *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="5511999999999"
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                      required
                    />
                    <small className="text-muted">
                      Formato: DDI + DDD + Número (ex: 5511999999999)
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Mensagem *</label>
                    <textarea
                      className="form-control"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowSendModal(false);
                      setFormData({ instanceId: '', to: '', message: '' });
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-send"></i> Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
