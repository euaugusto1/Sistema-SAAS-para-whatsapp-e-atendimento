// @ts-nocheck
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import DashboardModals from '../components/DashboardModals';
import Layout from '../components/Layout';
import { ErrorMessage, LoadingSpinner } from '../components/LoadingSpinner';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/auth-context';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'comecar' | 'mensagens' | 'contatos' | 'campanhas' | 'instancias' | 'conta'>('comecar');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [metrics, setMetrics] = useState({ 
    sent: 0, 
    delivered: 0, 
    failed: 0, 
    contacts: 0,
    campaigns: 0,
    instances: 0,
    revenue: 0,
    deliveryRate: 0
  });
  const [organizations, setOrganizations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [instances, setInstances] = useState([]);
  const [planName, setPlanName] = useState<string>('Gratuito');
  const [animatedNumbers, setAnimatedNumbers] = useState({
    sent: 0,
    delivered: 0,
    failed: 0,
    contacts: 0,
    campaigns: 0,
    instances: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(''); // '', 'contacts', 'campaigns', 'instances', 'send-message'
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    campaignName: '',
    instanceName: '',
    instancePhone: '',
    messageTo: '',
    messageText: ''
  });
  // Instâncias: edição e QR
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
  const [showEditInstanceModal, setShowEditInstanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQRLoading] = useState(false);
  const [qrData, setQRData] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileForm, setProfileForm] = useState<{ name: string; email: string }>({ name: '', email: '' });
  // Campanhas: edição e stats
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showCampaignStatsModal, setShowCampaignStatsModal] = useState(false);
  const [campaignStats, setCampaignStats] = useState<any | null>(null);
  const [logsState, setLogsState] = useState<{ webVersion?: string; apiVersion?: string; changelog?: string; updatedAt?: string } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [showFooterLogs, setShowFooterLogs] = useState(false);
  // Estados para mensagens em massa
  const [messageType, setMessageType] = useState<string>('TEXT');
  const [whatsappGroups, setWhatsappGroups] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedInstanceForGroups, setSelectedInstanceForGroups] = useState<string>('');
  const [bulkMessageData, setBulkMessageData] = useState<any>({
    instanceId: '',
    text: '',
    mediaType: 'image',
    media: '',
    caption: '',
    fileName: '',
    locationName: '',
    locationAddress: '',
    latitude: 0,
    longitude: 0,
    intervalMinSeconds: 61,
    intervalMaxSeconds: 120,
  });
  const [sendingProgress, setSendingProgress] = useState<any>(null);
  const [progressPolling, setProgressPolling] = useState<any>(null);
  const auth: any = useAuth();

  useEffect(() => {
    document.title = 'Dashboard — WhatsApp SaaS';
    loadDashboardData();
    
    // Limpar intervalo de verificação de QR ao desmontar
    return () => {
      if ((window as any).__qrCheckInterval) {
        clearInterval((window as any).__qrCheckInterval);
      }
    };
  }, []);

  // Registrar última atividade no painel
  const recordActivity = (message: string) => {
    try {
      localStorage.setItem('lastPanelActivity', message);
      localStorage.setItem('lastPanelActivityAt', new Date().toISOString());
    } catch {}
  };

  // Auto refresh dos dados quando habilitado
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadDashboardData();
    }, 30000); // 30s
    return () => clearInterval(id);
  }, [autoRefresh, activeTab]);

  // Animar números
  useEffect(() => {
    if (!loading && metrics.sent > 0) {
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;
      
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedNumbers({
          sent: Math.floor(metrics.sent * easeOut),
          delivered: Math.floor(metrics.delivered * easeOut),
          failed: Math.floor(metrics.failed * easeOut),
          contacts: Math.floor(metrics.contacts * easeOut),
          campaigns: Math.floor(metrics.campaigns * easeOut),
          instances: Math.floor(metrics.instances * easeOut)
        });
        
        if (step >= steps) {
          clearInterval(timer);
          setAnimatedNumbers({
            sent: metrics.sent,
            delivered: metrics.delivered,
            failed: metrics.failed,
            contacts: metrics.contacts,
            campaigns: metrics.campaigns,
            instances: metrics.instances
          });
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [metrics, loading]);

  // Função utilitária para carregar logs (usada no rodapé)
  async function fetchLogs() {
    setLogsLoading(true);
    setLogsError('');
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error('Falha ao obter logs');
      const data = await res.json();
      setLogsState(data);
    } catch (e: any) {
      setLogsError(e?.message || 'Erro ao carregar logs');
    } finally {
      setLogsLoading(false);
    }
  }
  // Carregar logs quando o painel do rodapé for aberto
  useEffect(() => {
    if (showFooterLogs) fetchLogs();
  }, [showFooterLogs]);
  // Buscar versões uma vez para exibir no rodapé
  useEffect(() => {
    fetchLogs().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [contactsStatusFilter, setContactsStatusFilter] = useState<'all' | 'active' | 'blocked' | 'noname'>('all');

  useEffect(() => {
    // Preencher formulário de perfil quando usuário carregar
    const u: any = auth?.user;
    if (u) {
      setProfileForm({ name: u.name || '', email: u.email || '' });
    }
  }, [auth?.user]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiClient.patch('/users/me', {
        name: profileForm.name,
        // email pode ser habilitado no futuro; mantemos leitura somente por enquanto
      });
      setSuccessMessage('Perfil atualizado com sucesso! ✅');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
      // Atualizar visual recarregando o perfil
      try {
        const res = await apiClient.get('/auth/me');
        const userData = res.data?.user || res.data;
        // força recarregar a página para propagar ao AuthProvider sem expor setUser
        if (userData?.name !== auth?.user?.name) {
          window.location.reload();
        }
      } catch {}
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Iniciando carregamento do dashboard...');
      
      const meRes = await apiClient.get('/auth/me');
      const userData = meRes.data?.user || meRes.data;
      const userOrgs = userData?.memberships || [];
      
      console.log('👤 Usuário:', userData);
      console.log('🏢 Organizações:', userOrgs);
      
  setOrganizations(userOrgs);
  const detectedPlan = userData?.plan?.name || userOrgs?.[0]?.organization?.plan?.name || 'Gratuito';
  setPlanName(detectedPlan);
      
      // Obter organizationId
      const organizationId = userOrgs?.[0]?.organization?.id;
      
      if (!organizationId) {
        console.warn('⚠️ Nenhuma organização encontrada para o usuário');
        setError('Você não está associado a nenhuma organização. Por favor, entre em contato com o administrador.');
        setLoading(false);
        
        // Definir valores zerados
        setMetrics({
          sent: 0,
          delivered: 0,
          failed: 0,
          contacts: 0,
          campaigns: 0,
          instances: 0,
          revenue: 0,
          deliveryRate: 0
        });
        return;
      }
      
      console.log('🔑 Carregando dados para organização:', organizationId);
      
      // Carregar dados reais com organizationId
      try {
        // Montar URL de contatos com filtros
        const filterParams = new URLSearchParams();
        if (contactsStatusFilter === 'active') filterParams.set('status', 'active');
        if (contactsStatusFilter === 'blocked') filterParams.set('status', 'blocked');
        if (contactsStatusFilter === 'noname') filterParams.set('noname', 'true');
        const contactsUrl = `/contacts?organizationId=${organizationId}` + (filterParams.toString() ? `&${filterParams.toString()}` : '');

        const [contactsRes, campaignsRes, instancesRes, messagesRes] = await Promise.all([
          apiClient.get(contactsUrl).catch((err) => {
            console.warn('⚠️ Erro ao carregar contatos:', err.response?.data);
            return { data: { data: [], pagination: { total: 0 } } };
          }),
          apiClient.get(`/campaigns?organizationId=${organizationId}`).catch((err) => {
            console.warn('⚠️ Erro ao carregar campanhas:', err.response?.data);
            return { data: { campaigns: [] } };
          }),
          apiClient.get(`/whatsapp/instances?organizationId=${organizationId}`).catch((err) => {
            console.warn('⚠️ Erro ao carregar instâncias:', err.response?.data);
            return { data: [] };
          }),
          apiClient.get(`/messages/stats?organizationId=${organizationId}`).catch((err) => {
            console.warn('⚠️ Erro ao carregar estatísticas de mensagens:', err.response?.data);
            return { data: { sent: 0, delivered: 0, failed: 0 } };
          })
        ]);

  const contactsData = contactsRes.data?.data || contactsRes.data?.contacts || [];
        const campaignsData = campaignsRes.data?.campaigns || [];
        const instancesData = instancesRes.data || [];
        const messagesStats = messagesRes.data || { sent: 0, delivered: 0, failed: 0 };
        
        console.log('📊 Dados REAIS do banco carregados:');
        console.log('  - Contatos:', contactsData.length, contactsData);
        console.log('  - Campanhas:', campaignsData.length, campaignsData);
        console.log('  - Instâncias:', instancesData.length, instancesData);
        console.log('  - Mensagens:', messagesStats);
        
        setContacts(contactsData.slice(0, 10));
        setCampaigns(campaignsData.slice(0, 10));
        setInstances(instancesData);

        const totalContacts = contactsRes.data?.pagination?.total || contactsData.length;
        const totalCampaigns = campaignsData.length;
        const totalInstances = instancesData.length;
        
        // Usar dados REAIS de mensagens se disponíveis, senão usar 0
        const totalSent = messagesStats.sent || 0;
        const totalDelivered = messagesStats.delivered || 0;
        const totalFailed = messagesStats.failed || 0;
        
        setMetrics({
          sent: totalSent,
          delivered: totalDelivered,
          failed: totalFailed,
          contacts: totalContacts,
          campaigns: totalCampaigns,
          instances: totalInstances,
          revenue: totalCampaigns * 150.00,
          deliveryRate: totalSent > 0 ? Math.floor((totalDelivered / totalSent) * 100) : 0
        });

        // Atividade recente baseada em dados reais + contexto do usuário
        const activities: any[] = [];

        // Último acesso anterior salvo no navegador
        try {
          const prevAccess = localStorage.getItem('lastDashboardAccessAt');
          if (prevAccess) {
            activities.push({
              type: 'access',
              message: 'Último acesso ao painel',
              time: new Date(prevAccess).toLocaleString('pt-BR'),
              icon: '⏱️'
            });
          }
        } catch {}

        // Assinatura atual
        activities.push({
          type: 'plan',
          message: `Assinatura atual: ${detectedPlan}`,
          time: 'Status atual',
          icon: '💳'
        });

        // Última atividade registrada no painel
        try {
          const lastAct = localStorage.getItem('lastPanelActivity');
          const lastActAt = localStorage.getItem('lastPanelActivityAt');
          activities.push({
            type: 'activity',
            message: lastAct || 'Nenhuma atividade registrada ainda',
            time: lastActAt ? new Date(lastActAt).toLocaleString('pt-BR') : '—',
            icon: '◆'
          });
        } catch {}
        
        if (campaignsData.length > 0) {
          const latestCampaign = campaignsData[0];
          activities.push({
            type: 'campaign',
            message: `Campanha "${latestCampaign.name}" - ${latestCampaign.status}`,
            time: new Date(latestCampaign.createdAt).toLocaleString('pt-BR'),
            icon: '◆'
          });
        }
        
        if (contactsData.length > 0) {
          activities.push({
            type: 'contact',
            message: `${totalContacts} contatos cadastrados`,
            time: 'Atualizado agora',
            icon: '●'
          });
        }
        
        if (totalSent > 0) {
          activities.push({
            type: 'message',
            message: `${totalDelivered} mensagens entregues de ${totalSent} enviadas`,
            time: 'Hoje',
            icon: '▲'
          });
        }
        
        if (instancesData.length > 0) {
          const connectedInstances = instancesData.filter((i: any) => i.status === 'CONNECTED');
          activities.push({
            type: 'instance',
            message: `${connectedInstances.length} de ${totalInstances} instâncias conectadas`,
            time: 'Status atual',
            icon: '■'
          });
        }
        
        // Se não houver atividades, mostrar mensagem padrão
        if (activities.length === 0) {
          activities.push({
            type: 'info',
            message: 'Nenhuma atividade recente. Comece criando uma campanha ou adicionando contatos!',
            time: 'Agora',
            icon: '◈'
          });
        }
        
  setRecentActivity(activities);
  // Salvar novo último acesso
  try { localStorage.setItem('lastDashboardAccessAt', new Date().toISOString()); } catch {}
        
      } catch (metricsError) {
        console.error('❌ Erro ao carregar métricas:', metricsError);
        // Definir valores zerados em caso de erro
        setMetrics({
          sent: 0,
          delivered: 0,
          failed: 0,
          contacts: 0,
          campaigns: 0,
          instances: 0,
          revenue: 0,
          deliveryRate: 0
        });
      }
    } catch (e: any) {
      console.error('❌ Failed to load dashboard data', e);
      setError(e?.response?.data?.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }

  const navigateTo = (path: string) => {
    console.log('Navegando para:', path);
    router.push(path).catch(err => console.error('Erro na navegação:', err));
  };

  // Funções para mensagens em massa
  const loadWhatsAppGroups = async () => {
    if (instances.length === 0) return;
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id;
    if (!organizationId) return;
    
    try {
      const response = await apiClient.post('/messages/groups', {
        instanceId: instances[0].id,
        organizationId
      });
      setWhatsappGroups(response.data.groups || []);
    } catch (err: any) {
      console.error('Erro ao carregar grupos:', err);
    }
  };

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId) 
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleBulkSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      return alert('Selecione pelo menos um destinatário');
    }
    if (!bulkMessageData.instanceId) {
      return alert('Selecione uma instância WhatsApp');
    }

    const organizationId = auth?.user?.memberships?.[0]?.organization?.id;
    if (!organizationId) return;

    try {
      const payload: any = {
        instanceId: bulkMessageData.instanceId,
        organizationId,
        messageType,
        recipients: selectedRecipients,
        intervalMinSeconds: bulkMessageData.intervalMinSeconds || 61,
        intervalMaxSeconds: bulkMessageData.intervalMaxSeconds || 120,
      };

      // Adicionar dados específicos por tipo de mensagem
      switch (messageType) {
        case 'TEXT':
          payload.text = bulkMessageData.text;
          break;
        case 'MEDIA':
          payload.mediaType = bulkMessageData.mediaType;
          payload.media = bulkMessageData.media;
          payload.caption = bulkMessageData.caption;
          payload.fileName = bulkMessageData.fileName;
          break;
        case 'LOCATION':
          payload.locationName = bulkMessageData.locationName;
          payload.locationAddress = bulkMessageData.locationAddress;
          payload.latitude = parseFloat(bulkMessageData.latitude);
          payload.longitude = parseFloat(bulkMessageData.longitude);
          break;
        case 'AUDIO':
          payload.media = bulkMessageData.media;
          payload.mediaType = 'audio';
          break;
        case 'STICKER':
          payload.media = bulkMessageData.media;
          break;
      }

      const response = await apiClient.post('/messages/bulk', payload);
      setSendingProgress(response.data);
      alert(`Envio iniciado! ${response.data.totalRecipients} destinatários`);
      
      // Iniciar polling de progresso
      startProgressPolling(response.data.jobId);
      recordActivity(`Enviou mensagens em massa para ${response.data.totalRecipients} destinatários`);
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.message || 'Erro ao iniciar envio'));
    }
  };

  const startProgressPolling = (jobId: string) => {
    // Limpar polling anterior se existir
    if (progressPolling) clearInterval(progressPolling);

    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/messages/bulk/${jobId}/progress`);
        setSendingProgress(response.data);
        
        // Parar polling se job terminou
        if (['completed', 'failed'].includes(response.data.state)) {
          clearInterval(interval);
          setProgressPolling(null);
          if (response.data.state === 'completed') {
            alert('Envio em massa concluído!');
            loadDashboardData(); // Atualizar métricas
          }
        }
      } catch (err) {
        console.error('Erro ao buscar progresso:', err);
      }
    }, 3000); // Poll a cada 3 segundos

    setProgressPolling(interval);
  };

  useEffect(() => {
    // Carregar grupos quando instâncias estiverem disponíveis
    if (activeTab === 'mensagens' && instances.length > 0) {
      loadWhatsAppGroups();
    }
    // Limpar polling ao desmontar
    return () => {
      if (progressPolling) clearInterval(progressPolling);
    };
  }, [activeTab, instances]);

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    setError('');
    
    // Se for modal de campanha, passar instâncias disponíveis
    if (modalName === 'campaigns') {
      setFormData({
        ...formData,
        instances: instances // Passar lista de instâncias
      });
    }
  };

  const closeModal = () => {
    setActiveModal('');
    setFormData({
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      campaignName: '',
      campaignInstance: '',
      instanceName: '',
      instancePhone: '',
      messageTo: '',
      messageText: '',
      instances: []
    });
    setError('');
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
        console.log('📝 Criando contato...', {
          name: formData.contactName,
          phone: formData.contactPhone,
          email: formData.contactEmail
        });
      
      // Criar o contato
      const response = await apiClient.post(`/contacts?organizationId=${organizationId}`, {
        name: formData.contactName,
        phone: formData.contactPhone,
        email: formData.contactEmail
      });
      
        console.log('✅ Contato criado:', response.data);
      
        // Fechar modal
      closeModal();
      
        // Mostrar sucesso
      setSuccessMessage('Contato criado com sucesso! ✅');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
  try { localStorage.setItem('lastPanelActivity', 'Criou um contato'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
      
        // Recarregar os contatos imediatamente com a nova lista do servidor
        try {
          console.log('🔄 Recarregando lista de contatos...');
        
          const contactsRes = await apiClient.get(`/contacts?organizationId=${organizationId}`);
          const contactsData = contactsRes.data?.data || contactsRes.data?.contacts || [];
          const totalContacts = contactsRes.data?.pagination?.total || contactsData.length;
        
          console.log('📊 Contatos atualizados:', contactsData.length, contactsData);
        
          // Atualizar estado com dados do servidor
          setContacts(contactsData.slice(0, 10));
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            contacts: totalContacts
          }));
        
        } catch (reloadErr) {
          console.error('⚠️ Erro ao recarregar contatos:', reloadErr);
          // Se falhar o reload, força reload completo
          await loadDashboardData();
        }
      
    } catch (err: any) {
        console.error('❌ Erro ao criar contato:', err);
      setError(err.response?.data?.message || 'Erro ao criar contato');
    }
  };

  const handleImportCSV = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setLoading(true);
      setError('');
      
      try {
        const text = await file.text();
        
        const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                              organizations?.[0]?.organization?.id;
        
        if (!organizationId) {
          setError('Organização não encontrada. Por favor, faça login novamente.');
          setLoading(false);
          return;
        }
        
        const response = await apiClient.post(`/contacts/import/csv?organizationId=${organizationId}`, {
          csvData: text
        });
        
        const result = response.data;
        
        // Recarregar dados
        await loadDashboardData();
        
        // Mostrar resultado da importação
        let message = `✅ Importação concluída!\n\n`;
        message += `✓ ${result.success} contatos importados\n`;
        if (result.duplicates > 0) {
          message += `⚠️ ${result.duplicates} duplicados ignorados\n`;
        }
        if (result.failed > 0) {
          message += `✗ ${result.failed} falharam\n`;
        }
        
        if (result.errors && result.errors.length > 0) {
          message += `\n⚠️ Primeiros erros:\n`;
          result.errors.slice(0, 3).forEach((err: any) => {
            message += `Linha ${err.row}: ${err.error}\n`;
          });
        }
        
        alert(message);
        
        setSuccessMessage(`${result.success} contatos importados com sucesso! 🎉`);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 4000);
      } catch (err: any) {
        console.error('Erro ao importar CSV:', err);
        setError(err.response?.data?.message || 'Erro ao importar arquivo CSV. Verifique o formato.');
        alert('❌ Erro ao importar CSV:\n' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    
    input.click();
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }

    // Validar se há instância selecionada
    if (!formData.campaignInstance) {
      setError('Por favor, selecione uma instância WhatsApp.');
      return;
    }

    // Validar se há mensagem
    if (!formData.messageText || formData.messageText.trim() === '') {
      setError('Por favor, digite a mensagem da campanha.');
      return;
    }
    
    try {
      await apiClient.post(`/campaigns`, {
        organizationId: organizationId,
        name: formData.campaignName,
        instanceId: formData.campaignInstance,
        message: formData.messageText,
        contactIds: [] // Lista vazia - usuário configura depois
      });
      closeModal();
      await loadDashboardData();
      setSuccessMessage('Campanha criada com sucesso! 🎉');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
  try { localStorage.setItem('lastPanelActivity', 'Criou uma campanha'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
      
      // Limpar formulário
      setFormData({
        ...formData,
        campaignName: '',
        campaignInstance: '',
        messageText: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar campanha');
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    console.log('=== DEBUG CREATE INSTANCE ===');
    console.log('Auth user:', auth?.user);
    console.log('Organizations:', organizations);
    console.log('Organization ID:', organizationId);
    console.log('Form data:', { name: formData.instanceName, phoneNumber: formData.instancePhone });
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      const response = await apiClient.post(`/whatsapp/instances?organizationId=${organizationId}`, {
        name: formData.instanceName,
        phoneNumber: formData.instancePhone
      });
      
      console.log('✅ Instância criada com sucesso:', response.data);
      
      closeModal();
      await loadDashboardData(); // Aguardar o reload
      alert('Instância criada com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao criar instância:', err);
      console.error('Resposta do servidor:', err.response?.data);
      setError(err.response?.data?.message || 'Erro ao criar instância');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await apiClient.post(`/messages?organizationId=${organizationId}`, {
        to: formData.messageTo,
        message: formData.messageText
      });
      closeModal();
      await loadDashboardData();
      alert('Mensagem enviada com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar mensagem');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Deseja realmente excluir este contato?')) return;
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await apiClient.delete(`/contacts/${id}?organizationId=${organizationId}`);
      
      // Atualizar lista localmente de forma imediata
      setContacts(prevContacts => prevContacts.filter(c => c.id !== id));
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        contacts: Math.max(0, prevMetrics.contacts - 1)
      }));
      
      setSuccessMessage('Contato excluído com sucesso! 🗑️');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
  try { localStorage.setItem('lastPanelActivity', 'Excluiu um contato'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
      
      // Recarregar em background
      setTimeout(() => {
        loadDashboardData().catch(console.error);
      }, 500);
    } catch (err: any) {
      console.error('Erro ao excluir contato:', err);
      setError(err.response?.data?.message || 'Erro ao excluir contato');
    }
  };

  // Editar contato (prompt simples)
  const handleEditContact = async (contact: any) => {
    const name = window.prompt('Nome do contato:', contact.name || '');
    if (name === null) return;
    const phone = window.prompt('Telefone (somente números, com DDI):', contact.phone || '');
    if (phone === null) return;
    const email = window.prompt('Email:', contact.email || '');
    if (email === null) return;

    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }

    try {
      await apiClient.patch(`/contacts/${contact.id}?organizationId=${organizationId}`, { name, phone, email });
      await loadDashboardData();
      setSuccessMessage('Contato atualizado com sucesso! ✏️');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
  try { localStorage.setItem('lastPanelActivity', 'Editou um contato'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
    } catch (err: any) {
      console.error('Erro ao editar contato:', err);
      setError(err.response?.data?.message || 'Erro ao editar contato');
    }
  };

  // Adicionar/editar tags
  const handleEditTags = async (contact: any) => {
    const initial = (contact.tags || []).join(', ');
    const value = window.prompt('Informe as tags separadas por vírgula:', initial);
    if (value === null) return;
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }

    try {
      await apiClient.patch(`/contacts/${contact.id}/tags?organizationId=${organizationId}`, { tags });
      await loadDashboardData();
      setSuccessMessage('Tags atualizadas! 🏷️');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 1500);
  try { localStorage.setItem('lastPanelActivity', 'Atualizou tags de um contato'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
    } catch (err: any) {
      console.error('Erro ao atualizar tags:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar tags');
    }
  };

  // Adicionar a uma lista
  const handleAddToList = async (contact: any) => {
    const listName = window.prompt('Nome da lista para adicionar (será criada se não existir):');
    if (!listName) return;

    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }

    try {
      await apiClient.post(`/contacts/${contact.id}/lists?organizationId=${organizationId}`, { listName });
      setSuccessMessage(`Contato adicionado à lista "${listName}" ✅`);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 1500);
  try { localStorage.setItem('lastPanelActivity', 'Adicionou contato a uma lista'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
    } catch (err: any) {
      console.error('Erro ao adicionar à lista:', err);
      setError(err.response?.data?.message || 'Erro ao adicionar contato à lista');
    }
  };

  // Bloquear/desbloquear contato
  const handleToggleBlock = async (contact: any) => {
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    try {
      await apiClient.patch(`/contacts/${contact.id}/block?organizationId=${organizationId}`, { isBlocked: !contact.isBlocked });
      await loadDashboardData();
  try { localStorage.setItem('lastPanelActivity', contact.isBlocked ? 'Desbloqueou um contato' : 'Bloqueou um contato'); localStorage.setItem('lastPanelActivityAt', new Date().toISOString()); } catch {}
    } catch (err: any) {
      console.error('Erro ao bloquear/desbloquear contato:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar status do contato');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return;
    
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await apiClient.delete(`/campaigns/${id}?organizationId=${organizationId}`);
      await loadDashboardData();
      alert('Campanha excluída com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir campanha');
    }
  };

  const handleConnectInstance = async (id: string) => {
    // Obter organizationId do usuário
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await apiClient.post(`/whatsapp/instances/${id}/connect?organizationId=${organizationId}`);
      await loadDashboardData();
      alert('Conexão iniciada! Acesse a página de instâncias para ver o QR Code.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao conectar instância');
    }
  };

  const handleDisconnectInstance = async (id: string) => {
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada. Por favor, faça login novamente.');
    try {
      await apiClient.post(`/whatsapp/instances/${id}/disconnect?organizationId=${organizationId}`);
      await loadDashboardData();
      alert('Instância desconectada.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desconectar instância');
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta instância?')) return;
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada. Por favor, faça login novamente.');
    try {
      await apiClient.delete(`/whatsapp/instances/${id}?organizationId=${organizationId}`);
      await loadDashboardData();
      alert('Instância excluída com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir instância');
    }
  };

  const openEditInstance = (instance: any) => {
    setSelectedInstance(instance);
    setFormData({
      ...formData,
      instanceName: instance.name || '',
      instancePhone: instance.phoneNumber || ''
    });
    setShowEditInstanceModal(true);
  };

  const handleEditInstanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstance) return;
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada. Por favor, faça login novamente.');
    try {
      await apiClient.put(`/whatsapp/instances/${selectedInstance.id}?organizationId=${organizationId}`, {
        name: formData.instanceName,
        phoneNumber: formData.instancePhone || undefined,
      });
      setShowEditInstanceModal(false);
      setSelectedInstance(null);
      await loadDashboardData();
      alert('Instância atualizada com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar instância');
    }
  };

  const openQRModal = async (instance: any) => {
    setSelectedInstance(instance);
    setShowQRModal(true);
    setQRLoading(true);
    setQRData(null);
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      setQRLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(`/whatsapp/instances/${instance.id}/qrcode?organizationId=${organizationId}`);
      setQRData(res.data);
      
      // Iniciar verificação de status a cada 3 segundos
      const checkInterval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get(`/whatsapp/instances/${instance.id}?organizationId=${organizationId}`);
          const currentStatus = statusRes.data?.status;
          
          if (currentStatus === 'CONNECTED') {
            clearInterval(checkInterval);
            setShowQRModal(false);
            setSelectedInstance(null);
            setQRData(null);
            setSuccessMessage(`WhatsApp conectado com sucesso! 🎉\nInstância: ${instance.name}`);
            setShowSuccessModal(true);
            
            // Atualizar lista de instâncias
            loadDashboardData();
            
            // Fechar modal de sucesso após 5 segundos
            setTimeout(() => {
              setShowSuccessModal(false);
            }, 5000);
          }
        } catch (err) {
          // Continua verificando
        }
      }, 3000);
      
      // Limpar intervalo se o modal for fechado manualmente
      const originalClose = () => {
        clearInterval(checkInterval);
        setShowQRModal(false);
        setSelectedInstance(null);
      };
      
      // Armazenar referência ao intervalo
      (window as any).__qrCheckInterval = checkInterval;
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao obter QR Code');
    } finally {
      setQRLoading(false);
    }
  };

  const refreshQR = async () => {
    if (!selectedInstance) return;
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    try {
      const res = await apiClient.get(`/whatsapp/instances/${selectedInstance.id}/qrcode?organizationId=${organizationId}`);
      setQRData(res.data);
    } catch (err) {
      // silêncio controlado; usuário pode tentar novamente
    }
  };

  // Campaign Handlers
  const getCampaignStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; icon: string; class: string }> = {
      DRAFT: { label: 'Rascunho', icon: '📝', class: 'draft' },
      SCHEDULED: { label: 'Agendada', icon: '📅', class: 'scheduled' },
      RUNNING: { label: 'Em Execução', icon: '🚀', class: 'running' },
      PAUSED: { label: 'Pausada', icon: '⏸', class: 'paused' },
      COMPLETED: { label: 'Concluída', icon: '✅', class: 'completed' },
      FAILED: { label: 'Falhou', icon: '❌', class: 'failed' },
    };
    return statusMap[status] || { label: status, icon: '❓', class: 'unknown' };
  };

  const handleStartCampaign = async (id: string) => {
    if (!confirm('Deseja iniciar esta campanha? As mensagens serão enviadas para todos os destinatários.')) return;
    
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) {
      setError('Organização não encontrada. Por favor, faça login novamente.');
      return;
    }
    
    try {
      await apiClient.post(`/campaigns/${id}/start?organizationId=${organizationId}`);
      await loadDashboardData();
      setSuccessMessage('Campanha iniciada com sucesso! 🚀');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao iniciar campanha');
    }
  };

  const handlePauseCampaign = async (id: string) => {
    if (!confirm('Deseja pausar esta campanha?')) return;
    
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada.');
    
    try {
      await apiClient.post(`/campaigns/${id}/pause?organizationId=${organizationId}`);
      await loadDashboardData();
      setSuccessMessage('Campanha pausada.');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao pausar campanha');
    }
  };

  const handleResumeCampaign = async (id: string) => {
    if (!confirm('Deseja retomar esta campanha?')) return;
    
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada.');
    
    try {
      await apiClient.post(`/campaigns/${id}/resume?organizationId=${organizationId}`);
      await loadDashboardData();
      setSuccessMessage('Campanha retomada! 🚀');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao retomar campanha');
    }
  };

  const handleEditCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    setFormData({
      ...formData,
      campaignName: campaign.name || '',
      messageText: campaign.message || ''
    });
    setShowEditCampaignModal(true);
  };

  const handleEditCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada.');
    
    try {
      await apiClient.patch(`/campaigns/${selectedCampaign.id}?organizationId=${organizationId}`, {
        name: formData.campaignName,
        message: formData.messageText
      });
      setShowEditCampaignModal(false);
      setSelectedCampaign(null);
      await loadDashboardData();
      setSuccessMessage('Campanha atualizada com sucesso!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar campanha');
    }
  };

  const handleViewCampaignStats = async (campaign: any) => {
    const organizationId = auth?.user?.memberships?.[0]?.organization?.id || 
                          organizations?.[0]?.organization?.id;
    if (!organizationId) return setError('Organização não encontrada.');
    
    try {
      const res = await apiClient.get(`/campaigns/${campaign.id}/stats?organizationId=${organizationId}`);
      setCampaignStats(res.data);
      setSelectedCampaign(campaign);
      setShowCampaignStatsModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar estatísticas');
    }
  };

  const tabs = useMemo(() => ([
    { key: 'comecar', label: 'Começar Agora' },
    { key: 'mensagens', label: 'Mensagens' },
    { key: 'contatos', label: 'Contatos' },
    { key: 'campanhas', label: 'Campanhas' },
    { key: 'instancias', label: 'Instâncias' },
    { key: 'sms', label: '📱 Envio SMS' },
    { key: 'conta', label: 'Conta' },
  ] as const), []);

  return (
    <Layout title="Dashboard" hideSidebar>
      <Head>
        <title>Dashboard — WhatsApp SaaS</title>
      </Head>
      
      <div className="dashboard-container">
        {/* Top Tabs Menu */}
        <nav className="top-tabs">
          <ul className="tabs-list">
            {tabs.map((t) => (
              <li key={t.key}>
                <button
                  className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key as typeof activeTab)}
                >
                  {t.label}
                </button>
              </li>
            ))}
            <li className="tabs-actions">
              <button className={`refresh-btn ${autoRefresh ? 'on' : ''}`} onClick={() => setAutoRefresh(v => !v)}>
                {autoRefresh ? 'Auto Atualizar: ON' : 'Auto Atualizar: OFF'}
              </button>
              <button className="refresh-once-btn" onClick={() => loadDashboardData()}>
                Atualizar agora
              </button>
            </li>
          </ul>
        </nav>

        {loading && <LoadingSpinner message="Carregando dashboard..." />}
        {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

        {!loading && !error && (
          <main className="dashboard-main">
            {activeTab === 'comecar' && (
              <section className="metrics-section">
                <div className="section-card" style={{ marginBottom: '1rem' }}>
                  <div className="section-header-row">
                    <h2 className="section-title">📈 Analytics em Tempo Real</h2>
                    <p className="section-subtitle">Dados atualizados do painel</p>
                  </div>
                </div>
                <div className="metrics-grid">
                  <div className="metric-card metric-primary">
                    <div className="metric-icon">▲</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.sent.toLocaleString()}</h3>
                      <p className="metric-label">Mensagens Enviadas</p>
                      <span className="metric-trend positive">+12% este mês</span>
                    </div>
                  </div>

                  <div className="metric-card metric-success">
                    <div className="metric-icon">✓</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.delivered.toLocaleString()}</h3>
                      <p className="metric-label">Entregues</p>
                      <span className="metric-trend positive">{metrics.deliveryRate}% taxa de entrega</span>
                    </div>
                  </div>

                  <div className="metric-card metric-warning">
                    <div className="metric-icon">✕</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.failed.toLocaleString()}</h3>
                      <p className="metric-label">Falhas</p>
                      <span className="metric-trend negative">-5% vs mês anterior</span>
                    </div>
                  </div>

                  <div className="metric-card metric-info">
                    <div className="metric-icon">●</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.contacts.toLocaleString()}</h3>
                      <p className="metric-label">Contatos</p>
                      <span className="metric-trend positive">+{Math.floor(Math.random() * 20 + 5)} hoje</span>
                    </div>
                  </div>

                  <div className="metric-card metric-purple">
                    <div className="metric-icon">◆</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.campaigns.toLocaleString()}</h3>
                      <p className="metric-label">Campanhas</p>
                      <span className="metric-trend neutral">{Math.floor(animatedNumbers.campaigns * 0.3)} ativas</span>
                    </div>
                  </div>

                  <div className="metric-card metric-teal">
                    <div className="metric-icon">■</div>
                    <div className="metric-content">
                      <h3 className="metric-number">{animatedNumbers.instances.toLocaleString()}</h3>
                      <p className="metric-label">Instâncias</p>
                      <span className="metric-trend positive">{Math.floor(animatedNumbers.instances * 0.8)} conectadas</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'mensagens' && (
            <section className="messages-section">
              <div className="section-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">💬 Sistema de Envio em Massa WhatsApp</h2>
                    <p className="section-subtitle">Envie mensagens para grupos e contatos com intervalo inteligente</p>
                  </div>
                  <button className="btn-link" onClick={() => navigateTo('/messages')}>
                    Ver Histórico Completo →
                  </button>
                </div>

                {/* Configuração de Envio em Massa */}
                <div className="bulk-send-wrapper">
                  <form className="bulk-send-form" onSubmit={handleBulkSendSubmit}>
                    {/* Seletor de Tipo de Mensagem */}
                    <div className="form-section">
                      <h3 className="section-subtitle">🎯 1. Tipo de Mensagem</h3>
                      <div className="message-type-selector">
                        <button 
                          type="button"
                          className={`type-btn ${messageType === 'TEXT' ? 'active' : ''}`}
                          onClick={() => setMessageType('TEXT')}
                        >
                          <span className="type-icon">💬</span>
                          <span>Texto</span>
                        </button>
                        <button 
                          type="button"
                          className={`type-btn ${messageType === 'MEDIA' ? 'active' : ''}`}
                          onClick={() => setMessageType('MEDIA')}
                        >
                          <span className="type-icon">🖼️</span>
                          <span>Mídia</span>
                        </button>
                        <button 
                          type="button"
                          className={`type-btn ${messageType === 'AUDIO' ? 'active' : ''}`}
                          onClick={() => setMessageType('AUDIO')}
                        >
                          <span className="type-icon">🎵</span>
                          <span>Áudio</span>
                        </button>
                        <button 
                          type="button"
                          className={`type-btn ${messageType === 'LOCATION' ? 'active' : ''}`}
                          onClick={() => setMessageType('LOCATION')}
                        >
                          <span className="type-icon">📍</span>
                          <span>Localização</span>
                        </button>
                        <button 
                          type="button"
                          className={`type-btn ${messageType === 'STICKER' ? 'active' : ''}`}
                          onClick={() => setMessageType('STICKER')}
                        >
                          <span className="type-icon">😀</span>
                          <span>Sticker</span>
                        </button>
                      </div>
                    </div>

                    {/* Seleção de Instância */}
                    <div className="form-section">
                      <h3 className="section-subtitle">📱 2. Selecionar Instância WhatsApp</h3>
                      <div className="form-group">
                        <label className="form-label">Instância para Envio</label>
                        <select 
                          className="form-select"
                          value={bulkMessageData.instanceId || ''}
                          onChange={(e) => setBulkMessageData({...bulkMessageData, instanceId: e.target.value})}
                          required
                        >
                          <option value="">Selecione uma instância</option>
                          {instances
                            .filter((inst: any) => inst.status === 'CONNECTED')
                            .map((inst: any) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name} - {inst.phoneNumber || 'Sem número'}
                              </option>
                            ))
                          }
                        </select>
                        <span className="form-hint">
                          {instances.filter((inst: any) => inst.status === 'CONNECTED').length === 0 
                            ? '⚠️ Nenhuma instância conectada. Conecte uma instância primeiro.' 
                            : `✅ ${instances.filter((inst: any) => inst.status === 'CONNECTED').length} instância(s) disponível(is)`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Formulário Dinâmico baseado no tipo */}
                    <div className="form-section">
                      <h3 className="section-subtitle">✏️ 3. Conteúdo da Mensagem</h3>
                      
                      {messageType === 'TEXT' && (
                        <div className="form-group">
                          <label className="form-label">Mensagem de Texto</label>
                          <textarea
                            className="form-textarea"
                            value={bulkMessageData.text}
                            onChange={(e) => setBulkMessageData({...bulkMessageData, text: e.target.value})}
                            placeholder="Digite a mensagem que será enviada para todos os destinatários..."
                            rows={6}
                            required
                          />
                          <span className="form-hint">✨ Dica: Use emojis para tornar sua mensagem mais atrativa</span>
                        </div>
                      )}

                      {messageType === 'MEDIA' && (
                        <>
                          <div className="form-row">
                            <div className="form-group flex-1">
                              <label className="form-label">Tipo de Mídia</label>
                              <select 
                                className="form-select"
                                value={bulkMessageData.mediaType}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, mediaType: e.target.value})}
                              >
                                <option value="image">🖼️ Imagem</option>
                                <option value="video">🎥 Vídeo</option>
                                <option value="document">📄 Documento</option>
                              </select>
                            </div>
                            <div className="form-group flex-1">
                              <label className="form-label">Nome do Arquivo (opcional)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bulkMessageData.fileName}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, fileName: e.target.value})}
                                placeholder="arquivo.pdf"
                              />
                            </div>
                          </div>
                          
                          {/* Upload ou URL */}
                          <div className="form-group">
                            <label className="form-label">Enviar Arquivo</label>
                            <div className="upload-options">
                              <label className="upload-btn">
                                <input
                                  type="file"
                                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Show loading
                                      setBulkMessageData({...bulkMessageData, media: 'uploading...'});
                                      
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      
                                      try {
                                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/messages/upload-media?organizationId=${user?.organizationId}`, {
                                          method: 'POST',
                                          headers: {
                                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                          },
                                          body: formData,
                                        });
                                        
                                        const data = await response.json();
                                        setBulkMessageData({
                                          ...bulkMessageData, 
                                          media: data.base64,
                                          fileName: data.fileName,
                                          mediaType: data.type
                                        });
                                        alert(`✅ Arquivo "${data.fileName}" carregado com sucesso!`);
                                      } catch (error) {
                                        console.error('Upload error:', error);
                                        alert('❌ Erro ao fazer upload do arquivo');
                                        setBulkMessageData({...bulkMessageData, media: ''});
                                      }
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <span className="upload-icon">📁</span>
                                <span>Escolher Arquivo</span>
                              </label>
                              <span className="upload-separator">ou</span>
                              <input
                                type="url"
                                className="form-input"
                                value={bulkMessageData.media?.startsWith('data:') ? '' : (bulkMessageData.media || '')}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, media: e.target.value})}
                                placeholder="https://exemplo.com/imagem.jpg"
                              />
                            </div>
                            <span className="form-hint">
                              {bulkMessageData.media?.startsWith('data:') 
                                ? `✅ Arquivo carregado: ${bulkMessageData.fileName || 'arquivo'}` 
                                : 'Faça upload de um arquivo ou cole uma URL pública'
                              }
                            </span>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Legenda (opcional)</label>
                            <textarea
                              className="form-textarea"
                              value={bulkMessageData.caption}
                              onChange={(e) => setBulkMessageData({...bulkMessageData, caption: e.target.value})}
                              placeholder="Adicione uma descrição..."
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      {messageType === 'AUDIO' && (
                        <div className="form-group">
                          <label className="form-label">URL do Áudio</label>
                          <input
                            type="url"
                            className="form-input"
                            value={bulkMessageData.media}
                            onChange={(e) => setBulkMessageData({...bulkMessageData, media: e.target.value})}
                            placeholder="https://exemplo.com/audio.mp3"
                            required
                          />
                          <span className="form-hint">Formatos: MP3, OGG, WAV</span>
                        </div>
                      )}

                      {messageType === 'LOCATION' && (
                        <>
                          <div className="form-row">
                            <div className="form-group flex-1">
                              <label className="form-label">Nome do Local</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bulkMessageData.locationName}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, locationName: e.target.value})}
                                placeholder="Minha Empresa"
                                required
                              />
                            </div>
                            <div className="form-group flex-1">
                              <label className="form-label">Endereço</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bulkMessageData.locationAddress}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, locationAddress: e.target.value})}
                                placeholder="Rua Exemplo, 123"
                                required
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group flex-1">
                              <label className="form-label">Latitude</label>
                              <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={bulkMessageData.latitude}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, latitude: e.target.value})}
                                placeholder="-23.550520"
                                required
                              />
                            </div>
                            <div className="form-group flex-1">
                              <label className="form-label">Longitude</label>
                              <input
                                type="number"
                                step="any"
                                className="form-input"
                                value={bulkMessageData.longitude}
                                onChange={(e) => setBulkMessageData({...bulkMessageData, longitude: e.target.value})}
                                placeholder="-46.633308"
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {messageType === 'STICKER' && (
                        <div className="form-group">
                          <label className="form-label">URL da Imagem do Sticker</label>
                          <input
                            type="url"
                            className="form-input"
                            value={bulkMessageData.media}
                            onChange={(e) => setBulkMessageData({...bulkMessageData, media: e.target.value})}
                            placeholder="https://exemplo.com/sticker.webp"
                            required
                          />
                          <span className="form-hint">Formato recomendado: WEBP ou PNG transparente</span>
                        </div>
                      )}
                    </div>

                    {/* Seleção de Destinatários */}
                    <div className="form-section">
                      <h3 className="section-subtitle">👥 4. Selecionar Destinatários</h3>
                      
                      <div className="recipients-tabs">
                        <button type="button" className="tab-btn active">
                          💬 Grupos WhatsApp ({whatsappGroups.length})
                        </button>
                        <button type="button" className="tab-btn" onClick={() => alert('Em breve: seleção de contatos individuais')}>
                          👤 Contatos ({contacts.length})
                        </button>
                      </div>

                      <div className="recipients-list">
                        {whatsappGroups.length === 0 ? (
                          <div className="empty-state-small">
                            <p>📭 Nenhum grupo encontrado</p>
                            <span className="form-hint">Conecte uma instância WhatsApp para ver os grupos</span>
                          </div>
                        ) : (
                          whatsappGroups.map((group: any) => (
                            <label key={group.id} className="recipient-item">
                              <input
                                type="checkbox"
                                checked={selectedRecipients.includes(group.id)}
                                onChange={() => handleRecipientToggle(group.id)}
                              />
                              <div className="recipient-info">
                                <span className="recipient-name">{group.subject}</span>
                                <span className="recipient-meta">{group.size} participantes</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="recipients-summary">
                        <strong>{selectedRecipients.length}</strong> destinatários selecionados
                      </div>
                    </div>

                    {/* Configuração de Intervalo Aleatório */}
                    <div className="form-section">
                      <h3 className="section-subtitle">⏱️ 5. Intervalo Entre Envios (Aleatório)</h3>
                      <p className="form-hint" style={{marginBottom: '1.5rem'}}>
                        🎲 O sistema enviará cada mensagem com um intervalo <strong>aleatório</strong> dentro do range selecionado para parecer mais natural
                      </p>
                      
                      <div className="interval-control">
                        <div className="form-row">
                          <div className="form-group flex-1">
                            <label className="form-label">Intervalo Mínimo</label>
                            <input
                              type="range"
                              min="61"
                              max="300"
                              value={bulkMessageData.intervalMinSeconds || 61}
                              onChange={(e) => {
                                const min = parseInt(e.target.value);
                                const max = bulkMessageData.intervalMaxSeconds || 120;
                                setBulkMessageData({
                                  ...bulkMessageData, 
                                  intervalMinSeconds: min,
                                  intervalMaxSeconds: Math.max(min, max)
                                });
                              }}
                              className="interval-slider"
                            />
                            <div className="interval-display">
                              <span className="interval-value">{bulkMessageData.intervalMinSeconds || 61}s</span>
                            </div>
                          </div>
                          
                          <div className="form-group flex-1">
                            <label className="form-label">Intervalo Máximo</label>
                            <input
                              type="range"
                              min="61"
                              max="300"
                              value={bulkMessageData.intervalMaxSeconds || 120}
                              onChange={(e) => {
                                const max = parseInt(e.target.value);
                                const min = bulkMessageData.intervalMinSeconds || 61;
                                setBulkMessageData({
                                  ...bulkMessageData,
                                  intervalMinSeconds: Math.min(min, max),
                                  intervalMaxSeconds: max
                                });
                              }}
                              className="interval-slider"
                            />
                            <div className="interval-display">
                              <span className="interval-value">{bulkMessageData.intervalMaxSeconds || 120}s</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="interval-summary">
                          <span className="summary-icon">🎯</span>
                          <span className="summary-text">
                            Cada mensagem será enviada entre <strong>{bulkMessageData.intervalMinSeconds || 61}</strong> e <strong>{bulkMessageData.intervalMaxSeconds || 120}</strong> segundos da anterior
                          </span>
                        </div>
                        
                        <span className="form-hint">
                          ⚠️ Intervalo recomendado: 80-140s para evitar bloqueios do WhatsApp
                        </span>
                      </div>
                      
                      <div className="estimated-time">
                        <strong>Tempo estimado (média):</strong> {Math.ceil((selectedRecipients.length * ((bulkMessageData.intervalMinSeconds || 61) + (bulkMessageData.intervalMaxSeconds || 120)) / 2) / 60)} minutos
                      </div>
                    </div>

                    {/* Botão de Envio */}
                    <button 
                      type="submit" 
                      className="btn-send-bulk" 
                      disabled={selectedRecipients.length === 0 || !bulkMessageData.instanceId}
                    >
                      🚀 Iniciar Envio em Massa ({selectedRecipients.length} destinatários)
                    </button>
                  </form>

                  {/* Progresso de Envio */}
                  {sendingProgress && (
                    <div className="progress-panel">
                      <h3 className="card-title">📊 Progresso do Envio</h3>
                      <div className="progress-info">
                        <div className="progress-stats">
                          <div className="stat">
                            <span className="stat-label">Status:</span>
                            <span className="stat-value">{sendingProgress.state}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Processados:</span>
                            <span className="stat-value">{sendingProgress.processedRecipients || 0} / {sendingProgress.totalRecipients}</span>
                          </div>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${sendingProgress.progress || 0}%` }}
                          >
                            <span className="progress-text">{sendingProgress.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estatísticas Gerais */}
                <div className="stats-overview">
                  <h3 className="section-subtitle">📈 Estatísticas Gerais</h3>
                  <div className="stats-grid-compact">
                    <div className="stat-card-compact">
                      <div className="stat-icon-compact">📨</div>
                      <div className="stat-value-compact">{metrics.sent + metrics.delivered}</div>
                      <div className="stat-label-compact">Total Enviado</div>
                    </div>
                    <div className="stat-card-compact">
                      <div className="stat-icon-compact">✅</div>
                      <div className="stat-value-compact">{metrics.delivered}</div>
                      <div className="stat-label-compact">Entregues</div>
                    </div>
                    <div className="stat-card-compact">
                      <div className="stat-icon-compact">❌</div>
                      <div className="stat-value-compact">{metrics.failed}</div>
                      <div className="stat-label-compact">Falhas</div>
                    </div>
                    <div className="stat-card-compact">
                      <div className="stat-icon-compact">📊</div>
                      <div className="stat-value-compact">{metrics.deliveryRate}%</div>
                      <div className="stat-label-compact">Taxa Sucesso</div>
                    </div>
                  </div>
                </div>

                {/* Guia Rápido */}
                <div className="quick-guide">
                  <h3 className="guide-title">💡 Guia Rápido</h3>
                  <div className="guide-steps">
                    <div className="guide-step">
                      <span className="step-number">1</span>
                      <p>Escolha o tipo de mensagem que deseja enviar</p>
                    </div>
                    <div className="guide-step">
                      <span className="step-number">2</span>
                      <p>Preencha o conteúdo da mensagem</p>
                    </div>
                    <div className="guide-step">
                      <span className="step-number">3</span>
                      <p>Selecione os grupos ou contatos destinatários</p>
                    </div>
                    <div className="guide-step">
                      <span className="step-number">4</span>
                      <p>Configure o intervalo entre envios (61-300s)</p>
                    </div>
                    <div className="guide-step">
                      <span className="step-number">5</span>
                      <p>Clique em "Iniciar Envio" e acompanhe o progresso</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            {activeTab === 'contatos' && (
            <section className="contacts-section">
              <div className="section-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">👥 Gerenciamento de Contatos</h2>
                    <p className="section-subtitle">Organize e gerencie seus contatos WhatsApp</p>
                  </div>
                  <div className="header-actions">
                    <button className="btn-secondary" onClick={() => openModal('contacts')}>
                      ➕ Novo Contato
                    </button>
                  </div>
                </div>

                    <div className="stats-footer">
                      <button className="btn-view-stats" onClick={() => navigateTo('/messages')}>
                        Ver Relatório Completo →
                      </button>
                    </div>
                
                {/* Lista de Contatos */}
                <div className="contacts-list">
                  <p className="empty-state">� Lista de contatos será exibida aqui</p>
                </div>
              </div>
            </section>
            )}

            {/* Aba Começar Agora - Ações Rápidas + Indicadores + Atividade */}
            {activeTab === 'comecar' && (
            <div className="dashboard-content">
              {/* Indicadores no topo */}
              {/* A própria seção de métricas é renderizada acima quando activeTab === 'comecar' */}
              <section className="quick-actions-section">
                <div className="section-card">
                  <h2 className="section-title">▸ Ações Rápidas</h2>
                  <div className="quick-actions-grid">
                    <button className="action-card action-primary" onClick={() => openModal('campaigns')}>
                      <div className="action-icon">📢</div>
                      <div className="action-content">
                        <h3>Nova Campanha</h3>
                        <p>Criar campanha de disparo em massa</p>
                      </div>
                    </button>

                    <button className="action-card action-success" onClick={() => openModal('contacts')}>
                      <div className="action-icon">👥</div>
                      <div className="action-content">
                        <h3>Adicionar Contato</h3>
                        <p>Cadastrar novo contato</p>
                      </div>
                    </button>

                    <button className="action-card action-info" onClick={() => openModal('instances')}>
                      <div className="action-icon">📱</div>
                      <div className="action-content">
                        <h3>Nova Instância</h3>
                        <p>Conectar dispositivo WhatsApp</p>
                      </div>
                    </button>

                    <button className="action-card action-purple" onClick={() => openModal('send-message')}>
                      <div className="action-icon">�</div>
                      <div className="action-content">
                        <h3>Enviar Mensagem</h3>
                        <p>Envio rápido de mensagem</p>
                      </div>
                    </button>

                    <button className="action-card action-teal" onClick={() => setActiveTab('conta')}>
                      <div className="action-icon">💳</div>
                      <div className="action-content">
                        <h3>Assinatura</h3>
                        <p>Planos e faturamento</p>
                      </div>
                    </button>
                  </div>
                </div>
              </section>
              {/* Atividade Recente abaixo das ações */}
              <div className="dashboard-row">
                <section className="data-section">
                  <div className="section-card">
                    <h2 className="section-title">◈ Atividade Recente</h2>
                    <div className="activity-list">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">{activity.icon}</div>
                          <div className="activity-content">
                            <p className="activity-message">{activity.message}</p>
                            <span className="activity-time">{activity.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
            )}

            {activeTab === 'mensagens' && (
            <section className="messages-section">
              <div className="section-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">💬 Sistema de Mensagens WhatsApp</h2>
                    <p className="section-subtitle">Envie texto, imagens, vídeos, áudios e documentos</p>
                  </div>
                  <button className="btn-link" onClick={() => navigateTo('/messages')}>
                    Ver Todas as Mensagens →
                  </button>
                </div>
              </div>
            </section>
            )}

            {/* Contatos */}
            {activeTab === 'contatos' && (
              <section className="contacts-section">
                <div className="section-card">
                  <div className="section-header-row">
                    <div>
                      <h2 className="section-title">👥 Gerenciamento de Contatos</h2>
                      <p className="section-subtitle">Gerencie seus contatos, crie listas e importe em massa</p>
                    </div>
                    <div className="section-actions">
                      <button className="btn-small-primary" onClick={() => openModal('contacts')}>
                        + Novo Contato
                      </button>
                      <button className="btn-small-secondary" onClick={handleImportCSV}>
                        📥 Importar CSV
                      </button>
                    </div>
                  </div>

                  {/* Estatísticas de Contatos */}
                  <div className="contacts-stats-grid">
                    <div className="stat-card stat-total">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <div className="stat-value">{metrics.contacts}</div>
                        <div className="stat-label">Total de Contatos</div>
                      </div>
                    </div>
                    <div className="stat-card stat-active">
                      <div className="stat-icon">✅</div>
                      <div className="stat-content">
                        <div className="stat-value">{Math.floor(metrics.contacts * 0.85)}</div>
                        <div className="stat-label">Ativos</div>
                      </div>
                    </div>
                    <div className="stat-card stat-blocked">
                      <div className="stat-icon">🚫</div>
                      <div className="stat-content">
                        <div className="stat-value">{Math.floor(metrics.contacts * 0.05)}</div>
                        <div className="stat-label">Bloqueados</div>
                      </div>
                    </div>
                    <div className="stat-card stat-lists">
                      <div className="stat-icon">📋</div>
                      <div className="stat-content">
                        <div className="stat-value">0</div>
                        <div className="stat-label">Listas</div>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Pesquisa e Filtros */}
                  <div className="contacts-toolbar">
                    <div className="search-box">
                      <input 
                        type="text" 
                        className="search-input"
                        placeholder="🔍 Buscar por nome, telefone ou email..."
                      />
                    </div>
                    <div className="filter-buttons">
                      <button className={`filter-btn ${contactsStatusFilter==='all'?'active':''}`} onClick={() => { setContactsStatusFilter('all'); loadDashboardData(); }}>Todos</button>
                      <button className={`filter-btn ${contactsStatusFilter==='active'?'active':''}`} onClick={() => { setContactsStatusFilter('active'); loadDashboardData(); }}>Ativos</button>
                      <button className={`filter-btn ${contactsStatusFilter==='blocked'?'active':''}`} onClick={() => { setContactsStatusFilter('blocked'); loadDashboardData(); }}>Bloqueados</button>
                      <button className={`filter-btn ${contactsStatusFilter==='noname'?'active':''}`} onClick={() => { setContactsStatusFilter('noname'); loadDashboardData(); }}>Sem Nome</button>
                    </div>
                  </div>

                  {/* Lista de Contatos */}
                  {contacts.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <h3>Nenhum contato cadastrado</h3>
                      <p>Comece adicionando seus primeiros contatos ou importe uma lista em CSV</p>
                      <div className="empty-actions">
                        <button className="btn-primary" onClick={() => openModal('contacts')}>
                          + Adicionar Primeiro Contato
                        </button>
                        <button className="btn-secondary" onClick={handleImportCSV}>
                          📥 Importar CSV
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="contacts-table">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>
                              <input type="checkbox" />
                            </th>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Email</th>
                            <th>Tags</th>
                            <th>Status</th>
                            <th>Cadastro</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((contact: any) => (
                            <tr key={contact.id}>
                              <td>
                                <input type="checkbox" />
                              </td>
                              <td>
                                <div className="contact-name">
                                  <div className="contact-avatar">
                                    {(contact.name || 'S')[0].toUpperCase()}
                                  </div>
                                  <strong>{contact.name || 'Sem nome'}</strong>
                                </div>
                              </td>
                              <td>
                                <span className="contact-phone">{contact.phone}</span>
                              </td>
                              <td>
                                <span className="contact-email">{contact.email || '—'}</span>
                              </td>
                              <td>
                                <div className="tags-list">
                                  {contact.tags && contact.tags.length > 0 ? (
                                    contact.tags.map((tag: string, idx: number) => (
                                      <span key={idx} className="tag">{tag}</span>
                                    ))
                                  ) : (
                                    <span className="no-tags">Sem tags</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge ${contact.isBlocked ? 'blocked' : 'active'}`}>
                                  {contact.isBlocked ? '🚫 Bloqueado' : '✅ Ativo'}
                                </span>
                              </td>
                              <td>
                                <span className="contact-date">
                                  {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button className="btn-icon" title="Editar" onClick={() => handleEditContact(contact)}>✏️</button>
                                  <button className="btn-icon" title="Tags" onClick={() => handleEditTags(contact)}>🏷️</button>
                                  <button className="btn-icon" title="Adicionar à lista" onClick={() => handleAddToList(contact)}>📋</button>
                                  <button className="btn-icon" title={contact.isBlocked ? 'Desbloquear' : 'Bloquear'} onClick={() => handleToggleBlock(contact)}>
                                    {contact.isBlocked ? '🔓' : '🔒'}
                                  </button>
                                  <button 
                                    className="btn-icon" 
                                    title="Enviar mensagem"
                                    onClick={() => {
                                      setFormData({ ...formData, messageTo: contact.phone });
                                      openModal('send-message');
                                    }}
                                  >
                                    💬
                                  </button>
                                  <button 
                                    className="btn-icon danger" 
                                    title="Excluir"
                                    onClick={() => handleDeleteContact(contact.id)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Paginação */}
                      <div className="pagination">
                        <button className="pagination-btn" disabled>← Anterior</button>
                        <div className="pagination-info">
                          Mostrando <strong>1-{contacts.length}</strong> de <strong>{metrics.contacts}</strong> contatos
                        </div>
                        <button className="pagination-btn" disabled>Próximo →</button>
                      </div>
                    </div>
                  )}

                  {/* Ações em Massa */}
                  <div className="bulk-actions">
                    <div className="bulk-actions-info">
                      <span>0 contatos selecionados</span>
                    </div>
                    <div className="bulk-actions-buttons">
                      <button className="btn-bulk" disabled>Adicionar Tags</button>
                      <button className="btn-bulk" disabled>Adicionar à Lista</button>
                      <button className="btn-bulk" disabled>Bloquear</button>
                      <button className="btn-bulk danger" disabled>Excluir Selecionados</button>
                    </div>
                  </div>

                  {/* Guia Rápido */}
                  <div className="quick-guide">
                    <div className="guide-header">
                      <h3 className="guide-title">💡 Guia Rápido</h3>
                      <button 
                        className="btn-guide-help"
                        onClick={() => alert('📄 Formato CSV:\n\nColunas obrigatórias:\n• name (nome do contato)\n• phone (ex: 5511999999999)\n\nColunas opcionais:\n• email\n• company\n\nExemplo:\nname,phone,email,company\nJoão Silva,5511999999999,joao@email.com,Empresa ABC\n\n✓ Use vírgula como separador\n✓ Primeira linha: cabeçalho\n✓ Telefone sem espaços\n\nVeja o arquivo: exemplo-importacao-contatos.csv')}
                        title="Ver instruções detalhadas"
                      >
                        ❓ Como importar CSV
                      </button>
                    </div>
                    <div className="guide-grid">
                      <div className="guide-item">
                        <div className="guide-icon">➕</div>
                        <div className="guide-content">
                          <h4>Adicionar Contato</h4>
                          <p>Clique em "+ Novo Contato" para cadastrar manualmente</p>
                        </div>
                      </div>
                      <div className="guide-item">
                        <div className="guide-icon">📥</div>
                        <div className="guide-content">
                          <h4>Importar CSV</h4>
                          <p>Importe milhares de contatos de uma só vez. Formato: name,phone,email</p>
                        </div>
                      </div>
                      <div className="guide-item">
                        <div className="guide-icon">🏷️</div>
                        <div className="guide-content">
                          <h4>Organizar com Tags</h4>
                          <p>Use tags para categorizar seus contatos</p>
                        </div>
                      </div>
                      <div className="guide-item">
                        <div className="guide-icon">📋</div>
                        <div className="guide-content">
                          <h4>Criar Listas</h4>
                          <p>Agrupe contatos em listas para campanhas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Campanhas */}
            {activeTab === 'campanhas' && (
              <div className="dashboard-row">
                <section className="data-section" style={{ flex: 1 }}>
                  <div className="section-card">
                    <div className="section-header-row">
                      <h2 className="section-title">◆ Campanhas de Marketing</h2>
                      <div className="section-actions">
                        <button className="btn-small-primary" onClick={() => openModal('campaigns')}>
                          + Nova Campanha
                        </button>
                      </div>
                    </div>
                    
                    {campaigns.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📢</div>
                        <h3>Nenhuma campanha criada</h3>
                        <p>Crie campanhas para enviar mensagens em massa para seus contatos</p>
                        <button className="btn-primary" onClick={() => openModal('campaigns')}>
                          + Criar Primeira Campanha
                        </button>
                      </div>
                    ) : (
                      <div className="campaigns-grid">
                        {campaigns.map((campaign: any) => {
                          const statusInfo = getCampaignStatusInfo(campaign.status);
                          const progress = campaign._count?.recipients 
                            ? Math.round((campaign.sentCount || 0) / campaign._count.recipients * 100) 
                            : 0;
                          
                          return (
                            <div key={campaign.id} className="campaign-card">
                              <div className="campaign-header">
                                <div className="campaign-icon">📢</div>
                                <div className="campaign-info">
                                  <h3 className="campaign-name">{campaign.name}</h3>
                                  <div className="campaign-meta">
                                    <span className="campaign-instance">
                                      📱 {campaign.instance?.name || 'Sem instância'}
                                    </span>
                                    <span className="campaign-date">
                                      📅 {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                                <div className={`campaign-status-badge ${statusInfo.class}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </div>
                              </div>
                              
                              <div className="campaign-message">
                                <p>{campaign.message?.substring(0, 100)}{campaign.message?.length > 100 ? '...' : ''}</p>
                              </div>
                              
                              {campaign._count?.recipients > 0 && (
                                <div className="campaign-stats">
                                  <div className="stat-row">
                                    <span className="stat-label">Destinatários:</span>
                                    <span className="stat-value">{campaign._count.recipients}</span>
                                  </div>
                                  {campaign.status !== 'DRAFT' && (
                                    <>
                                      <div className="campaign-progress">
                                        <div className="progress-bar">
                                          <div 
                                            className="progress-fill" 
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <span className="progress-text">{progress}%</span>
                                      </div>
                                      <div className="stats-grid">
                                        <div className="mini-stat">
                                          <span className="mini-stat-icon">✓</span>
                                          <span className="mini-stat-label">Enviadas</span>
                                          <span className="mini-stat-value">{campaign.sentCount || 0}</span>
                                        </div>
                                        <div className="mini-stat">
                                          <span className="mini-stat-icon">✓✓</span>
                                          <span className="mini-stat-label">Entregues</span>
                                          <span className="mini-stat-value">{campaign.deliveredCount || 0}</span>
                                        </div>
                                        <div className="mini-stat">
                                          <span className="mini-stat-icon">✗</span>
                                          <span className="mini-stat-label">Falhas</span>
                                          <span className="mini-stat-value">{campaign.failedCount || 0}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                              
                              <div className="campaign-actions">
                                {campaign.status === 'DRAFT' && (
                                  <>
                                    <button 
                                      className="btn-chip success"
                                      onClick={() => handleStartCampaign(campaign.id)}
                                      title="Iniciar Campanha"
                                    >
                                      ▶ Iniciar
                                    </button>
                                    <button 
                                      className="btn-chip primary"
                                      onClick={() => handleEditCampaign(campaign)}
                                      title="Editar"
                                    >
                                      ✏️ Editar
                                    </button>
                                  </>
                                )}
                                {campaign.status === 'RUNNING' && (
                                  <button 
                                    className="btn-chip warning"
                                    onClick={() => handlePauseCampaign(campaign.id)}
                                    title="Pausar"
                                  >
                                    ⏸ Pausar
                                  </button>
                                )}
                                {campaign.status === 'PAUSED' && (
                                  <button 
                                    className="btn-chip success"
                                    onClick={() => handleResumeCampaign(campaign.id)}
                                    title="Retomar"
                                  >
                                    ▶ Retomar
                                  </button>
                                )}
                                <button 
                                  className="btn-chip info"
                                  onClick={() => handleViewCampaignStats(campaign)}
                                  title="Ver Estatísticas"
                                >
                                  📊 Stats
                                </button>
                                {['DRAFT', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                                  <button 
                                    className="btn-chip danger"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                    title="Excluir"
                                  >
                                    🗑️ Excluir
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Instâncias */}
            {activeTab === 'instancias' && (
              <div className="dashboard-row">
                <section className="data-section">
                  <div className="section-card">
                    <div className="section-header-row">
                      <h2 className="section-title">■ Instâncias WhatsApp</h2>
                      <div className="section-actions">
                        <button className="btn-small-primary" onClick={() => openModal('instances')}>
                          + Nova Instância
                        </button>
                        <button className="btn-link" onClick={() => navigateTo('/whatsapp')}>
                          Ver Todas →
                        </button>
                      </div>
                    </div>
                    <div className="data-list">
                      {instances.length === 0 ? (
                        <div className="empty-card">
                          <p>Nenhuma instância configurada</p>
                          <button className="btn-small-primary" onClick={() => openModal('instances')}>
                            + Adicionar Instância
                          </button>
                        </div>
                      ) : (
                        instances.map((instance: any) => (
                          <div key={instance.id} className="list-item">
                            <div className="item-avatar">■</div>
                            <div className="item-info">
                              <h4>{instance.name}</h4>
                              <p>
                                {instance.status === 'CONNECTED' ? '✓ Conectado' : 
                                 instance.status === 'CONNECTING' ? '◐ Conectando' : 
                                 instance.status === 'QR_CODE' ? '📷 Aguardando QR' :
                                 '○ Desconectado'}
                              </p>
                            </div>
                            <div className="instance-actions">
                              {instance.status !== 'CONNECTED' && (
                                <button className="btn-chip" title="Conectar" onClick={() => handleConnectInstance(instance.id)}>Conectar</button>
                              )}
                              <button className="btn-chip" title="QR Code" onClick={() => openQRModal(instance)}>QR Code</button>
                              <button className="btn-chip" title="Editar" onClick={() => openEditInstance(instance)}>Editar</button>
                              <button className="btn-chip danger" title="Excluir" onClick={() => handleDeleteInstance(instance.id)}>Excluir</button>
                              {instance.status === 'CONNECTED' && (
                                <button className="btn-chip warning" title="Desconectar" onClick={() => handleDisconnectInstance(instance.id)}>Desconectar</button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Envio SMS - EM DESENVOLVIMENTO */}
            {activeTab === 'sms' && (
              <div className="sms-container">
                <section className="sms-section">
                  <div className="sms-dev-card">
                    <div className="sms-dev-header">
                      <div className="sms-dev-icon">
                        <div className="sms-pulse-1"></div>
                        <div className="sms-pulse-2"></div>
                        <div className="sms-pulse-3"></div>
                        <span className="sms-icon-text">📱</span>
                      </div>
                      <h1 className="sms-dev-title">Envio de SMS</h1>
                      <div className="sms-dev-badge">
                        <span className="sms-badge-dot"></span>
                        EM DESENVOLVIMENTO
                      </div>
                    </div>

                    <div className="sms-dev-content">
                      <div className="sms-animation-container">
                        <div className="sms-phone-mockup">
                          <div className="sms-phone-screen">
                            <div className="sms-message sms-message-1">
                              <div className="sms-message-bubble">Olá! 👋</div>
                            </div>
                            <div className="sms-message sms-message-2">
                              <div className="sms-message-bubble">Sua mensagem foi enviada!</div>
                            </div>
                            <div className="sms-message sms-message-3">
                              <div className="sms-message-bubble">✓ Entregue</div>
                            </div>
                          </div>
                          <div className="sms-phone-button"></div>
                        </div>

                        <div className="sms-features-preview">
                          <div className="sms-feature-item sms-feature-1">
                            <div className="sms-feature-icon">⚡</div>
                            <div className="sms-feature-text">
                              <h3>Envio Rápido</h3>
                              <p>Mensagens instantâneas para seus clientes</p>
                            </div>
                          </div>
                          <div className="sms-feature-item sms-feature-2">
                            <div className="sms-feature-icon">📊</div>
                            <div className="sms-feature-text">
                              <h3>Relatórios Detalhados</h3>
                              <p>Acompanhe todas as entregas em tempo real</p>
                            </div>
                          </div>
                          <div className="sms-feature-item sms-feature-3">
                            <div className="sms-feature-icon">🎯</div>
                            <div className="sms-feature-text">
                              <h3>Segmentação Inteligente</h3>
                              <p>Envie para o público certo no momento certo</p>
                            </div>
                          </div>
                          <div className="sms-feature-item sms-feature-4">
                            <div className="sms-feature-icon">💰</div>
                            <div className="sms-feature-text">
                              <h3>Preços Competitivos</h3>
                              <p>Melhor custo-benefício do mercado</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="sms-dev-info">
                        <div className="sms-info-box">
                          <h2>🚀 Novidade em Breve!</h2>
                          <p>
                            Estamos trabalhando para trazer a funcionalidade completa de <strong>Envio de SMS</strong> para você.
                            Em breve, você poderá enviar mensagens SMS em massa, criar campanhas automatizadas e muito mais!
                          </p>
                          <div className="sms-coming-features">
                            <div className="sms-feature-badge">✓ Envio em Massa</div>
                            <div className="sms-feature-badge">✓ Agendamento</div>
                            <div className="sms-feature-badge">✓ Templates Personalizados</div>
                            <div className="sms-feature-badge">✓ API Completa</div>
                            <div className="sms-feature-badge">✓ Relatórios Avançados</div>
                            <div className="sms-feature-badge">✓ Integração WhatsApp</div>
                          </div>
                        </div>

                        <div className="sms-notify-box">
                          <h3>📧 Quer ser notificado?</h3>
                          <p>Deixe seu e-mail para receber atualizações sobre o lançamento desta funcionalidade</p>
                          <div className="sms-notify-form">
                            <input 
                              type="email" 
                              className="sms-notify-input" 
                              placeholder="seu@email.com"
                              disabled
                            />
                            <button className="sms-notify-button" disabled>
                              Em breve 🔔
                            </button>
                          </div>
                          <small className="sms-notify-hint">Funcionalidade de notificação será habilitada em breve</small>
                        </div>
                      </div>

                      <div className="sms-dev-progress">
                        <h3>📅 Progresso do Desenvolvimento</h3>
                        <div className="sms-progress-list">
                          <div className="sms-progress-item sms-progress-done">
                            <span className="sms-progress-check">✓</span>
                            <span className="sms-progress-text">Pesquisa de Mercado</span>
                          </div>
                          <div className="sms-progress-item sms-progress-done">
                            <span className="sms-progress-check">✓</span>
                            <span className="sms-progress-text">Design da Interface</span>
                          </div>
                          <div className="sms-progress-item sms-progress-current">
                            <span className="sms-progress-check">⏳</span>
                            <span className="sms-progress-text">Integração com Provedores SMS</span>
                          </div>
                          <div className="sms-progress-item">
                            <span className="sms-progress-check">○</span>
                            <span className="sms-progress-text">Testes de Qualidade</span>
                          </div>
                          <div className="sms-progress-item">
                            <span className="sms-progress-check">○</span>
                            <span className="sms-progress-text">Lançamento Oficial</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Conta - Configurações do Usuário */}
            {activeTab === 'conta' && (
              <div className="account-container">
                {/* Perfil do Usuário */}
                <section className="account-section">
                  <div className="section-card">
                    <div className="section-header-row">
                      <div>
                        <h2 className="section-title">👤 Perfil do Usuário</h2>
                        <p className="section-subtitle">Gerencie suas informações pessoais</p>
                      </div>
                    </div>
                    
                    <div className="account-grid">
                      <div className="account-card">
                        <h3 className="account-card-title">✏️ Editar Perfil</h3>
                        <form className="account-form" onSubmit={handleUpdateProfile}>
                          <div className="form-group">
                            <label className="form-label">Nome Completo</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={profileForm.name} 
                              onChange={(e)=>setProfileForm({...profileForm, name: e.target.value})} 
                              placeholder="Seu nome completo"
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Email</label>
                            <input 
                              type="email" 
                              className="form-input" 
                              value={profileForm.email} 
                              readOnly 
                              title="Edição de email disponível em breve"
                              style={{ opacity: 0.7, cursor: 'not-allowed' }}
                            />
                            <small className="form-hint">🔒 A alteração de e-mail será habilitada em breve</small>
                          </div>
                          <button type="submit" className="btn-primary btn-save-profile">
                            💾 Salvar Alterações
                          </button>
                        </form>
                      </div>

                      <div className="account-card">
                        <h3 className="account-card-title">📊 Informações da Conta</h3>
                        <div className="account-info-list">
                          <div className="info-item">
                            <span className="info-label">Plano Atual:</span>
                            <span className="info-value info-highlight">{planName}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Status:</span>
                            <span className="info-value info-badge info-badge-active">✓ Ativa</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Membro desde:</span>
                            <span className="info-value">{auth?.user?.createdAt ? new Date(auth.user.createdAt).toLocaleDateString('pt-BR') : '—'}</span>
                          </div>
                        </div>
                        
                        <div className="account-divider"></div>
                        
                        <h3 className="account-card-title">🚪 Sessão</h3>
                        <button className="btn-logout" onClick={() => auth?.logout?.()}>
                          ⚠️ Sair da Conta
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Planos e Assinaturas */}
                <section className="subscription-section">
                  <div className="section-card">
                    <div className="section-header-row">
                      <div>
                        <h2 className="section-title">💳 Planos e Assinatura</h2>
                        <p className="section-subtitle">Escolha o plano ideal para seu negócio</p>
                      </div>
                      <button className="btn-link" onClick={() => navigateTo('/plans')}>
                        Ver Detalhes Completos →
                      </button>
                    </div>
                    
                    <div className="subscription-current">
                      <div className="current-plan-banner">
                        <div className="current-plan-icon">🎯</div>
                        <div className="current-plan-info">
                          <h4>Seu Plano Atual: <strong>{planName}</strong></h4>
                          <p>Renovação automática • Próximo ciclo em 23 dias</p>
                        </div>
                        <button className="btn-manage-subscription" onClick={() => alert('Gerenciar assinatura - Em breve!')}>
                          ⚙️ Gerenciar
                        </button>
                      </div>
                      
                      <div className="subscription-stats">
                        <div className="subscription-stat-item">
                          <div className="stat-label">Mensagens Usadas</div>
                          <div className="stat-value">{metrics.sent} / {planName === 'Gratuito' ? '100' : planName === 'Iniciante' ? '1.000' : '∞'}</div>
                          <div className="stat-bar">
                            <div className="stat-bar-fill" style={{ width: `${Math.min((metrics.sent / 100) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="subscription-stat-item">
                          <div className="stat-label">Contatos</div>
                          <div className="stat-value">{metrics.contacts} / {planName === 'Gratuito' ? '50' : planName === 'Iniciante' ? '500' : '∞'}</div>
                          <div className="stat-bar">
                            <div className="stat-bar-fill" style={{ width: `${Math.min((metrics.contacts / 50) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="subscription-stat-item">
                          <div className="stat-label">Instâncias</div>
                          <div className="stat-value">{metrics.instances} / {planName === 'Gratuito' ? '1' : planName === 'Iniciante' ? '2' : '∞'}</div>
                          <div className="stat-bar">
                            <div className="stat-bar-fill" style={{ width: `${Math.min((metrics.instances / 1) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="plans-grid">
                      {/* Plano Free */}
                      <div className={`plan-card plan-free ${planName === 'Gratuito' ? 'plan-active' : ''}`}>
                        {planName === 'Gratuito' && <div className="plan-current-badge">✓ Plano Atual</div>}
                        <div className="plan-header">
                          <h3 className="plan-name">Gratuito</h3>
                          <div className="plan-price">
                            <span className="price-value">R$ 0</span>
                            <span className="price-period">/mês</span>
                          </div>
                        </div>
                        <ul className="plan-features">
                          <li>✓ 100 mensagens/mês</li>
                          <li>✓ 50 contatos</li>
                          <li>✓ 1 instância WhatsApp</li>
                          <li>✓ Suporte comunidade</li>
                        </ul>
                        <button 
                          className="plan-button plan-button-free" 
                          disabled={planName === 'Gratuito'}
                          onClick={() => planName !== 'Gratuito' ? alert('Downgrade para Gratuito - Em breve!') : null}
                        >
                          {planName === 'Gratuito' ? '✓ Plano Atual' : 'Voltar ao Gratuito'}
                        </button>
                      </div>

                      {/* Plano Starter */}
                      <div className={`plan-card plan-starter ${planName === 'Iniciante' ? 'plan-active' : ''}`}>
                        {planName === 'Iniciante' && <div className="plan-current-badge">✓ Plano Atual</div>}
                        <div className="plan-header">
                          <h3 className="plan-name">Iniciante</h3>
                          <div className="plan-price">
                            <span className="price-value">R$ 49,90</span>
                            <span className="price-period">/mês</span>
                          </div>
                        </div>
                        <ul className="plan-features">
                          <li>✓ 1.000 mensagens/mês</li>
                          <li>✓ 500 contatos</li>
                          <li>✓ 2 instâncias WhatsApp</li>
                          <li>✓ Templates de mensagens</li>
                          <li>✓ Analytics básico</li>
                          <li>✓ Suporte por email</li>
                        </ul>
                        <button 
                          className="plan-button plan-button-starter" 
                          disabled={planName === 'Iniciante'}
                          onClick={() => planName !== 'Iniciante' ? alert('Upgrade/Downgrade para Iniciante - Em breve!') : null}
                        >
                          {planName === 'Iniciante' ? '✓ Plano Atual' : planName === 'Gratuito' ? 'Fazer Upgrade' : 'Fazer Downgrade'}
                        </button>
                      </div>

                      {/* Plano Professional */}
                      <div className={`plan-card plan-professional ${planName === 'Profissional' ? 'plan-active' : ''}`}>
                        <div className="plan-badge">⭐ Mais Popular</div>
                        {planName === 'Profissional' && <div className="plan-current-badge">✓ Plano Atual</div>}
                        <div className="plan-header">
                          <h3 className="plan-name">Profissional</h3>
                          <div className="plan-price">
                            <span className="price-value">R$ 99,90</span>
                            <span className="price-period">/mês</span>
                          </div>
                        </div>
                        <ul className="plan-features">
                          <li>✓ 5.000 mensagens/mês</li>
                          <li>✓ 2.000 contatos</li>
                          <li>✓ 5 instâncias WhatsApp</li>
                          <li>✓ Templates ilimitados</li>
                          <li>✓ Analytics avançado</li>
                          <li>✓ Automações</li>
                          <li>✓ Webhooks</li>
                          <li>✓ Suporte prioritário</li>
                        </ul>
                        <button 
                          className="plan-button plan-button-professional" 
                          disabled={planName === 'Profissional'}
                          onClick={() => planName !== 'Profissional' ? alert('Upgrade/Downgrade para Profissional - Em breve!') : null}
                        >
                          {planName === 'Profissional' ? '✓ Plano Atual' : ['Gratuito', 'Iniciante'].includes(planName) ? 'Fazer Upgrade' : 'Fazer Downgrade'}
                        </button>
                      </div>

                      {/* Plano Enterprise */}
                      <div className={`plan-card plan-enterprise ${planName === 'Empresarial' ? 'plan-active' : ''}`}>
                        {planName === 'Empresarial' && <div className="plan-current-badge">✓ Plano Atual</div>}
                        <div className="plan-header">
                          <h3 className="plan-name">Empresarial</h3>
                          <div className="plan-price">
                            <span className="price-value">R$ 299,90</span>
                            <span className="price-period">/mês</span>
                          </div>
                        </div>
                        <ul className="plan-features">
                          <li>✓ Mensagens ilimitadas</li>
                          <li>✓ Contatos ilimitados</li>
                          <li>✓ Instâncias ilimitadas</li>
                          <li>✓ Tudo do Profissional</li>
                          <li>✓ API completa</li>
                          <li>✓ Custom branding</li>
                          <li>✓ Conta dedicada</li>
                          <li>✓ Suporte 24/7</li>
                        </ul>
                        <button 
                          className="plan-button plan-button-enterprise" 
                          disabled={planName === 'Empresarial'}
                          onClick={() => planName !== 'Empresarial' ? navigateTo('/contact-sales') : null}
                        >
                          {planName === 'Empresarial' ? '✓ Plano Atual' : 'Falar com Vendas'}
                        </button>
                      </div>
                    </div>

                    <div className="plans-footer">
                      <div className="plans-footer-content">
                        <div className="footer-highlight">
                          <span className="highlight-icon">💡</span>
                          <div>
                            <strong>Economize até 17%</strong> escolhendo o plano anual
                          </div>
                        </div>
                        <button className="btn-link" onClick={() => alert('Faturamento e histórico - Em breve!')}>
                          Ver Histórico de Faturamento →
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Logs */}
            {activeTab === 'logs' && (
              <section className="logs-section">
                <div className="section-card">
                  <div className="section-header-row">
                    <div>
                      <h2 className="section-title">🧾 Logs do Sistema</h2>
                      <p className="section-subtitle">Versões, atualizações e erros recentes</p>
                    </div>
                  </div>
                  {logsLoading && <LoadingSpinner message="Carregando logs..." />}
                  {logsError && <ErrorMessage message={logsError} onRetry={() => setActiveTab('logs')} />}
                  {!logsLoading && !logsError && (
                    <div className="logs-content">
                      <div className="logs-summary">
                        <div className="log-badge">
                          <strong>Web</strong> v{logsState?.webVersion || '—'}
                        </div>
                        <div className="log-badge">
                          <strong>API</strong> v{logsState?.apiVersion || '—'}
                        </div>
                        <div className="log-updated">Atualizado em: {logsState?.updatedAt ? new Date(logsState.updatedAt).toLocaleString('pt-BR') : '—'}</div>
                      </div>
                      <pre className="logs-pre">{logsState?.changelog || 'Sem changelog disponível.'}</pre>
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
        )}

        {/* Modals Component */}
        <DashboardModals
          activeModal={activeModal}
          formData={formData}
          error={error}
          setFormData={setFormData}
          closeModal={closeModal}
          handleCreateContact={handleCreateContact}
          handleCreateCampaign={handleCreateCampaign}
          handleCreateInstance={handleCreateInstance}
          handleSendMessage={handleSendMessage}
          metrics={metrics}
          planName={planName}
        />

        {/* Modal: Editar Instância */}
        {showEditInstanceModal && selectedInstance && (
          <div className="modal-overlay" onClick={() => setShowEditInstanceModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar Instância</h3>
                <button className="modal-close" onClick={() => setShowEditInstanceModal(false)}>✕</button>
              </div>
              <form onSubmit={handleEditInstanceSubmit}>
                <div className="modal-body">
                  {error && <div className="error-alert">{error}</div>}
                  <div className="form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={formData.instanceName}
                      onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="tel"
                      value={formData.instancePhone}
                      onChange={(e) => setFormData({ ...formData, instancePhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditInstanceModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: QR Code da Instância */}
        {showQRModal && selectedInstance && (
          <div className="modal-overlay" onClick={() => { 
            if ((window as any).__qrCheckInterval) {
              clearInterval((window as any).__qrCheckInterval);
            }
            setShowQRModal(false); 
            setSelectedInstance(null); 
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>QR Code — {selectedInstance.name}</h3>
                <button className="modal-close" onClick={() => { 
                  if ((window as any).__qrCheckInterval) {
                    clearInterval((window as any).__qrCheckInterval);
                  }
                  setShowQRModal(false); 
                  setSelectedInstance(null); 
                }}>✕</button>
              </div>
              <div className="modal-body">
                {qrLoading ? (
                  <LoadingSpinner message="Gerando QR Code..." />
                ) : qrData?.qrCode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <img src={qrData.qrCode} alt="QR Code" style={{ width: 280, height: 280 }} />
                    <p style={{ color: '#00ff88', textAlign: 'center' }}>
                      📱 Abra o WhatsApp → Dispositivos conectados → Conectar<br />
                      Aponte a câmera para o QR Code acima
                    </p>
                    <div className="qr-status-checking" style={{ 
                      color: '#ffaa00', 
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      padding: '0.5rem',
                      background: 'rgba(255, 170, 0, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 170, 0, 0.3)'
                    }}>
                      ⏳ Aguardando leitura do QR Code...
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" onClick={refreshQR}>Atualizar QR</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#ff4444' }}>QR Code indisponível no momento.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar Campanha */}
        {showEditCampaignModal && selectedCampaign && (
          <div className="modal-overlay" onClick={() => setShowEditCampaignModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar Campanha</h3>
                <button className="modal-close" onClick={() => setShowEditCampaignModal(false)}>✕</button>
              </div>
              <form onSubmit={handleEditCampaignSubmit}>
                <div className="modal-body">
                  {error && <div className="error-alert">{error}</div>}
                  <div className="form-group">
                    <label>Nome da Campanha *</label>
                    <input
                      type="text"
                      value={formData.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                      required
                      placeholder="Ex: Promoção Black Friday"
                    />
                  </div>
                  <div className="form-group">
                    <label>Mensagem *</label>
                    <textarea
                      value={formData.messageText}
                      onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
                      required
                      rows={6}
                      placeholder="Digite a mensagem que será enviada para os destinatários..."
                      style={{ resize: 'vertical' }}
                    />
                    <small style={{ color: 'rgba(0, 255, 136, 0.7)', display: 'block', marginTop: '0.5rem' }}>
                      {formData.messageText.length} caracteres
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditCampaignModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Estatísticas da Campanha */}
        {showCampaignStatsModal && selectedCampaign && campaignStats && (
          <div className="modal-overlay" onClick={() => setShowCampaignStatsModal(false)}>
            <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📊 Estatísticas — {selectedCampaign.name}</h3>
                <button className="modal-close" onClick={() => setShowCampaignStatsModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="stats-overview">
                  <div className="stat-big">
                    <span className="stat-big-value">{campaignStats.progress}%</span>
                    <span className="stat-big-label">Progresso</span>
                  </div>
                  <div className="progress-bar-large">
                    <div 
                      className="progress-fill-large" 
                      style={{ width: `${campaignStats.progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="stats-detailed">
                  <div className="stat-detail-item">
                    <div className="stat-detail-icon">📨</div>
                    <div className="stat-detail-info">
                      <span className="stat-detail-value">{campaignStats.total}</span>
                      <span className="stat-detail-label">Total de Destinatários</span>
                    </div>
                  </div>
                  
                  <div className="stat-detail-item success">
                    <div className="stat-detail-icon">✓</div>
                    <div className="stat-detail-info">
                      <span className="stat-detail-value">{campaignStats.sent}</span>
                      <span className="stat-detail-label">Mensagens Enviadas</span>
                    </div>
                  </div>
                  
                  <div className="stat-detail-item delivered">
                    <div className="stat-detail-icon">✓✓</div>
                    <div className="stat-detail-info">
                      <span className="stat-detail-value">{campaignStats.delivered}</span>
                      <span className="stat-detail-label">Entregues</span>
                    </div>
                  </div>
                  
                  <div className="stat-detail-item pending">
                    <div className="stat-detail-icon">⏳</div>
                    <div className="stat-detail-info">
                      <span className="stat-detail-value">{campaignStats.pending}</span>
                      <span className="stat-detail-label">Pendentes</span>
                    </div>
                  </div>
                  
                  <div className="stat-detail-item failed">
                    <div className="stat-detail-icon">✗</div>
                    <div className="stat-detail-info">
                      <span className="stat-detail-value">{campaignStats.failed}</span>
                      <span className="stat-detail-label">Falhas</span>
                    </div>
                  </div>
                </div>

                {selectedCampaign.scheduledAt && (
                  <div className="stats-info">
                    <p><strong>📅 Agendada para:</strong> {new Date(selectedCampaign.scheduledAt).toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {selectedCampaign.startedAt && (
                  <div className="stats-info">
                    <p><strong>🚀 Iniciada em:</strong> {new Date(selectedCampaign.startedAt).toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {selectedCampaign.completedAt && (
                  <div className="stats-info">
                    <p><strong>✅ Concluída em:</strong> {new Date(selectedCampaign.completedAt).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => setShowCampaignStatsModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Sucesso na Conexão */}
        {showSuccessModal && (
          <div className="modal-overlay success-modal" onClick={() => setShowSuccessModal(false)}>
            <div className="modal-content success-content" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon">✅</div>
              <h2 style={{ color: '#00ff88', marginBottom: '1rem', textAlign: 'center' }}>
                {successMessage.includes('conectado') ? 'Conexão Estabelecida!' : 'Sucesso!'}
              </h2>
              <p style={{ 
                color: '#fff', 
                textAlign: 'center', 
                fontSize: '1.1rem', 
                lineHeight: '1.6',
                whiteSpace: 'pre-line' 
              }}>
                {successMessage}
              </p>
              <button 
                className="btn-primary" 
                style={{ marginTop: '1.5rem' }}
                onClick={() => setShowSuccessModal(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer com logo e logs discretos */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-logo" aria-label="logo">
            {/* Substitua por <img src="/logo.svg" alt="Logo" /> se houver um arquivo */}
            <span className="logo-mark">WPP-SaaS</span>
          </div>
          <div className="footer-logs">
            <button className="footer-logs-btn" onClick={() => setShowFooterLogs(v => !v)} title="Ver logs e versões">
              🧾 Logs · Web v{logsState?.webVersion || '—'} · API v{logsState?.apiVersion || '—'}
            </button>
          </div>
        </div>
        {showFooterLogs && (
          <div className="footer-logs-panel">
            {logsLoading ? (
              <div className="logs-loading">Carregando logs...</div>
            ) : logsError ? (
              <div className="logs-error">{logsError}</div>
            ) : (
              <>
                <div className="logs-summary">
                  <span className="log-chip"><strong>Web</strong> v{logsState?.webVersion || '—'}</span>
                  <span className="log-chip"><strong>API</strong> v{logsState?.apiVersion || '—'}</span>
                  <span className="log-updated">Atualizado: {logsState?.updatedAt ? new Date(logsState.updatedAt).toLocaleString('pt-BR') : '—'}</span>
                </div>
                <pre className="logs-pre-compact">{logsState?.changelog || 'Sem changelog disponível.'}</pre>
              </>
            )}
          </div>
        )}
      </footer>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
        }

        .dashboard-container {
          width: 100%;
          background: linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #001a00 100%);
          min-height: 100vh;
          animation: gradientShift 15s ease infinite;
        }

        .top-tabs {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 255, 136, 0.2);
        }
        .tabs-list {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 0.5rem;
          list-style: none;
          padding: 0.75rem 1rem;
          align-items: center;
        }
        .tab-item {
          color: #00ff88;
          background: rgba(0, 255, 136, 0.08);
          border: 1px solid rgba(0, 255, 136, 0.25);
          padding: 0.6rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .tab-item:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .tab-item.active { background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; border-color: transparent; }
        
        /* Estilo especial para aba SMS - cor diferenciada */
        .tabs-list li:nth-child(6) .tab-item {
          background: rgba(255, 107, 107, 0.12) !important;
          border-color: rgba(255, 107, 107, 0.35) !important;
          color: #ff6b6b !important;
          font-weight: 700;
        }
        .tabs-list li:nth-child(6) .tab-item:hover {
          background: rgba(255, 107, 107, 0.2) !important;
          border-color: rgba(255, 107, 107, 0.5) !important;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
        }
        .tabs-list li:nth-child(6) .tab-item.active {
          background: linear-gradient(135deg, #ff6b6b, #ffa500) !important;
          color: white !important;
          border-color: transparent !important;
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }
        
        .tabs-actions { margin-left: auto; display: flex; gap: 0.5rem; }
        .refresh-btn, .refresh-once-btn {
          color: #00ff88;
          background: rgba(0, 255, 136, 0.08);
          border: 1px solid rgba(0, 255, 136, 0.25);
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .refresh-btn.on { background: rgba(0, 255, 136, 0.2); color: #00ff88; }

        @keyframes gradientShift {
          0%, 100% { 
            background: linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #001a00 100%); 
          }
          50% { 
            background: linear-gradient(135deg, #001a00 0%, #000000 50%, #0a0a0a 100%); 
          }
        }

        .dashboard-header {
          margin-bottom: 2rem;
          animation: fadeInDown 0.6s ease-out;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-content {
          background: rgba(0, 255, 136, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.1);
          transition: all 0.3s ease;
        }

        .header-content:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 12px 48px rgba(0, 255, 136, 0.2);
        }

        .dashboard-title {
          font-size: 3rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(90deg, #00ff88, #00cc66, #00ff88);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s ease-in-out infinite;
          letter-spacing: -1px;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }

        .dashboard-subtitle {
          color: #00ff88;
          margin: 0.5rem 0 0 0;
          font-size: 1.1rem;
          font-weight: 300;
          opacity: 0.8;
        }

        .btn-primary {
          padding: 1rem 2rem;
          border-radius: 16px;
          border: 2px solid #00ff88;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          font-size: 1rem;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          background: #00ff88;
          color: #000;
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 255, 136, 0.4);
        }

        .dashboard-main {
          max-width: 1400px;
          margin: 0 auto;
        }

        .metrics-section {
          margin-bottom: 2rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .metric-card {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient);
          transition: height 0.3s ease;
        }

        .metric-card:hover::before {
          height: 6px;
        }

        .metric-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(0, 255, 136, 0.5);
          box-shadow: 0 20px 60px rgba(0, 255, 136, 0.3);
        }

        .metric-card::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(0, 255, 136, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .metric-card:hover::after {
          width: 300px;
          height: 300px;
        }

        .metric-primary { --gradient: linear-gradient(90deg, #00ff88, #00cc66); }
        .metric-success { --gradient: linear-gradient(90deg, #00ff88, #33ff99); }
        .metric-warning { --gradient: linear-gradient(90deg, #00ff88, #66ffaa); }
        .metric-info { --gradient: linear-gradient(90deg, #00cc66, #00ff88); }
        .metric-purple { --gradient: linear-gradient(90deg, #00ff88, #00ffaa); }
        .metric-teal { --gradient: linear-gradient(90deg, #00ff88, #00dd77); }

        .metric-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
          position: relative;
          z-index: 1;
          color: #00ff88;
        }

        .metric-number {
          font-size: 2.8rem;
          font-weight: 700;
          color: #00ff88;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
          position: relative;
          z-index: 1;
        }

        .metric-label {
          font-size: 1rem;
          color: rgba(0, 255, 136, 0.7);
          margin: 0 0 0.5rem 0;
          font-weight: 300;
          position: relative;
          z-index: 1;
        }

        .metric-trend {
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.4rem 0.8rem;
          border-radius: 12px;
          position: relative;
          z-index: 1;
        }

        .metric-trend.positive {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .metric-trend.negative {
          background: rgba(255, 0, 0, 0.2);
          color: #ff4444;
          border: 1px solid rgba(255, 0, 0, 0.3);
        }

        .metric-trend.neutral {
          background: rgba(0, 255, 136, 0.1);
          color: rgba(0, 255, 136, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .quick-actions-section {
          width: 100%;
        }

        .section-card {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          transition: all 0.3s ease;
        }

        .section-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 12px 48px rgba(0, 255, 136, 0.15);
        }

        .section-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .action-card {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-align: left;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }
        
        .action-card * {
          pointer-events: none;
          position: relative;
          z-index: 2;
        }

        .action-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient);
          transition: height 0.3s ease;
        }

        .action-card::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(0, 255, 136, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
          z-index: 1;
        }

        .action-card:hover::before {
          height: 100%;
        }

        .action-card:hover::after {
          width: 400px;
          height: 400px;
        }

        .action-card:hover {
          transform: translateY(-5px) scale(1.03);
          border-color: rgba(0, 255, 136, 0.5);
          box-shadow: 0 16px 48px rgba(0, 255, 136, 0.3);
        }

        .action-primary { --gradient: linear-gradient(90deg, #00ff88, #00cc66); }
        .action-success { --gradient: linear-gradient(90deg, #00ff88, #33ff99); }
        .action-info { --gradient: linear-gradient(90deg, #00cc66, #00ff88); }
        .action-purple { --gradient: linear-gradient(90deg, #00ff88, #00ffaa); }
        .action-warning { --gradient: linear-gradient(90deg, #00ff88, #66ffaa); }
        .action-teal { --gradient: linear-gradient(90deg, #00ff88, #00dd77); }

        .action-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
          color: #00ff88;
        }

        .action-content h3 {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 0.5rem 0;
        }

        .action-content p {
          color: rgba(0, 255, 136, 0.7);
          margin: 0;
          font-size: 0.95rem;
          font-weight: 300;
        }

        .dashboard-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(0, 255, 136, 0.1);
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          background: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.2);
        }
        .activity-icon {
          font-size: 1.8rem;
          min-width: 40px;
          text-align: center;
          filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
          color: #00ff88;
        } filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
        }

        .activity-message {
          color: #00ff88;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
        }

        .activity-time {
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.85rem;
          font-weight: 300;
        }

        .organizations-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .organization-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(0, 255, 136, 0.1);
          transition: all 0.3s ease;
        }

        .organization-item:hover {
          background: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.2);
        }

        .organization-avatar {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .organization-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 0.25rem 0;
        }

        .organization-role {
          color: rgba(0, 255, 136, 0.7);
          margin: 0 0 0.25rem 0;
          font-size: 0.9rem;
          font-weight: 300;
        }

        .organization-slug {
          background: rgba(0, 255, 136, 0.15);
          color: #00ff88;
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.3));
          color: #00ff88;
        }

        .empty-message {
          color: rgba(0, 255, 136, 0.6);
          margin: 0 0 1.5rem 0;
          font-weight: 300;
        }

        .data-section {
          flex: 1;
          min-width: 0;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-actions { display: flex; align-items: center; gap: 0.5rem; }

        .btn-link {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.2);
          color: #00ff88;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          border-radius: 10px;
        }

        .btn-link:hover {
          background: rgba(0, 255, 136, 0.2);
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .data-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 14px;
          border: 1px solid rgba(0, 255, 136, 0.1);
          transition: all 0.3s ease;
        }

        .list-item:hover {
          background: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.2);
        }

        .item-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(0, 255, 136, 0.15);
          font-size: 1.3rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-info h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #00ff88;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-info p {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: rgba(0, 255, 136, 0.6);
          font-weight: 300;
        }

        .btn-icon-delete,
        .btn-icon-action {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.2);
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.3s;
          padding: 0.5rem;
          border-radius: 8px;
          color: #00ff88;
        }

        /* Instâncias: ações em chips */
        .instance-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .btn-chip { background: rgba(0,255,136,0.1); color:#00ff88; border:1px solid rgba(0,255,136,0.3); padding: 0.4rem 0.7rem; border-radius: 999px; font-weight:600; cursor:pointer; font-size:0.85rem; transition: all .2s ease; }
        .btn-chip:hover { background: rgba(0,255,136,0.2); transform: translateY(-1px); }
        .btn-chip.danger { border-color: rgba(255,68,68,0.5); color:#ff6666; background: rgba(255,68,68,0.08); }
        .btn-chip.danger:hover { background: rgba(255,68,68,0.16); }
        .btn-chip.warning { border-color: rgba(255,136,0,0.5); color:#ffae42; background: rgba(255,136,0,0.08); }
        .btn-chip.warning:hover { background: rgba(255,136,0,0.16); }

        .btn-icon-delete:hover {
          transform: scale(1.1);
          background: rgba(255, 0, 0, 0.2);
          border-color: rgba(255, 0, 0, 0.4);
          box-shadow: 0 4px 16px rgba(255, 0, 0, 0.3);
          color: #ff4444;
        }

        .btn-icon-action:hover {
          transform: scale(1.1);
          background: rgba(0, 255, 136, 0.2);
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .empty-card {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-card p {
          color: rgba(0, 255, 136, 0.5);
          margin-bottom: 1.5rem;
          font-weight: 300;
        }

        .btn-small-primary {
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          border: none;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .btn-small-primary:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 12px 32px rgba(0, 255, 136, 0.5);
        }

        .full-width {
          grid-column: 1 / -1;
        }

        /* Seção de Mensagens */
        .messages-section {
          margin-bottom: 2rem;
          animation: fadeInUp 1s ease-out;
        }

        .section-subtitle {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.95rem;
          margin: 0.5rem 0 0 0;
          font-weight: 300;
        }

        .messages-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .message-form-card,
        .message-stats-card {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(0, 255, 136, 0.2);
          transition: all 0.3s ease;
        }

        .message-form-card:hover,
        .message-stats-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
        }

        .card-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .message-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.flex-1 {
          flex: 1;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .form-label {
          color: #00ff88;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .form-input,
        .form-textarea,
        .form-select {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          padding: 0.9rem 1.2rem;
          color: #00ff88;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          font-family: 'Poppins', sans-serif;
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: rgba(0, 255, 136, 0.4);
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
          background: rgba(0, 0, 0, 0.8);
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          color: rgba(0, 255, 136, 0.5);
          font-size: 0.8rem;
          font-weight: 300;
        }

        .form-divider {
          border-top: 1px solid rgba(0, 255, 136, 0.2);
          padding-top: 1rem;
          margin: 0.5rem 0;
          text-align: center;
        }

        .form-divider span {
          background: rgba(0, 0, 0, 0.5);
          padding: 0 1rem;
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.9rem;
          font-weight: 500;
          position: relative;
          top: -0.6rem;
        }

        .btn-send-message {
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          border: none;
          border-radius: 14px;
          padding: 1.1rem 2rem;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 6px 24px rgba(0, 255, 136, 0.4);
          margin-top: 0.5rem;
        }

        .btn-send-message:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 40px rgba(0, 255, 136, 0.6);
        }

        .btn-send-message:active {
          transform: translateY(-2px) scale(0.98);
        }

        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 14px;
          border: 1px solid rgba(0, 255, 136, 0.15);
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          background: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.2);
        }

        .stat-icon {
          font-size: 2rem;
          min-width: 50px;
          text-align: center;
          filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .stat-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
          font-weight: 300;
          margin-top: 0.2rem;
        }

        .stats-footer {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(0, 255, 136, 0.2);
        }

        .btn-view-stats {
          width: 100%;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          color: #00ff88;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-view-stats:hover {
          background: rgba(0, 255, 136, 0.2);
          border-color: rgba(0, 255, 136, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
        }

        .examples-section {
          margin: 2rem 0;
        }

        .examples-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1rem 0;
        }

        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .example-card {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 14px;
          padding: 1.2rem;
          border: 1px solid rgba(0, 255, 136, 0.15);
          transition: all 0.3s ease;
        }

        .example-card:hover {
          background: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .example-icon {
          font-size: 2rem;
          margin-bottom: 0.8rem;
          filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
        }

        .example-content h4 {
          color: #00ff88;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .example-content p {
          color: rgba(0, 255, 136, 0.7);
          margin: 0 0 0.8rem 0;
          font-size: 0.85rem;
          font-weight: 300;
        }

        .example-content code {
          display: block;
          background: rgba(0, 0, 0, 0.5);
          padding: 0.5rem;
          border-radius: 8px;
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.75rem;
          border: 1px solid rgba(0, 255, 136, 0.1);
        }

        .instances-status {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(0, 255, 136, 0.2);
        }

        .status-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1rem 0;
        }

        .no-instances {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 136, 0, 0.1);
          border-radius: 14px;
          border: 1px solid rgba(255, 136, 0, 0.3);
        }

        .no-instances p {
          color: #ff8800;
          margin: 0 0 1rem 0;
          font-weight: 500;
        }

        .instances-list-compact {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .instance-compact {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 136, 0.15);
          transition: all 0.3s ease;
        }

        .instance-compact:hover {
          background: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.2);
        }

        .instance-status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .instance-status-dot.connected {
          background: #00ff88;
          box-shadow: 0 0 10px #00ff88;
        }

        .instance-status-dot.connecting {
          background: #ff8800;
          box-shadow: 0 0 10px #ff8800;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .instance-status-dot.disconnected {
          background: #ff4444;
          box-shadow: 0 0 10px #ff4444;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .instance-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .instance-info strong {
          color: #00ff88;
          font-size: 0.95rem;
        }

        .instance-phone {
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.8rem;
          font-weight: 300;
        }

        .instance-badge {
          padding: 0.4rem 0.9rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .instance-badge.connected {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .instance-badge.connecting {
          background: rgba(255, 136, 0, 0.2);
          color: #ff8800;
          border: 1px solid rgba(255, 136, 0, 0.3);
        }

        .instance-badge.disconnected {
          background: rgba(255, 68, 68, 0.2);
          color: #ff4444;
          border: 1px solid rgba(255, 68, 68, 0.3);
        }

        @media (max-width: 1200px) {
          .messages-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-title {
            font-size: 2rem;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-row {
            grid-template-columns: 1fr;
          }

          .examples-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            flex-direction: column;
          }
        }

        .logs-section .logs-content { display: flex; flex-direction: column; gap: 1rem; }
        .log-badge { display: inline-flex; gap: 0.4rem; align-items: center; background: rgba(0,255,136,0.15); border: 1px solid rgba(0,255,136,0.25); color: #00ff88; padding: 0.4rem 0.6rem; border-radius: 8px; margin-right: 0.5rem; }
        .log-updated { color: rgba(0,255,136,0.6); font-size: 0.9rem; }
        .logs-pre { white-space: pre-wrap; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,136,0.2); color: #00ff88; padding: 1rem; border-radius: 12px; max-height: 500px; overflow: auto; }

  .app-footer { margin-top: 2rem; padding: 1.5rem 0; border-top: 1px solid rgba(0,255,136,0.2); background: rgba(0,0,0,0.6); }
  .footer-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .footer-logo .logo-mark { font-weight: 800; letter-spacing: 0.5px; background: linear-gradient(90deg, #00ff88, #00cc66, #00ffaa); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.1rem; }
  .footer-logs-btn { background: rgba(0,255,136,0.08); color: #00ff88; border: 1px solid rgba(0,255,136,0.25); padding: 0.35rem 0.6rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
  .footer-logs-panel { max-width: 1400px; margin: 0.25rem auto 1rem; background: rgba(0,0,0,0.7); border: 1px solid rgba(0,255,136,0.2); border-radius: 12px; padding: 0.75rem 1rem; }
  .logs-summary { display: flex; gap: 0.5rem; align-items: center; color: #00ff88; margin-bottom: 0.5rem; }
  .log-chip { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.25); padding: 0.2rem 0.5rem; border-radius: 999px; }
  .logs-pre-compact { max-height: 180px; overflow: auto; white-space: pre-wrap; font-size: 0.85rem; color: #e8ffe8; margin: 0; }

        /* Campaigns Grid */
        .campaigns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .campaign-card {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .campaign-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.15);
        }

        .campaign-header {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .campaign-icon {
          font-size: 2rem;
          min-width: 40px;
          text-align: center;
        }

        .campaign-info {
          flex: 1;
        }

        .campaign-name {
          color: #00ff88;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .campaign-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: rgba(0, 255, 136, 0.6);
        }

        .campaign-instance, .campaign-date {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .campaign-status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .campaign-status-badge.draft {
          background: rgba(136, 136, 136, 0.2);
          color: #888;
          border: 1px solid rgba(136, 136, 136, 0.3);
        }

        .campaign-status-badge.scheduled {
          background: rgba(0, 170, 255, 0.2);
          color: #00aaff;
          border: 1px solid rgba(0, 170, 255, 0.3);
        }

        .campaign-status-badge.running {
          background: rgba(255, 170, 0, 0.2);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.3);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .campaign-status-badge.paused {
          background: rgba(255, 136, 0, 0.2);
          color: #ff8800;
          border: 1px solid rgba(255, 136, 0, 0.3);
        }

        .campaign-status-badge.completed {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .campaign-status-badge.failed {
          background: rgba(255, 68, 68, 0.2);
          color: #ff4444;
          border: 1px solid rgba(255, 68, 68, 0.3);
        }

        .campaign-message {
          background: rgba(0, 0, 0, 0.3);
          border-left: 3px solid rgba(0, 255, 136, 0.3);
          padding: 0.8rem;
          margin: 1rem 0;
          border-radius: 4px;
        }

        .campaign-message p {
          color: rgba(0, 255, 136, 0.8);
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0;
        }

        .campaign-stats {
          margin: 1rem 0;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(0, 255, 136, 0.1);
        }

        .stat-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
        }

        .stat-value {
          color: #00ff88;
          font-weight: 600;
        }

        .campaign-progress {
          margin: 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          transition: width 0.5s ease;
        }

        .progress-text {
          color: #00ff88;
          font-weight: 600;
          font-size: 0.9rem;
          min-width: 45px;
          text-align: right;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
          margin-top: 1rem;
        }

        .mini-stat {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 8px;
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mini-stat-icon {
          font-size: 1.2rem;
          margin-bottom: 0.3rem;
        }

        .mini-stat-label {
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.75rem;
          margin-bottom: 0.2rem;
        }

        .mini-stat-value {
          color: #00ff88;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .campaign-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 255, 136, 0.1);
        }

        .btn-chip.success {
          background: rgba(0, 255, 136, 0.15);
          color: #00ff88;
          border-color: rgba(0, 255, 136, 0.3);
        }

        .btn-chip.success:hover {
          background: rgba(0, 255, 136, 0.25);
        }

        .btn-chip.warning {
          background: rgba(255, 170, 0, 0.15);
          color: #ffaa00;
          border-color: rgba(255, 170, 0, 0.3);
        }

        .btn-chip.warning:hover {
          background: rgba(255, 170, 0, 0.25);
        }

        .btn-chip.info {
          background: rgba(0, 170, 255, 0.15);
          color: #00aaff;
          border-color: rgba(0, 170, 255, 0.3);
        }

        .btn-chip.info:hover {
          background: rgba(0, 170, 255, 0.25);
        }

        .btn-chip.danger {
          background: rgba(255, 68, 68, 0.15);
          color: #ff4444;
          border-color: rgba(255, 68, 68, 0.3);
        }

        .btn-chip.danger:hover {
          background: rgba(255, 68, 68, 0.25);
        }

        .btn-chip.primary {
          background: rgba(0, 136, 255, 0.15);
          color: #0088ff;
          border-color: rgba(0, 136, 255, 0.3);
        }

        .btn-chip.primary:hover {
          background: rgba(0, 136, 255, 0.25);
        }

        /* Stats Modal */
        .stats-modal {
          max-width: 600px;
        }

        .stats-overview {
          text-align: center;
          padding: 1.5rem;
          background: rgba(0, 255, 136, 0.05);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .stat-big {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-big-value {
          font-size: 3.5rem;
          font-weight: 700;
          color: #00ff88;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        }

        .stat-big-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 1.1rem;
          font-weight: 600;
        }

        .progress-bar-large {
          width: 100%;
          height: 12px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(0, 255, 136, 0.3);
          margin-top: 1rem;
        }

        .progress-fill-large {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          transition: width 0.5s ease;
        }

        .stats-detailed {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat-detail-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .stat-detail-item:hover {
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(4px);
        }

        .stat-detail-item.success {
          border-left: 3px solid #00ff88;
        }

        .stat-detail-item.delivered {
          border-left: 3px solid #00ccdd;
        }

        .stat-detail-item.pending {
          border-left: 3px solid #ffaa00;
        }

        .stat-detail-item.failed {
          border-left: 3px solid #ff4444;
        }

        .stat-detail-icon {
          font-size: 2rem;
          min-width: 50px;
          text-align: center;
        }

        .stat-detail-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .stat-detail-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
        }

        .stat-detail-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
        }

        .stats-info {
          margin-top: 1rem;
          padding: 0.8rem;
          background: rgba(0, 170, 255, 0.1);
          border-left: 3px solid #00aaff;
          border-radius: 4px;
        }

        .stats-info p {
          color: rgba(0, 255, 136, 0.8);
          margin: 0.3rem 0;
          font-size: 0.9rem;
        }

        .stats-info strong {
          color: #00ff88;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .empty-state h3 {
          color: #00ff88;
          margin: 1rem 0 0.5rem 0;
        }

        .empty-state p {
          color: rgba(0, 255, 136, 0.7);
          margin-bottom: 1.5rem;
        }

        /* Success Modal Styles */
        .success-modal {
          animation: fadeIn 0.3s ease;
        }

        .success-content {
          text-align: center;
          padding: 2.5rem 2rem;
          animation: slideUp 0.4s ease;
        }

        .success-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          animation: bounceIn 0.6s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounceIn {
          0% { 
            transform: scale(0);
            opacity: 0;
          }
          50% { 
            transform: scale(1.2);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }

        .qr-status-checking {
          animation: pulseGlow 2s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px rgba(255, 170, 0, 0.3);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px rgba(255, 170, 0, 0.6);
          }
        }

        /* ===== CONTACTS SECTION STYLES ===== */
        .contacts-section {
          padding: 0 1rem;
        }

        .groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .group-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .group-card:hover {
          background: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 255, 136, 0.2);
        }

        .group-icon {
          font-size: 2rem;
          min-width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 50%;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.3));
        }

        .group-name {
          color: #00ff88;
          font-weight: 600;
          margin-bottom: 0.25rem;
          font-size: 1.05rem;
        }

        .group-meta {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.85rem;
        }

        /* === SMS SECTION - EM DESENVOLVIMENTO === */
        .sms-container {
          padding: 2rem;
          min-height: 80vh;
          background: linear-gradient(135deg, #1a0033 0%, #330066 50%, #4d0099 100%);
          animation: smsGradientShift 10s ease infinite;
        }

        @keyframes smsGradientShift {
          0%, 100% { background: linear-gradient(135deg, #1a0033 0%, #330066 50%, #4d0099 100%); }
          50% { background: linear-gradient(135deg, #4d0099 0%, #330066 50%, #1a0033 100%); }
        }

        .sms-section {
          max-width: 1400px;
          margin: 0 auto;
        }

        .sms-dev-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 107, 107, 0.3);
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(255, 107, 107, 0.2);
        }

        .sms-dev-header {
          text-align: center;
          margin-bottom: 3rem;
          position: relative;
        }

        .sms-dev-icon {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sms-pulse-1, .sms-pulse-2, .sms-pulse-3 {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid #ff6b6b;
          border-radius: 50%;
          animation: smsPulse 2s ease-out infinite;
        }

        .sms-pulse-2 {
          animation-delay: 0.5s;
        }

        .sms-pulse-3 {
          animation-delay: 1s;
        }

        @keyframes smsPulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .sms-icon-text {
          font-size: 4rem;
          z-index: 1;
          animation: smsFloat 3s ease-in-out infinite;
        }

        @keyframes smsFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .sms-dev-title {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ff6b6b, #ffa500, #ff6b6b);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: smsGradientText 3s ease infinite;
          margin-bottom: 1rem;
        }

        @keyframes smsGradientText {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .sms-dev-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 107, 107, 0.2);
          border: 2px solid #ff6b6b;
          border-radius: 50px;
          color: #ff6b6b;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 1px;
          animation: smsBadgePulse 2s ease-in-out infinite;
        }

        @keyframes smsBadgePulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 107, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 107, 107, 0.6); }
        }

        .sms-badge-dot {
          width: 12px;
          height: 12px;
          background: #ff6b6b;
          border-radius: 50%;
          animation: smsDotBlink 1.5s ease-in-out infinite;
        }

        @keyframes smsDotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .sms-dev-content {
          display: grid;
          gap: 2rem;
        }

        .sms-animation-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          margin-bottom: 2rem;
        }

        @media (max-width: 968px) {
          .sms-animation-container {
            grid-template-columns: 1fr;
          }
        }

        .sms-phone-mockup {
          position: relative;
          width: 280px;
          height: 560px;
          margin: 0 auto;
          background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
          border-radius: 40px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 8px solid #333;
        }

        .sms-phone-screen {
          width: 100%;
          height: calc(100% - 60px);
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border-radius: 20px;
          padding: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sms-phone-button {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 50px;
          background: #444;
          border-radius: 50%;
          box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
        }

        .sms-message {
          opacity: 0;
          transform: translateY(20px);
          animation: smsMessageAppear 1s ease forwards;
        }

        .sms-message-1 { animation-delay: 0.5s; }
        .sms-message-2 { animation-delay: 1.5s; }
        .sms-message-3 { animation-delay: 2.5s; }

        @keyframes smsMessageAppear {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sms-message-bubble {
          background: linear-gradient(135deg, #ff6b6b, #ffa500);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 20px 20px 20px 5px;
          font-size: 1rem;
          max-width: 80%;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
          animation: smsBubblePulse 2s ease-in-out infinite;
        }

        @keyframes smsBubblePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .sms-features-preview {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sms-feature-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 16px;
          opacity: 0;
          transform: translateX(-30px);
          animation: smsFeatureSlide 0.6s ease forwards;
        }

        .sms-feature-1 { animation-delay: 0.2s; }
        .sms-feature-2 { animation-delay: 0.4s; }
        .sms-feature-3 { animation-delay: 0.6s; }
        .sms-feature-4 { animation-delay: 0.8s; }

        @keyframes smsFeatureSlide {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .sms-feature-icon {
          font-size: 3rem;
          filter: drop-shadow(0 0 10px rgba(255, 107, 107, 0.5));
        }

        .sms-feature-text h3 {
          color: #ffa500;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .sms-feature-text p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
        }

        .sms-dev-info {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }

        @media (max-width: 968px) {
          .sms-dev-info {
            grid-template-columns: 1fr;
          }
        }

        .sms-info-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 16px;
          padding: 2rem;
        }

        .sms-info-box h2 {
          color: #ffa500;
          font-size: 1.8rem;
          margin-bottom: 1rem;
        }

        .sms-info-box p {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.8;
          font-size: 1.05rem;
        }

        .sms-coming-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .sms-feature-badge {
          padding: 0.5rem 1rem;
          background: rgba(255, 107, 107, 0.2);
          border: 1px solid #ff6b6b;
          border-radius: 20px;
          color: #ff6b6b;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .sms-notify-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 16px;
          padding: 2rem;
        }

        .sms-notify-box h3 {
          color: #ffa500;
          font-size: 1.4rem;
          margin-bottom: 0.75rem;
        }

        .sms-notify-box p {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 1.5rem;
        }

        .sms-notify-form {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .sms-notify-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
        }

        .sms-notify-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .sms-notify-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #ff6b6b, #ffa500);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 700;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .sms-notify-hint {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
        }

        .sms-dev-progress {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 16px;
          padding: 2rem;
          margin-top: 2rem;
        }

        .sms-dev-progress h3 {
          color: #ffa500;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .sms-progress-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sms-progress-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sms-progress-item.sms-progress-done {
          border-color: rgba(0, 255, 136, 0.3);
          background: rgba(0, 255, 136, 0.05);
        }

        .sms-progress-item.sms-progress-current {
          border-color: rgba(255, 165, 0, 0.5);
          background: rgba(255, 165, 0, 0.1);
          animation: smsProgressPulse 2s ease-in-out infinite;
        }

        @keyframes smsProgressPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 165, 0, 0.2); }
          50% { box-shadow: 0 0 40px rgba(255, 165, 0, 0.4); }
        }

        .sms-progress-check {
          font-size: 1.5rem;
          font-weight: 700;
          min-width: 30px;
          text-align: center;
        }

        .sms-progress-done .sms-progress-check {
          color: #00ff88;
        }

        .sms-progress-current .sms-progress-check {
          color: #ffa500;
        }

        .sms-progress-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.05rem;
        }

        /* Tab SMS destacada com cor diferente */
        .tab-item:has-text("📱 Envio SMS") {
          background: rgba(255, 107, 107, 0.15) !important;
          border-color: rgba(255, 107, 107, 0.4) !important;
          color: #ff6b6b !important;
        }

        .tab-item:has-text("📱 Envio SMS").active {
          background: linear-gradient(135deg, #ff6b6b, #ffa500) !important;
          color: white !important;
        }

        .contacts-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.2);
        }

        .stat-card .stat-icon {
          font-size: 2rem;
          opacity: 0.8;
        }

        .stat-card .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-card .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
          line-height: 1;
        }

        .stat-card .stat-label {
          font-size: 0.85rem;
          color: rgba(0, 255, 136, 0.7);
          margin-top: 0.3rem;
        }

        .stat-total { border-left: 3px solid #00ff88; }
        .stat-active { border-left: 3px solid #00cc66; }
        .stat-blocked { border-left: 3px solid #ff4444; }
        .stat-lists { border-left: 3px solid #0088ff; }

        .contacts-toolbar {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin: 1.5rem 0;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 300px;
        }

        .search-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 10px;
          color: #00ff88;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #00ff88;
          box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
        }

        .search-input::placeholder {
          color: rgba(0, 255, 136, 0.5);
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .filter-btn {
          padding: 0.6rem 1.2rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 8px;
          color: rgba(0, 255, 136, 0.8);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          background: rgba(0, 255, 136, 0.1);
          border-color: #00ff88;
        }

        .filter-btn.active {
          background: #00ff88;
          color: #000;
          border-color: #00ff88;
        }

        .contacts-table {
          margin: 1.5rem 0;
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          overflow: hidden;
        }

        .data-table thead {
          background: rgba(0, 255, 136, 0.1);
        }

        .data-table th {
          padding: 1rem;
          text-align: left;
          color: #00ff88;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(0, 255, 136, 0.3);
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(0, 255, 136, 0.1);
          color: rgba(0, 255, 136, 0.9);
        }

        .data-table tbody tr {
          transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: rgba(0, 255, 136, 0.05);
        }

        .contact-name {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .contact-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .contact-phone {
          font-family: 'Courier New', monospace;
          color: #00ff88;
        }

        .contact-email {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
        }

        .tags-list {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .tag {
          padding: 0.3rem 0.7rem;
          background: rgba(0, 136, 255, 0.2);
          border: 1px solid rgba(0, 136, 255, 0.4);
          border-radius: 12px;
          font-size: 0.75rem;
          color: #0088ff;
          font-weight: 500;
        }

        .no-tags {
          color: rgba(0, 255, 136, 0.4);
          font-size: 0.85rem;
          font-style: italic;
        }

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.active {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.4);
        }

        .status-badge.blocked {
          background: rgba(255, 68, 68, 0.2);
          color: #ff4444;
          border: 1px solid rgba(255, 68, 68, 0.4);
        }

        .contact-date {
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.85rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.4rem;
        }

        .btn-icon {
          padding: 0.5rem;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .btn-icon:hover {
          background: rgba(0, 255, 136, 0.2);
          transform: scale(1.1);
        }

        .btn-icon.danger {
          background: rgba(255, 68, 68, 0.1);
          border-color: rgba(255, 68, 68, 0.3);
        }

        .btn-icon.danger:hover {
          background: rgba(255, 68, 68, 0.2);
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          margin-top: 1rem;
        }

        .pagination-btn {
          padding: 0.6rem 1.2rem;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 8px;
          color: #00ff88;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(0, 255, 136, 0.2);
          transform: translateY(-1px);
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-info {
          color: rgba(0, 255, 136, 0.8);
          font-size: 0.9rem;
        }

        .pagination-info strong {
          color: #00ff88;
          font-weight: 700;
        }

        .bulk-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 136, 255, 0.1);
          border: 1px solid rgba(0, 136, 255, 0.3);
          border-radius: 12px;
          margin: 1.5rem 0;
        }

        .bulk-actions-info {
          color: #0088ff;
          font-weight: 600;
        }

        .bulk-actions-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-bulk {
          padding: 0.6rem 1rem;
          background: rgba(0, 136, 255, 0.2);
          border: 1px solid rgba(0, 136, 255, 0.4);
          border-radius: 8px;
          color: #0088ff;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-bulk:hover:not(:disabled) {
          background: rgba(0, 136, 255, 0.3);
          transform: translateY(-1px);
        }

        .btn-bulk:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-bulk.danger {
          background: rgba(255, 68, 68, 0.2);
          border-color: rgba(255, 68, 68, 0.4);
          color: #ff4444;
        }

        .btn-bulk.danger:hover:not(:disabled) {
          background: rgba(255, 68, 68, 0.3);
        }

        .quick-guide {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(0, 170, 255, 0.05);
          border: 1px solid rgba(0, 170, 255, 0.2);
          border-radius: 16px;
        }

        .guide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .guide-title {
          color: #00aaff;
          font-size: 1.3rem;
          margin: 0;
          font-weight: 600;
        }

        .btn-guide-help {
          padding: 0.6rem 1rem;
          background: rgba(0, 170, 255, 0.15);
          border: 1px solid rgba(0, 170, 255, 0.3);
          border-radius: 8px;
          color: #00aaff;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .btn-guide-help:hover {
          background: rgba(0, 170, 255, 0.25);
          border-color: #00aaff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 170, 255, 0.3);
        }

        .guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .guide-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 170, 255, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .guide-item:hover {
          border-color: rgba(0, 170, 255, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 170, 255, 0.2);
        }

        .guide-icon {
          font-size: 2rem;
          min-width: 40px;
        }

        .guide-content h4 {
          color: #00aaff;
          font-size: 1rem;
          margin: 0 0 0.5rem 0;
        }

        .guide-content p {
          color: rgba(0, 170, 255, 0.7);
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }

        .empty-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .btn-small-secondary {
          padding: 0.6rem 1.2rem;
          background: rgba(0, 136, 255, 0.1);
          border: 1px solid rgba(0, 136, 255, 0.3);
          border-radius: 10px;
          color: #0088ff;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-small-secondary:hover {
          background: rgba(0, 136, 255, 0.2);
          border-color: #0088ff;
          transform: translateY(-2px);
        }

        /* ========================================
           ACCOUNT SECTION STYLES
           ======================================== */
        .account-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .account-section,
        .subscription-section {
          animation: fadeInUp 0.6s ease-out;
        }

        .account-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 968px) {
          .account-grid {
            grid-template-columns: 1fr;
          }
        }

        .account-card {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .account-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.15);
          transform: translateY(-4px);
        }

        .account-card-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .account-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .btn-save-profile {
          margin-top: 0.5rem;
          width: 100%;
          font-size: 1.05rem;
          padding: 1rem;
        }

        .account-info-list {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-bottom: 2rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 136, 0.15);
          transition: all 0.2s ease;
        }

        .info-item:hover {
          background: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 255, 136, 0.25);
          transform: translateX(6px);
        }

        .info-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.95rem;
          font-weight: 400;
        }

        .info-value {
          color: #00ff88;
          font-weight: 600;
          font-size: 1rem;
        }

        .info-highlight {
          font-size: 1.2rem;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }

        .info-badge {
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .info-badge-active {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.4);
          color: #00ff88;
        }

        .account-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent);
          margin: 2rem 0;
        }

        .btn-logout {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 68, 68, 0.15);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 14px;
          color: #ff4444;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-logout:hover {
          background: rgba(255, 68, 68, 0.25);
          border-color: #ff4444;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 68, 68, 0.3);
        }

        /* Subscription Section */
        .subscription-current {
          margin-bottom: 2rem;
        }

        .current-plan-banner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 170, 255, 0.15));
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 20px;
          margin-bottom: 2rem;
          transition: all 0.3s ease;
        }

        .current-plan-banner:hover {
          border-color: rgba(0, 255, 136, 0.5);
          box-shadow: 0 12px 40px rgba(0, 255, 136, 0.2);
          transform: translateY(-4px);
        }

        .current-plan-icon {
          font-size: 3rem;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
        }

        .current-plan-info {
          flex: 1;
        }

        .current-plan-info h4 {
          font-size: 1.4rem;
          color: #00ff88;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }

        .current-plan-info p {
          color: rgba(0, 255, 136, 0.7);
          margin: 0;
          font-size: 0.95rem;
        }

        .btn-manage-subscription {
          padding: 1rem 2rem;
          background: rgba(0, 255, 136, 0.15);
          border: 1px solid rgba(0, 255, 136, 0.4);
          border-radius: 12px;
          color: #00ff88;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .btn-manage-subscription:hover {
          background: rgba(0, 255, 136, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 255, 136, 0.3);
        }

        .subscription-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 968px) {
          .subscription-stats {
            grid-template-columns: 1fr;
          }
        }

        .subscription-stat-item {
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .subscription-stat-item:hover {
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.15);
        }

        .subscription-stat-item .stat-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          font-weight: 400;
        }

        .subscription-stat-item .stat-value {
          font-size: 1.6rem;
          color: #00ff88;
          font-weight: 700;
          margin-bottom: 1rem;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }

        .stat-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .stat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          border-radius: 10px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
        }

        .plan-active {
          border-color: rgba(0, 255, 136, 0.6) !important;
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.3) !important;
          position: relative;
        }

        .plan-current-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85rem;
          z-index: 2;
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.4);
        }

        .plan-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .plans-footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .footer-highlight {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem 1.5rem;
          background: rgba(255, 204, 0, 0.1);
          border: 1px solid rgba(255, 204, 0, 0.3);
          border-radius: 16px;
          flex: 1;
        }

        .highlight-icon {
          font-size: 2rem;
          filter: drop-shadow(0 0 8px rgba(255, 204, 0, 0.5));
        }

        .footer-highlight strong {
          color: #ffcc00;
          text-shadow: 0 0 8px rgba(255, 204, 0, 0.4);
        }

        @media (max-width: 768px) {
          .account-grid {
            grid-template-columns: 1fr;
          }

          .current-plan-banner {
            flex-direction: column;
            text-align: center;
          }

          .subscription-stats {
            grid-template-columns: 1fr;
          }

          .plans-footer-content {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* ===== ESTILOS DA ABA MENSAGENS ===== */
        .messages-section {
          width: 100%;
        }

        .bulk-send-wrapper {
          margin-top: 2rem;
        }

        .bulk-send-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .form-section:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.1);
        }

        .section-subtitle {
          font-size: 1.2rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .message-type-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.2rem 1rem;
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
          color: rgba(0, 255, 136, 0.7);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .type-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(0, 255, 136, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }

        .type-btn:hover::before {
          width: 200px;
          height: 200px;
        }

        .type-btn:hover {
          border-color: rgba(0, 255, 136, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .type-btn.active {
          background: rgba(0, 255, 136, 0.15);
          border-color: #00ff88;
          color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }

        .type-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
          position: relative;
          z-index: 1;
        }

        .type-btn span:last-child {
          position: relative;
          z-index: 1;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-label {
          display: block;
          color: #00ff88;
          font-weight: 500;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          color: #00ff88;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: #00ff88;
          box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: rgba(0, 255, 136, 0.4);
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          display: block;
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .flex-1 {
          flex: 1;
        }

        .recipients-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .tab-btn {
          padding: 0.8rem 1.5rem;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 10px;
          color: rgba(0, 255, 136, 0.7);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-btn:hover {
          border-color: rgba(0, 255, 136, 0.5);
          background: rgba(0, 255, 136, 0.05);
        }

        .tab-btn.active {
          background: rgba(0, 255, 136, 0.15);
          border-color: #00ff88;
          color: #00ff88;
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
        }

        .recipients-list {
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 136, 0.15);
        }

        .recipients-list::-webkit-scrollbar {
          width: 8px;
        }

        .recipients-list::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
        }

        .recipients-list::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3);
          border-radius: 10px;
        }

        .recipients-list::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 136, 0.5);
        }

        .recipient-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .recipient-item:hover {
          background: rgba(0, 255, 136, 0.05);
          border-color: rgba(0, 255, 136, 0.4);
          transform: translateX(5px);
        }

        .recipient-item input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #00ff88;
        }

        .recipient-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .recipient-name {
          color: #00ff88;
          font-weight: 500;
        }

        .recipient-meta {
          color: rgba(0, 255, 136, 0.6);
          font-size: 0.85rem;
        }

        .empty-state-small {
          text-align: center;
          padding: 3rem 2rem;
          color: rgba(0, 255, 136, 0.6);
        }

        .empty-state-small p {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .recipients-summary {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(0, 255, 136, 0.05);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 10px;
          text-align: center;
          color: rgba(0, 255, 136, 0.8);
          font-weight: 500;
        }

        .recipients-summary strong {
          color: #00ff88;
          font-size: 1.2rem;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .interval-control {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .interval-slider {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 10px;
          outline: none;
          -webkit-appearance: none;
        }

        .interval-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          transition: all 0.3s ease;
        }

        .interval-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.8);
        }

        .interval-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          border: none;
        }

        .interval-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
        }

        .interval-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
        }

        .interval-label {
          color: rgba(0, 255, 136, 0.8);
          font-weight: 500;
        }

        .estimated-time {
          padding: 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 10px;
          text-align: center;
          color: rgba(0, 255, 136, 0.8);
        }

        .estimated-time strong {
          color: #00ff88;
        }

        .btn-send-bulk {
          padding: 1.5rem 3rem;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          border: none;
          border-radius: 16px;
          color: #000;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-send-bulk:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 48px rgba(0, 255, 136, 0.6);
        }

        .btn-send-bulk:active:not(:disabled) {
          transform: translateY(-2px) scale(0.98);
        }

        .btn-send-bulk:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .progress-panel {
          margin-top: 2rem;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(0, 255, 136, 0.4);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
        }

        .card-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .progress-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .progress-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .progress-stats .stat {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
        }

        .progress-stats .stat-label {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
        }

        .progress-stats .stat-value {
          color: #00ff88;
          font-size: 1.4rem;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }

        .progress-bar-container {
          width: 100%;
          height: 40px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(0, 255, 136, 0.3);
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          border-radius: 20px;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
          position: relative;
          overflow: hidden;
        }

        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          color: #000;
          font-weight: 700;
          font-size: 1rem;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }

        .stats-overview {
          margin-top: 2rem;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 16px;
        }

        .stats-grid-compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .stat-card-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .stat-card-compact:hover {
          border-color: rgba(0, 255, 136, 0.5);
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0, 255, 136, 0.2);
        }

        .stat-icon-compact {
          font-size: 2rem;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
        }

        .stat-value-compact {
          font-size: 1.8rem;
          font-weight: 700;
          color: #00ff88;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
        }

        .stat-label-compact {
          color: rgba(0, 255, 136, 0.7);
          font-size: 0.9rem;
          text-align: center;
        }

        .quick-guide {
          margin-top: 2rem;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 16px;
        }

        .guide-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #00ff88;
          margin: 0 0 1.5rem 0;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .guide-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .guide-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .guide-step:hover {
          background: rgba(0, 255, 136, 0.05);
          border-color: rgba(0, 255, 136, 0.3);
          transform: translateX(8px);
        }

        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: #000;
          border-radius: 50%;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.4);
          flex-shrink: 0;
        }

        .guide-step p {
          color: rgba(0, 255, 136, 0.8);
          margin: 0;
          line-height: 1.5;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .btn-link {
          padding: 0.8rem 1.5rem;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 10px;
          color: #00ff88;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .btn-link:hover {
          background: rgba(0, 255, 136, 0.2);
          border-color: rgba(0, 255, 136, 0.5);
          transform: translateX(5px);
        }

        /* Upload de Mídia */
        .upload-options {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: rgba(0, 255, 136, 0.1);
          border: 2px dashed rgba(0, 255, 136, 0.4);
          border-radius: 12px;
          color: #00ff88;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .upload-btn:hover {
          background: rgba(0, 255, 136, 0.2);
          border-color: #00ff88;
          border-style: solid;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .upload-icon {
          font-size: 1.3rem;
          filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.5));
        }

        .upload-separator {
          color: rgba(0, 255, 136, 0.5);
          font-weight: 500;
          padding: 0 0.5rem;
        }

        .upload-options .form-input {
          flex: 1;
          min-width: 250px;
        }

        /* Intervalo Aleatório */
        .interval-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(0, 255, 136, 0.08);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          margin-top: 1.5rem;
        }

        .summary-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.5));
        }

        .summary-text {
          color: rgba(0, 255, 136, 0.9);
          line-height: 1.5;
          flex: 1;
        }

        .summary-text strong {
          color: #00ff88;
          font-weight: 700;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .message-type-selector {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .recipients-tabs {
            flex-direction: column;
          }

          .stats-grid-compact {
            grid-template-columns: repeat(2, 1fr);
          }

          .section-header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .btn-send-bulk {
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
