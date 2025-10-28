import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/auth-context';
import { apiClient } from '../lib/api/client';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingSpinner';

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
    return <LoadingSpinner message="Carregando contatos..." />;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Contatos</h1>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={() => setShowImportModal(true)}>
            <i className="bi bi-upload"></i> Importar CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="bi bi-plus-circle"></i> Novo Contato
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => loadContacts()} />}

      <div className="card">
        <div className="card-body">
          {contacts.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-person-x" style={{ fontSize: '3rem', color: '#ccc' }}></i>
              <p className="mt-3 text-muted">Nenhum contato encontrado</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                Adicionar Primeiro Contato
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>Email</th>
                      <th>Empresa</th>
                      <th>Adicionado em</th>
                      <th width="150">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id}>
                        <td>{contact.name}</td>
                        <td>{contact.phone}</td>
                        <td>{contact.email || '-'}</td>
                        <td>{contact.company || '-'}</td>
                        <td>{new Date(contact.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => handleEdit(contact)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(contact.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.pages > 1 && (
                <nav className="mt-3">
                  <ul className="pagination justify-content-center">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => loadContacts(page)}>
                          {page}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {pagination && (
                <p className="text-muted text-center mt-2">
                  Total: {pagination.total} contato(s)
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingContact ? 'Editar Contato' : 'Novo Contato'}
                </h5>
                <button type="button" className="btn-close" onClick={closeAddModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  
                  <div className="mb-3">
                    <label className="form-label">Nome *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Telefone *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="5511999999999"
                      required
                    />
                    <small className="form-text text-muted">Formato: código do país + DDD + número</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Empresa</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingContact ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Importar Contatos via CSV</h5>
                <button type="button" className="btn-close" onClick={closeImportModal}></button>
              </div>
              <form onSubmit={handleImportCsv}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  
                  {importResult && (
                    <div className="alert alert-info">
                      <h6>Resultado da Importação:</h6>
                      <ul className="mb-0">
                        <li>✅ Sucesso: {importResult.success}</li>
                        <li>⏭️ Duplicados: {importResult.duplicates}</li>
                        <li>❌ Falhas: {importResult.failed}</li>
                      </ul>
                      {importResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary>Ver erros</summary>
                          <ul className="mt-2">
                            {importResult.errors.map((err: any, idx: number) => (
                              <li key={idx}>Linha {err.row}: {err.error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Formato do CSV:</label>
                    <pre className="bg-light p-2 rounded">
                      {`name,phone,email,company
João Silva,5511999999999,joao@example.com,Empresa XYZ
Maria Santos,5511988888888,maria@example.com,`}
                    </pre>
                    <small className="text-muted">
                      Primeira linha deve conter os cabeçalhos. Nome e telefone são obrigatórios.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Cole o conteúdo do CSV:</label>
                    <textarea
                      className="form-control font-monospace"
                      rows={10}
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="name,phone,email,company&#10;João Silva,5511999999999,joao@example.com,Empresa XYZ"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeImportModal}>
                    Fechar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={importing}>
                    {importing ? 'Importando...' : 'Importar'}
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
