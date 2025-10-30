import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/hooks';
import apiClient from '../lib/api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  messagesLimit: number | null;
  contactsLimit: number | null;
  features: any;
  isActive: boolean;
}

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'STRIPE' | 'MERCADOPAGO'>('STRIPE');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/payments/plans');
      setPlans(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    setSelectedPlan(plan);
    // In a real implementation, you would:
    // 1. Collect payment method (Stripe Elements or MercadoPago SDK)
    // 2. Create subscription with payment method ID
    
    try {
      const response = await apiClient.post('/payments/subscriptions', {
        planId: plan.id,
        interval: billingInterval,
        paymentProvider,
        // paymentMethodId would come from Stripe/MercadoPago SDK
      });

      alert('Assinatura criada com sucesso!');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar assinatura');
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getFeatureValue = (feature: any) => {
    if (feature === null) return 'Ilimitado';
    if (typeof feature === 'boolean') return feature ? 'Sim' : 'Não';
    return feature;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
        <p className="text-gray-600 mb-8">
          Selecione o plano ideal para o seu negócio
        </p>

        {/* Billing Interval Toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          <button
            onClick={() => setBillingInterval('MONTHLY')}
            className={`px-6 py-2 rounded-md transition-colors ${
              billingInterval === 'MONTHLY'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingInterval('YEARLY')}
            className={`px-6 py-2 rounded-md transition-colors ${
              billingInterval === 'YEARLY'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Anual
            <span className="ml-2 text-xs text-green-600 font-semibold">
              -17%
            </span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-8 shadow-lg transition-all hover:shadow-xl ${
              plan.name === 'Profissional'
                ? 'border-blue-500 scale-105'
                : 'border-gray-200'
            }`}
          >
            {plan.name === 'Profissional' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                Mais Popular
              </div>
            )}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">
                {formatPrice(
                  billingInterval === 'MONTHLY'
                    ? plan.priceMonthly
                    : plan.priceYearly / 12
                )}
              </span>
              <span className="text-gray-600">/mês</span>
              {billingInterval === 'YEARLY' && (
                <div className="text-sm text-gray-500 mt-1">
                  {formatPrice(plan.priceYearly)} cobrado anualmente
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                <span className="text-sm">
                  {plan.messagesLimit
                    ? `${plan.messagesLimit} mensagens/mês`
                    : 'Mensagens ilimitadas'}
                </span>
              </li>
              <li className="flex items-start">
                <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                <span className="text-sm">
                  {plan.contactsLimit
                    ? `${plan.contactsLimit} contatos`
                    : 'Contatos ilimitados'}
                </span>
              </li>
              {plan.features.whatsappInstances && (
                <li className="flex items-start">
                  <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                  <span className="text-sm">
                    {plan.features.whatsappInstances === null
                      ? 'Instâncias ilimitadas'
                      : `${plan.features.whatsappInstances} instâncias WhatsApp`}
                  </span>
                </li>
              )}
              {plan.features.templates && (
                <li className="flex items-start">
                  <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                  <span className="text-sm">Templates de mensagens</span>
                </li>
              )}
              {plan.features.analytics && (
                <li className="flex items-start">
                  <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                  <span className="text-sm">Analytics e relatórios</span>
                </li>
              )}
              {plan.features.automation && (
                <li className="flex items-start">
                  <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                  <span className="text-sm">Automações</span>
                </li>
              )}
              <li className="flex items-start">
                <i className="bi bi-check-circle-fill text-green-500 mr-2 mt-1"></i>
                <span className="text-sm">
                  Suporte: {plan.features.support}
                </span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                plan.name === 'Profissional'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {plan.priceMonthly === 0 ? 'Começar Grátis' : 'Assinar Agora'}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Provider Selection */}
      <div className="mt-12 max-w-2xl mx-auto text-center">
        <h3 className="text-lg font-semibold mb-4">Forma de Pagamento</h3>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setPaymentProvider('STRIPE')}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              paymentProvider === 'STRIPE'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="font-semibold">Stripe</span>
            <div className="text-xs text-gray-600">Cartão Internacional</div>
          </button>
          <button
            onClick={() => setPaymentProvider('MERCADOPAGO')}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              paymentProvider === 'MERCADOPAGO'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="font-semibold">Mercado Pago</span>
            <div className="text-xs text-gray-600">PIX, Boleto, Cartão</div>
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Perguntas Frequentes
        </h2>
        <div className="space-y-4">
          <details className="bg-white rounded-lg p-6 shadow">
            <summary className="font-semibold cursor-pointer">
              Posso mudar de plano depois?
            </summary>
            <p className="mt-2 text-gray-600">
              Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer
              momento. As alterações serão aplicadas no próximo ciclo de
              cobrança.
            </p>
          </details>
          <details className="bg-white rounded-lg p-6 shadow">
            <summary className="font-semibold cursor-pointer">
              Como funciona o período de teste?
            </summary>
            <p className="mt-2 text-gray-600">
              Todos os planos pagos incluem 7 dias de teste grátis. Você só
              será cobrado após o período de teste, e pode cancelar a qualquer
              momento.
            </p>
          </details>
          <details className="bg-white rounded-lg p-6 shadow">
            <summary className="font-semibold cursor-pointer">
              Quais formas de pagamento são aceitas?
            </summary>
            <p className="mt-2 text-gray-600">
              Aceitamos cartões de crédito via Stripe (internacional) e PIX,
              boleto ou cartão via Mercado Pago (Brasil).
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
