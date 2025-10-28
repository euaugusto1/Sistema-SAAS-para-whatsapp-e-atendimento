import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/hooks';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [instances, setInstances] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [statsModal, setStatsModal] = useState(null);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    instanceId: '',
    message: '',
    contactIds: [],
    scheduledAt: '',
  });

  const organizationId = user?.memberships?.[0]?.organization?.id;

  useEffect(() => {
    if (organizationId) {
      loadCampaigns();
      loadInstances();
      loadContacts();
    }
  }, [organizationId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/campaigns?organizationId=${organizationId}`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
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

  const loadContacts = async () => {
    try {
      const response = await apiClient.get(`/contacts?organizationId=${organizationId}&limit=1000`);
      setContacts(response.data.contacts || []);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        ...formData,
        organizationId,
        scheduledAt: formData.scheduledAt || undefined,
      };

      if (selectedCampaign) {
        await apiClient.patch(
          `/campaigns/${selectedCampaign.id}?organizationId=${organizationId}`,
          payload
        );
      } else {
        await apiClient.post('/campaigns', payload);
      }

      setShowModal(false);
      resetForm();
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar campanha');
    }
  };

  const handleStartCampaign = async (id) => {
    if (!confirm('Deseja iniciar esta campanha?')) return;

    try {
      await apiClient.post(`/campaigns/${id}/start?organizationId=${organizationId}`);
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao iniciar campanha');
    }
  };

  const handlePauseCampaign = async (id) => {
    try {
      await apiClient.post(`/campaigns/${id}/pause?organizationId=${organizationId}`);
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao pausar campanha');
    }
  };

  const handleResumeCampaign = async (id) => {
    try {
      await apiClient.post(`/campaigns/${id}/resume?organizationId=${organizationId}`);
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao retomar campanha');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Deseja excluir esta campanha?')) return;

    try {
      await apiClient.delete(`/campaigns/${id}?organizationId=${organizationId}`);
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir campanha');
    }
  };

  const handleShowStats = async (id) => {
    try {
      const response = await apiClient.get(`/campaigns/${id}/stats?organizationId=${organizationId}`);
      setStats(response.data);
      setStatsModal(id);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar estatísticas');
    }
  };

  const handleEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      instanceId: campaign.instanceId,
      message: campaign.message || '',
      contactIds: campaign.recipients?.map(r => r.contactId) || [],
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedCampaign(null);
    setFormData({
      name: '',
      instanceId: '',
      message: '',
      contactIds: [],
      scheduledAt: '',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge bg-secondary',
      SCHEDULED: 'badge bg-info',
      RUNNING: 'badge bg-primary',
      PAUSED: 'badge bg-warning',
      COMPLETED: 'badge bg-success',
      FAILED: 'badge bg-danger',
    };
    return badges[status] || 'badge bg-secondary';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Campanhas de WhatsApp</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="bi bi-plus-lg"></i> Nova Campanha
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Instância</th>
                  <th>Destinatários</th>
                  <th>Status</th>
                  <th>Agendado para</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      Nenhuma campanha encontrada
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.name}</td>
                      <td>{campaign.instance?.name || 'N/A'}</td>
                      <td>{campaign._count?.recipients || 0}</td>
                      <td>
                        <span className={getStatusBadge(campaign.status)}>
                          {campaign.status}
                        </span>
                      </td>
                      <td>
                        {campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleString()
                          : 'Imediato'}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {campaign.status === 'DRAFT' && (
                            <>
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleEdit(campaign)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handleStartCampaign(campaign.id)}
                                title="Iniciar"
                              >
                                <i className="bi bi-play-fill"></i>
                              </button>
                            </>
                          )}
                          {campaign.status === 'RUNNING' && (
                            <button
                              className="btn btn-outline-warning"
                              onClick={() => handlePauseCampaign(campaign.id)}
                              title="Pausar"
                            >
                              <i className="bi bi-pause-fill"></i>
                            </button>
                          )}
                          {campaign.status === 'PAUSED' && (
                            <button
                              className="btn btn-outline-success"
                              onClick={() => handleResumeCampaign(campaign.id)}
                              title="Retomar"
                            >
                              <i className="bi bi-play-fill"></i>
                            </button>
                          )}
                          {['RUNNING', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                            <button
                              className="btn btn-outline-info"
                              onClick={() => handleShowStats(campaign.id)}
                              title="Estatísticas"
                            >
                              <i className="bi bi-graph-up"></i>
                            </button>
                          )}
                          {['DRAFT', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              title="Excluir"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nome da Campanha *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

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
                        .filter((i) => i.status === 'CONNECTED')
                        .map((instance) => (
                          <option key={instance.id} value={instance.id}>
                            {instance.name} ({instance.phoneNumber})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Mensagem *</label>
                    <textarea
                      className="form-control"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      placeholder="Use {name} para inserir o nome do contato"
                    ></textarea>
                    <small className="text-muted">
                      Variáveis disponíveis: {'{name}'}, {'{phone}'}
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Destinatários *</label>
                    <select
                      multiple
                      className="form-select"
                      style={{ height: '200px' }}
                      value={formData.contactIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setFormData({ ...formData, contactIds: selected });
                      }}
                      required
                    >
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} - {contact.phoneNumber}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Segure Ctrl/Cmd para selecionar múltiplos. Selecionados: {formData.contactIds.length}
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Agendar para (opcional)</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                    <small className="text-muted">
                      Deixe em branco para enviar imediatamente após iniciar
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {selectedCampaign ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estatísticas */}
      {statsModal && stats && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Estatísticas da Campanha</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setStatsModal(null);
                    setStats(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row text-center">
                  <div className="col-md-6 mb-3">
                    <h4>{stats.total}</h4>
                    <small className="text-muted">Total</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h4 className="text-success">{stats.sent}</h4>
                    <small className="text-muted">Enviados</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h4 className="text-primary">{stats.delivered}</h4>
                    <small className="text-muted">Entregues</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h4 className="text-danger">{stats.failed}</h4>
                    <small className="text-muted">Falhas</small>
                  </div>
                  <div className="col-md-12">
                    <h4 className="text-warning">{stats.pending}</h4>
                    <small className="text-muted">Pendentes</small>
                  </div>
                </div>
                <div className="progress mt-3" style={{ height: '30px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${stats.progress}%` }}
                    aria-valuenow={stats.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {stats.progress}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
