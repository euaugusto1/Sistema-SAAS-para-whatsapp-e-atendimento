import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  messagesByHour: Array<{
    hour: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  recipientsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  errorsByType: Array<{
    error: string;
    count: number;
  }>;
  timeline: Array<{
    timestamp: Date;
    event: string;
    count: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function CampaignAnalyticsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadAnalytics();
    }
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/analytics/campaigns/${id}`);
      setAnalytics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      DRAFT: 'badge bg-secondary',
      SCHEDULED: 'badge bg-info',
      SENDING: 'badge bg-warning',
      COMPLETED: 'badge bg-success',
      FAILED: 'badge bg-danger',
      PAUSED: 'badge bg-secondary',
    };
    return badges[status] || 'badge bg-secondary';
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onClose={() => setError('')} />;
  if (!analytics) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="btn btn-outline-secondary mb-4"
        >
          <i className="bi bi-arrow-left mr-2"></i>
          Voltar
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{analytics.campaignName}</h1>
            <p className="text-gray-600">Analytics da Campanha</p>
          </div>
          <span className={getStatusBadge(analytics.status)}>
            {analytics.status}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-2">Total de Destinatários</div>
          <div className="text-3xl font-bold">
            {formatNumber(analytics.totalRecipients)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-2">Enviadas</div>
          <div className="text-3xl font-bold text-blue-600">
            {formatNumber(analytics.sentCount)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-2">Entregues</div>
          <div className="text-3xl font-bold text-green-600">
            {formatNumber(analytics.deliveredCount)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-2">Falhas</div>
          <div className="text-3xl font-bold text-red-600">
            {formatNumber(analytics.failedCount)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-2">Taxa de Entrega</div>
          <div className="text-3xl font-bold text-purple-600">
            {analytics.deliveryRate.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-4">Tempo Médio de Entrega</div>
          <div className="text-4xl font-bold text-indigo-600">
            {analytics.averageDeliveryTime.toFixed(2)}s
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-4">Progresso</div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{
                width: `${(analytics.sentCount / analytics.totalRecipients) * 100}%`,
              }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            {analytics.sentCount} de {analytics.totalRecipients} (
            {((analytics.sentCount / analytics.totalRecipients) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Messages by Hour */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Mensagens por Hora</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.messagesByHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
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

        {/* Recipients by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Destinatários por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.recipientsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.status}: ${entry.percentage}%`}
              >
                {analytics.recipientsByStatus.map((entry, index) => (
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
        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Timeline de Eventos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR')}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Eventos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Errors by Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Erros</h2>
          {analytics.errorsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.errorsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="error" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <i className="bi bi-check-circle text-6xl text-green-500 mb-4"></i>
                <p>Nenhum erro registrado!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error List */}
      {analytics.errorsByType.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Lista de Erros</h2>
          <div className="overflow-x-auto">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Mensagem de Erro</th>
                  <th className="text-right">Ocorrências</th>
                  <th className="text-right">Porcentagem</th>
                </tr>
              </thead>
              <tbody>
                {analytics.errorsByType.map((error, index) => {
                  const totalErrors = analytics.errorsByType.reduce(
                    (sum, e) => sum + e.count,
                    0,
                  );
                  const percentage = (error.count / totalErrors) * 100;

                  return (
                    <tr key={index}>
                      <td>{error.error}</td>
                      <td className="text-right">
                        <span className="badge bg-danger">{error.count}</span>
                      </td>
                      <td className="text-right">{percentage.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
