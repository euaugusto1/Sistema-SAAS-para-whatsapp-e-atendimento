import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/auth-context';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingSpinner';
import Layout from '../components/Layout';

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
      console.error('Erro ao carregar instÃ¢ncias:', err);
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
      setError(err.response?.data?.message || 'Erro ao carregar estatÃ­sticas');
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

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Rascunho',
      SCHEDULED: 'Agendada',
      RUNNING: 'Executando',
      PAUSED: 'Pausada',
      COMPLETED: 'ConcluÃ­da',
      FAILED: 'Falhou',
    };
    return labels[status] || status;
  };

  if (loading) return (
    <Layout title="Campanhas">
      <LoadingSpinner />
    </Layout>
  );

  return (
    <Layout title="Campanhas">
      <div className="campaigns-container">
        <div className="campaigns-header">
          <div className="header-content">
            <div>
              <h1 className="page-title">Campanhas de WhatsApp</h1>
              <p className="page-subtitle">Gerencie e monitore suas campanhas de disparo em massa</p>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <span className="btn-icon">ðŸ“¢</span>
              <span>Nova Campanha</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={() => setError('')} />}

        <div className="campaigns-content">
          <div className="section-card">
            <div className="table-responsive">
              <table className="campaigns-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>InstÃ¢ncia</th>
                    <th>DestinatÃ¡rios</th>
                    <th>Status</th>
                    <th>Agendado para</th>
                    <th>AÃ§Ãµes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        <div className="empty-content">
                          <div className="empty-icon">ðŸ“¢</div>
                          <p className="empty-message">Nenhuma campanha encontrada</p>
                          <button 
                            className="btn-primary"
                            onClick={() => {
                              resetForm();
                              setShowModal(true);
                            }}
                          >
                            Criar primeira campanha
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.id} className="campaign-row">
                        <td className="campaign-name">{campaign.name}</td>
                        <td className="campaign-instance">{campaign.instance?.name || 'N/A'}</td>
                        <td className="campaign-recipients">{campaign._count?.recipients || 0}</td>
                        <td className="campaign-status">
                          <span className={`status-badge status-${campaign.status.toLowerCase()}`}>
                            {getStatusLabel(campaign.status)}
                          </span>
                        </td>
                        <td className="campaign-scheduled">
                          {campaign.scheduledAt
                            ? new Date(campaign.scheduledAt).toLocaleString('pt-BR')
                            : 'Imediato'}
                        </td>
                        <td className="campaign-actions">
                          <div className="action-buttons">
                            {campaign.status === 'DRAFT' && (
                              <>
                                <button
                                  className="action-btn action-edit"
                                  onClick={() => handleEdit(campaign)}
                                  title="Editar"
                                >
                                  âœï¸
                                </button>
                                <button
                                  className="action-btn action-start"
                                  onClick={() => handleStartCampaign(campaign.id)}
                                  title="Iniciar"
                                >
                                  â–¶ï¸
                                </button>
                              </>
                            )}
                            {campaign.status === 'RUNNING' && (
                              <button
                                className="action-btn action-pause"
                                onClick={() => handlePauseCampaign(campaign.id)}
                                title="Pausar"
                              >
                                â¸ï¸
                              </button>
                            )}
                            {campaign.status === 'PAUSED' && (
                              <button
                                className="action-btn action-resume"
                                onClick={() => handleResumeCampaign(campaign.id)}
                                title="Retomar"
                              >
                                â–¶ï¸
                              </button>
                            )}
                            {['RUNNING', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                              <button
                                className="action-btn action-stats"
                                onClick={() => handleShowStats(campaign.id)}
                                title="EstatÃ­sticas"
                              >
                                ðŸ“Š
                              </button>
                            )}
                            {['DRAFT', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                              <button
                                className="action-btn action-delete"
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                title="Excluir"
                              >
                                ðŸ—‘ï¸
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

        {/* Modais */}
        {showModal && (
          <CampaignModal
            selectedCampaign={selectedCampaign}
            formData={formData}
            setFormData={setFormData}
            instances={instances}
            contacts={contacts}
            error={error}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false);
              resetForm();
            }}
          />
        )}

        {statsModal && stats && (
          <StatsModal
            stats={stats}
            onClose={() => {
              setStatsModal(null);
              setStats(null);
            }}
          />
        )}
      </div>

      <style jsx>{`
        .campaigns-container {
          width: 100%;
        }

        .campaigns-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0;
          background: linear-gradient(45deg, #fff, #f0f8ff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.8);
          margin: 0.5rem 0 0 0;
          font-size: 1.1rem;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        .campaigns-content {
          width: 100%;
        }

        .section-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .campaigns-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .campaigns-table th {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border: none;
        }

        .campaigns-table td {
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: middle;
        }

        .campaign-row:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        .campaign-name {
          font-weight: 600;
          color: #333;
        }

        .campaign-instance {
          color: #666;
        }

        .campaign-recipients {
          font-weight: 600;
          color: #2196F3;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-draft {
          background: rgba(158, 158, 158, 0.2);
          color: #666;
        }

        .status-scheduled {
          background: rgba(33, 150, 243, 0.2);
          color: #2196F3;
        }

        .status-running {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }

        .status-paused {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
        }

        .status-completed {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
        }

        .status-failed {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }

        .campaign-scheduled {
          color: #666;
          font-size: 0.9rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .action-edit {
          background: rgba(33, 150, 243, 0.1);
          color: #2196F3;
        }

        .action-edit:hover {
          background: rgba(33, 150, 243, 0.2);
          transform: scale(1.1);
        }

        .action-start, .action-resume {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }

        .action-start:hover, .action-resume:hover {
          background: rgba(76, 175, 80, 0.2);
          transform: scale(1.1);
        }

        .action-pause {
          background: rgba(255, 152, 0, 0.1);
          color: #ff9800;
        }

        .action-pause:hover {
          background: rgba(255, 152, 0, 0.2);
          transform: scale(1.1);
        }

        .action-stats {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        .action-stats:hover {
          background: rgba(102, 126, 234, 0.2);
          transform: scale(1.1);
        }

        .action-delete {
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }

        .action-delete:hover {
          background: rgba(244, 67, 54, 0.2);
          transform: scale(1.1);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          opacity: 0.5;
        }

        .empty-message {
          color: #666;
          font-size: 1.1rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .page-title {
            font-size: 2rem;
          }

          .campaigns-table {
            font-size: 0.9rem;
          }

          .action-buttons {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </Layout>
  );
}

// Componente do Modal de Campanha (simplificado)
function CampaignModal({ selectedCampaign, formData, setFormData, instances, contacts, error, onSubmit, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2rem 2rem 1rem',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '1.5rem', fontWeight: 700 }}>
            {selectedCampaign ? 'Editar Campanha' : 'Nova Campanha'}
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#999',
              cursor: 'pointer'
            }}
          >
            Ã—
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div style={{ padding: '2rem' }}>
            {error && (
              <div style={{
                background: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid rgba(244, 67, 54, 0.2)'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Nome da Campanha *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: PromoÃ§Ã£o Black Friday"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                InstÃ¢ncia WhatsApp *
              </label>
              <select
                value={formData.instanceId}
                onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Selecione uma instÃ¢ncia</option>
                {instances
                  .filter((i) => i.status === 'CONNECTED')
                  .map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} ({instance.phoneNumber})
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Mensagem *
              </label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                placeholder="Digite sua mensagem aqui. Use {name} para inserir o nome do contato"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            padding: '1rem 2rem 2rem',
            borderTop: '1px solid #f0f0f0'
          }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '2px solid #e0e0e0',
                background: 'white',
                color: '#666',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {selectedCampaign ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente do Modal de EstatÃ­sticas (simplificado)
function StatsModal({ stats, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2rem 2rem 1rem',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '1.5rem', fontWeight: 700 }}>
            EstatÃ­sticas da Campanha
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#999',
              cursor: 'pointer'
            }}
          >
            Ã—
          </button>
        </div>
        
        <div style={{ padding: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              background: 'rgba(158, 158, 158, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(158, 158, 158, 0.2)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Total</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                {stats.sent}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Enviados</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              background: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(33, 150, 243, 0.2)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                {stats.delivered}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Entregues</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              background: 'rgba(244, 67, 54, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(244, 67, 54, 0.2)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                {stats.failed}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Falhas</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(255, 152, 0, 0.2)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Pendentes</div>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <div style={{
              fontWeight: 600,
              color: '#333',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Progresso: {stats.progress}%
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#f0f0f0',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                width: `${stats.progress}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
