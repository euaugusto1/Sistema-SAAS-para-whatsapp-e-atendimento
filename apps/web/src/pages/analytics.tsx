import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/auth-context';
import apiClient from '../lib/api/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface DashboardMetrics {
  overview: {
    totalMessages: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesFailed: number;
    deliveryRate: number;
    totalContacts: number;
    activeContacts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
  messagesByDay: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  messagesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    deliveryRate: number;
  }>;
  topContacts: Array<{
    id: string;
    name: string;
    phone: string;
    messageCount: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
    payments: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('last_30_days');

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/analytics/dashboard', {
        params: { period },
      });
      setMetrics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onClose={() => setError('')} />;
  if (!metrics) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-600">Métricas e insights do seu negócio</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="form-select"
        >
          <option value="last_7_days">Últimos 7 dias</option>
          <option value="last_30_days">Últimos 30 dias</option>
          <option value="last_90_days">Últimos 90 dias</option>
          <option value="this_month">Este mês</option>
          <option value="last_month">Mês passado</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-600">Mensagens Enviadas</div>
            <i className="bi bi-envelope text-blue-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold mb-2">
            {formatNumber(metrics.overview.messagesSent)}
          </div>
          <div className="text-sm text-green-600">
            Taxa de entrega: {metrics.overview.deliveryRate.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-600">Contatos Ativos</div>
            <i className="bi bi-people text-green-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold mb-2">
            {formatNumber(metrics.overview.activeContacts)}
          </div>
          <div className="text-sm text-gray-600">
            de {formatNumber(metrics.overview.totalContacts)} totais
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-600">Campanhas Ativas</div>
            <i className="bi bi-megaphone text-purple-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold mb-2">
            {formatNumber(metrics.overview.activeCampaigns)}
          </div>
          <div className="text-sm text-gray-600">
            de {formatNumber(metrics.overview.totalCampaigns)} totais
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-600">Receita Mensal</div>
            <i className="bi bi-currency-dollar text-yellow-500 text-2xl"></i>
          </div>
          <div className="text-3xl font-bold mb-2">
            {formatCurrency(metrics.overview.monthlyRevenue)}
          </div>
          <div className="text-sm text-gray-600">
            {metrics.overview.activeSubscriptions} assinaturas ativas
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Messages by Day */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Mensagens por Dia</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.messagesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#8884d8"
                name="Enviadas"
              />
              <Line
                type="monotone"
                dataKey="delivered"
                stroke="#82ca9d"
                name="Entregues"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ff8042"
                name="Falhas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Messages by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Status das Mensagens</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.messagesByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.status}: ${entry.percentage}%`}
              >
                {metrics.messagesByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance de Campanhas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.campaignPerformance.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="deliveredCount" fill="#82ca9d" name="Entregues" />
              <Bar dataKey="failedCount" fill="#ff8042" name="Falhas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Month */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Receita por Mês</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Contacts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Contatos</h2>
        <div className="overflow-x-auto">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Mensagens</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.name}</td>
                  <td>{contact.phone}</td>
                  <td>
                    <span className="badge bg-primary">{contact.messageCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
