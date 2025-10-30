import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/auth-context';
import { apiClient } from '../lib/api/client';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingSpinner';
import Layout from '../components/Layout';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  customFields?: Record<string, any>;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
  });
  
  const [csvData, setCsvData] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/contacts?page=${page}&limit=50`);
      setContacts(response.data.contacts);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingContact) {
        await apiClient.patch(`/contacts/${editingContact.id}`, formData);
      } else {
        await apiClient.post('/contacts', formData);
      }
      
      setShowAddModal(false);
      setEditingContact(null);
      setFormData({ name: '', phone: '', email: '', company: '' });
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar contato');
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      await apiClient.delete(`/contacts/${id}`);
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir contato');
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const response = await apiClient.post('/contacts/import/csv', { csvData });
      setImportResult(response.data);
      setCsvData('');
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    setFormData({ name: '', phone: '', email: '', company: '' });
    setError(null);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setCsvData('');
    setImportResult(null);
    setError(null);
  };

  if (loading && contacts.length === 0) {
    return (
      <Layout title="Contatos">
        <LoadingSpinner message="Carregando contatos..." />
      </Layout>
    );
  }

  return (
    <Layout title="Contatos">
      <div className="contacts-container">
        <div className="contacts-header">
          <div className="header-content">
            <div>
              <h1 className="page-title">Gerenciar Contatos</h1>
              <p className="page-subtitle">Organize e gerencie sua lista de contatos para campanhas</p>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                <span className="btn-icon">📤</span>
                <span>Importar CSV</span>
              </button>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <span className="btn-icon">👤</span>
                <span>Novo Contato</span>
              </button>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={() => loadContacts()} />}

        <div className="contacts-content">
          <div className="section-card">
            {contacts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3 className="empty-title">Nenhum contato encontrado</h3>
                <p className="empty-message">
                  Comece adicionando seus primeiros contatos para criar campanhas de WhatsApp
                </p>
                <div className="empty-actions">
                  <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    <span className="btn-icon">👤</span>
                    <span>Adicionar Contato</span>
                  </button>
                  <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                    <span className="btn-icon">📤</span>
                    <span>Importar CSV</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="contacts-stats">
                  <div className="stat-item">
                    <div className="stat-number">{pagination?.total || 0}</div>
                    <div className="stat-label">Total de Contatos</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{contacts.filter(c => c.email).length}</div>
                    <div className="stat-label">Com Email</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{contacts.filter(c => c.company).length}</div>
                    <div className="stat-label">Com Empresa</div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Telefone</th>
                        <th>Email</th>
                        <th>Empresa</th>
                        <th>Adicionado em</th>
                                                <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact.id} className="contact-row">
                          <td className="contact-name">
                            <div className="contact-avatar">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{contact.name}</span>
                          </td>
                          <td className="contact-phone">{contact.phone}</td>
                          <td className="contact-email">{contact.email || '-'}</td>
                          <td className="contact-company">{contact.company || '-'}</td>
                          <td className="contact-date">
                            {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="contact-actions">
                            <div className="action-buttons">
                              <button
                                className="action-btn action-edit"
                                onClick={() => handleEdit(contact)}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                className="action-btn action-delete"
                                onClick={() => handleDelete(contact.id)}
                                title="Excluir"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination && pagination.pages > 1 && (
                  <div className="pagination">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button 
                        key={page} 
                        className={`pagination-btn ${pagination.page === page ? 'active' : ''}`}
                        onClick={() => loadContacts(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modais */}
        {showAddModal && (
          <ContactModal
            editingContact={editingContact}
            formData={formData}
            setFormData={setFormData}
            error={error}
            onSubmit={handleSubmit}
            onClose={closeAddModal}
          />
        )}

        {showImportModal && (
          <ImportModal
            csvData={csvData}
            setCsvData={setCsvData}
            importResult={importResult}
            importing={importing}
            error={error}
            onSubmit={handleImportCsv}
            onClose={closeImportModal}
          />
        )}
      </div>

      <style jsx>{`
        .contacts-container {
          width: 100%;
        }

        .contacts-header {
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

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-primary, .btn-secondary {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        .contacts-content {
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

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #333;
          margin: 0 0 1rem 0;
        }

        .empty-message {
          color: #666;
          font-size: 1.1rem;
          margin: 0 0 2rem 0;
          line-height: 1.6;
        }

        .empty-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .contacts-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-item {
          text-align: center;
          padding: 1.5rem;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .contacts-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .contacts-table th {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border: none;
        }

        .contacts-table td {
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: middle;
        }

        .contact-row:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        .contact-name {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: #333;
        }

        .contact-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .contact-phone {
          color: #2196F3;
          font-weight: 500;
        }

        .contact-email {
          color: #666;
        }

        .contact-company {
          color: #666;
        }

        .contact-date {
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

        .action-delete {
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }

        .action-delete:hover {
          background: rgba(244, 67, 54, 0.2);
          transform: scale(1.1);
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 2rem;
        }

        .pagination-btn {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          background: white;
          color: #666;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .pagination-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .pagination-btn.active {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border-color: transparent;
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

          .header-actions {
            flex-wrap: wrap;
            justify-content: center;
          }

          .contacts-stats {
            grid-template-columns: 1fr;
          }

          .contacts-table {
            font-size: 0.9rem;
          }

          .empty-actions {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </Layout>
  );
}

// Componente do Modal de Contato
function ContactModal({ editingContact, formData, setFormData, error, onSubmit, onClose }) {
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
            {editingContact ? 'Editar Contato' : 'Novo Contato'}
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
            ×
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
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
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
                Telefone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="5511999999999"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                Formato: código do país + DDD + número
              </small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
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
                Empresa
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem'
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
              {editingContact ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente do Modal de Importação
function ImportModal({ csvData, setCsvData, importResult, importing, error, onSubmit, onClose }) {
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
        maxWidth: '700px',
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
            Importar Contatos via CSV
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
            ×
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
            
            {importResult && (
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                color: '#2196F3',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid rgba(33, 150, 243, 0.2)'
              }}>
                <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Resultado da Importação:</h6>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>✅ Sucesso: {importResult.success}</li>
                  <li>⏭️ Duplicados: {importResult.duplicates}</li>
                  <li>❌ Falhas: {importResult.failed}</li>
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Formato do CSV:
              </label>
              <pre style={{
                background: '#f5f5f5',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                overflow: 'auto',
                border: '1px solid #e0e0e0'
              }}>
{`name,phone,email,company
João Silva,5511999999999,joao@example.com,Empresa XYZ
Maria Santos,5511988888888,maria@example.com,`}
              </pre>
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                Primeira linha deve conter os cabeçalhos. Nome e telefone são obrigatórios.
              </small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
                Cole o conteúdo do CSV:
              </label>
              <textarea
                rows={10}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="name,phone,email,company&#10;João Silva,5511999999999,joao@example.com,Empresa XYZ"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
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
              Fechar
            </button>
            <button 
              type="submit"
              disabled={importing}
              style={{
                padding: '0.75rem 1.5rem',
                background: importing ? '#ccc' : 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: importing ? 'not-allowed' : 'pointer'
              }}
            >
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
