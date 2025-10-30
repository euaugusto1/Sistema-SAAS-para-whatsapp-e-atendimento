// @ts-nocheck
import React from 'react';

interface ModalProps {
  activeModal: string;
  formData: any;
  error: string;
  setFormData: (data: any) => void;
  closeModal: () => void;
  handleCreateContact: (e: React.FormEvent) => void;
  handleCreateCampaign: (e: React.FormEvent) => void;
  handleCreateInstance: (e: React.FormEvent) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  metrics?: { sent: number; delivered: number; failed: number; contacts: number; campaigns: number; instances: number; deliveryRate: number };
  planName?: string;
}

export default function DashboardModals({
  activeModal,
  formData,
  error,
  setFormData,
  closeModal,
  handleCreateContact,
  handleCreateCampaign,
  handleCreateInstance,
  handleSendMessage,
  metrics,
  planName,
}: ModalProps) {
  if (!activeModal) return null;

  return (
    <>
      {/* Modal de Contatos */}
      {activeModal === 'contacts' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Novo Contato</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreateContact}>
              <div className="modal-body">
                {error && <div className="error-alert">{error}</div>}
                {metrics && (
                  <div className="live-info">
                    <span>Contatos atuais: <strong>{metrics.contacts}</strong></span>
                    <span>Plano: <strong>{planName || '—'}</strong></span>
                  </div>
                )}
                <div className="form-group">
                  <label>Nome *</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="João Silva"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telefone *</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="5511999999999"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="joao@example.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Campanhas */}
      {activeModal === 'campaigns' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Criar Nova Campanha</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body">
                {error && <div className="error-alert">{error}</div>}
                {metrics && (
                  <div className="live-info">
                    <span>Campanhas: <strong>{metrics.campaigns}</strong></span>
                    <span>Instâncias: <strong>{metrics.instances}</strong></span>
                  </div>
                )}
                <div className="form-group">
                  <label>Nome da Campanha *</label>
                  <input
                    type="text"
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    placeholder="Ex: Promoção Black Friday"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Instância WhatsApp *</label>
                  <select
                    value={formData.campaignInstance || ''}
                    onChange={(e) => setFormData({ ...formData, campaignInstance: e.target.value })}
                    required
                  >
                    <option value="">Selecione uma instância</option>
                    {formData.instances?.map((inst: any) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} {inst.status === 'CONNECTED' ? '✓' : '(Desconectada)'}
                      </option>
                    ))}
                  </select>
                  {formData.instances?.length === 0 && (
                    <small style={{ color: '#ff6b6b', display: 'block', marginTop: '0.5rem' }}>
                      ⚠️ Nenhuma instância disponível. Crie uma instância primeiro.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Mensagem da Campanha *</label>
                  <textarea
                    value={formData.messageText}
                    onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
                    placeholder="Digite a mensagem que será enviada para os destinatários..."
                    rows={5}
                    required
                    style={{ resize: 'vertical' }}
                  />
                  <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                    {formData.messageText?.length || 0} caracteres
                  </small>
                </div>
                <p className="form-hint">
                  💡 A campanha será criada como rascunho. Você poderá adicionar destinatários e editar depois.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Instâncias */}
      {activeModal === 'instances' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Instância WhatsApp</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreateInstance}>
              <div className="modal-body">
                {error && <div className="error-alert">{error}</div>}
                {metrics && (
                  <div className="live-info">
                    <span>Instâncias atuais: <strong>{metrics.instances}</strong></span>
                  </div>
                )}
                <div className="form-group">
                  <label>Nome da Instância *</label>
                  <input
                    type="text"
                    value={formData.instanceName}
                    onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                    placeholder="WhatsApp Principal"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Número de Telefone</label>
                  <input
                    type="tel"
                    value={formData.instancePhone}
                    onChange={(e) => setFormData({ ...formData, instancePhone: e.target.value })}
                    placeholder="5511999999999"
                  />
                </div>
                <p className="form-hint">
                  Após criar, acesse a página de instâncias para conectar via QR Code.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar Instância
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Enviar Mensagem */}
      {activeModal === 'send-message' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enviar Mensagem Rápida</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div className="modal-body">
                {error && <div className="error-alert">{error}</div>}
                {metrics && (
                  <div className="live-info">
                    <span>Enviadas: <strong>{metrics.sent}</strong></span>
                    <span>Entregues: <strong>{metrics.delivered}</strong></span>
                    <span>Taxa: <strong>{metrics.deliveryRate}%</strong></span>
                  </div>
                )}
                <div className="form-group">
                  <label>Número de Destino *</label>
                  <input
                    type="tel"
                    value={formData.messageTo}
                    onChange={(e) => setFormData({ ...formData, messageTo: e.target.value })}
                    placeholder="5511999999999"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mensagem *</label>
                  <textarea
                    value={formData.messageText}
                    onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
                    placeholder="Digite sua mensagem aqui..."
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Enviar Mensagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          transition: color 0.3s;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
          background: white;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group select {
          cursor: pointer;
        }

        .form-hint {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #666;
          font-style: italic;
        }

        .error-alert {
          background: #fff3f3;
          border: 1px solid #ffcdd2;
          color: #c62828;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: #f5f5f5;
          color: #333;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
      `}</style>
      <style jsx>{`
        .live-info { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
        .live-info span { background: #f6f7ff; border: 1px solid #e0e4ff; color: #333; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.85rem; }
      `}</style>
    </>
  );
}
