import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import apiClient from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: string;
    priceMonthly: number;
    priceYearly: number;
  };
  paymentProvider: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paidAt: string | null;
  createdAt: string;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptions();
    loadPayments();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await apiClient.get('/payments/subscriptions');
      setSubscriptions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await apiClient.get('/payments/payments');
      setPayments(response.data.payments);
    } catch (err: any) {
      console.error('Erro ao carregar pagamentos:', err);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;

    try {
      await apiClient.post('/payments/subscriptions/cancel', {
        subscriptionId,
        cancelImmediately: false, // Cancel at period end
      });

      alert('Assinatura cancelada com sucesso!');
      loadSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar assinatura');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ACTIVE: 'badge bg-success',
      TRIALING: 'badge bg-info',
      PAST_DUE: 'badge bg-warning',
      CANCELLED: 'badge bg-danger',
    };
    return badges[status] || 'badge bg-secondary';
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      SUCCEEDED: 'badge bg-success',
      PENDING: 'badge bg-warning',
      FAILED: 'badge bg-danger',
      REFUNDED: 'badge bg-info',
    };
    return badges[status] || 'badge bg-secondary';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Minha Assinatura</h1>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* Active Subscriptions */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Assinaturas Ativas</h2>
        
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <i className="bi bi-credit-card text-gray-400 text-6xl mb-4"></i>
            <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
            <p className="text-gray-600 mb-4">
              Assine um plano para começar a usar a plataforma
            </p>
            <a
              href="/plans"
              className="btn btn-primary"
            >
              Ver Planos
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">
                      Plano {subscription.plan.name}
                    </h3>
                    <p className="text-gray-600">
                      Via {subscription.paymentProvider === 'STRIPE' ? 'Stripe' : 'Mercado Pago'}
                    </p>
                  </div>
                  <span className={getStatusBadge(subscription.status)}>
                    {subscription.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Período Atual</span>
                    <p className="font-semibold">
                      {formatDate(subscription.currentPeriodStart)} -{' '}
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Próxima Cobrança</span>
                    <p className="font-semibold">
                      {formatPrice(subscription.plan.priceMonthly, 'BRL')}
                      {subscription.cancelAtPeriodEnd && (
                        <span className="text-warning ml-2">
                          (Cancelada)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a href="/plans" className="btn btn-outline-primary btn-sm">
                    <i className="bi bi-arrow-up-circle mr-2"></i>
                    Fazer Upgrade
                  </a>
                  {!subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={() => handleCancelSubscription(subscription.id)}
                      className="btn btn-outline-danger btn-sm"
                    >
                      <i className="bi bi-x-circle mr-2"></i>
                      Cancelar Assinatura
                    </button>
                  )}
                </div>

                {subscription.cancelAtPeriodEnd && (
                  <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded">
                    <i className="bi bi-exclamation-triangle text-warning mr-2"></i>
                    Sua assinatura será cancelada em{' '}
                    <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Histórico de Pagamentos</h2>
        
        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nenhum pagamento registrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Método</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paidAt || payment.createdAt)}</td>
                    <td className="font-semibold">
                      {formatPrice(payment.amount, payment.currency)}
                    </td>
                    <td>
                      <span className={getPaymentStatusBadge(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      {payment.paymentProvider === 'STRIPE' ? 'Stripe' : 'Mercado Pago'}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-download mr-1"></i>
                        Nota Fiscal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
