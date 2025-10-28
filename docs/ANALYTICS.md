# Analytics - Sistema de Métricas e Dashboards

Sistema completo de analytics com métricas em tempo real, dashboards interativos e visualizações de dados.

## 📊 Funcionalidades

### Backend
- ✅ Métricas de mensagens (enviadas, entregues, falhas, taxa de entrega)
- ✅ Métricas de campanhas (performance, taxa de conversão)
- ✅ Métricas de contatos (ativos, engajamento)
- ✅ Métricas de receita (MRR, ARR, churn rate, LTV)
- ✅ Análises por período (7 dias, 30 dias, 90 dias, mês atual, mês passado)
- ✅ Análises detalhadas de campanhas
- ✅ Top contatos por engajamento
- ✅ Timeline de eventos
- ✅ Análise de erros

### Frontend
- ✅ Dashboard principal com overview
- ✅ Gráficos interativos (linha, barra, pizza)
- ✅ Página de analytics da campanha
- ✅ Filtros por período
- ✅ Cards de métricas principais
- ✅ Tabelas de dados
- ✅ Visualizações responsivas

## 🎯 Endpoints da API

### Dashboard Geral
```typescript
GET /analytics/dashboard
Query Params:
  - period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month' | 'custom'
  - startDate?: string (ISO date)
  - endDate?: string (ISO date)
  - metrics?: string[] (opcional, filtrar métricas específicas)

Response: DashboardMetrics
{
  overview: {
    totalMessages: number
    messagesSent: number
    messagesDelivered: number
    messagesFailed: number
    deliveryRate: number
    totalContacts: number
    activeContacts: number
    totalCampaigns: number
    activeCampaigns: number
    totalRevenue: number
    monthlyRevenue: number
    activeSubscriptions: number
  }
  messagesByDay: Array<{
    date: string
    sent: number
    delivered: number
    failed: number
  }>
  messagesByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  campaignPerformance: Array<{
    id: string
    name: string
    totalRecipients: number
    sentCount: number
    deliveredCount: number
    failedCount: number
    deliveryRate: number
  }>
  topContacts: Array<{
    id: string
    name: string
    phone: string
    messageCount: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    subscriptions: number
    payments: number
  }>
}
```

### Analytics de Mensagens
```typescript
GET /analytics/messages
Query Params:
  - period: 'last_7_days' | 'last_30_days' | etc
  - startDate?: string
  - endDate?: string
  - groupByHours?: number (agrupar por X horas)

Response: MessageAnalytics
{
  totalMessages: number
  sentMessages: number
  deliveredMessages: number
  failedMessages: number
  deliveryRate: number
  averageDeliveryTime: number (em segundos)
  messagesByDirection: {
    inbound: number
    outbound: number
  }
  messagesByHour: Array<{
    hour: string
    count: number
  }>
  messagesByDay: Array<{
    date: string
    count: number
  }>
  messagesByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  topErrorMessages: Array<{
    error: string
    count: number
  }>
}
```

### Analytics de Receita
```typescript
GET /analytics/revenue
Query Params:
  - period: 'this_month' | 'last_month' | etc
  - startDate?: string
  - endDate?: string

Response: RevenueAnalytics
{
  totalRevenue: number
  monthlyRevenue: number
  yearlyRevenue: number
  averageRevenuePerUser: number
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  paymentSuccessRate: number
  revenueByMonth: Array<{
    month: string
    revenue: number
    payments: number
  }>
  revenueByPlan: Array<{
    plan: string
    revenue: number
    subscriptions: number
  }>
  revenueByProvider: Array<{
    provider: string
    revenue: number
    payments: number
  }>
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  churnRate: number
  ltv: number // Lifetime Value
}
```

### Analytics de Campanha Específica
```typescript
GET /analytics/campaigns/:id
Query Params:
  - period: 'last_7_days' | etc
  - startDate?: string
  - endDate?: string

Response: CampaignAnalytics
{
  campaignId: string
  campaignName: string
  status: string
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  deliveryRate: number
  averageDeliveryTime: number (em segundos)
  messagesByHour: Array<{
    hour: string
    sent: number
    delivered: number
    failed: number
  }>
  recipientsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  errorsByType: Array<{
    error: string
    count: number
  }>
  timeline: Array<{
    timestamp: Date
    event: string
    count: number
  }>
}
```

## 💻 Como Usar

### Backend

1. **Importar o módulo** no `app.module.ts`:
```typescript
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // ... outros módulos
    AnalyticsModule,
  ],
})
export class AppModule {}
```

2. **Usar o serviço** em outros módulos:
```typescript
import { AnalyticsService } from './analytics/analytics.service';

constructor(private analyticsService: AnalyticsService) {}

async getMetrics() {
  const metrics = await this.analyticsService.getDashboardMetrics(
    organizationId,
    { period: MetricPeriod.LAST_30_DAYS }
  );
  return metrics;
}
```

### Frontend

1. **Instalar dependências**:
```bash
npm install recharts
```

2. **Acessar as páginas**:
- Dashboard Analytics: `/analytics`
- Analytics de Campanha: `/campaign-analytics?id=CAMPAIGN_ID`

3. **Usar os componentes**:
```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

// Gráfico de linha
<LineChart data={data}>
  <Line dataKey="sent" stroke="#8884d8" />
</LineChart>

// Gráfico de barras
<BarChart data={data}>
  <Bar dataKey="count" fill="#82ca9d" />
</BarChart>

// Gráfico de pizza
<PieChart>
  <Pie data={data} dataKey="value" nameKey="name" />
</PieChart>
```

## 🎨 Componentes de Visualização

### Cards de Métricas
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="text-gray-600">Título</div>
    <i className="bi bi-icon text-blue-500 text-2xl"></i>
  </div>
  <div className="text-3xl font-bold">{value}</div>
  <div className="text-sm text-gray-600">Descrição</div>
</div>
```

### Gráficos Responsivos
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
```

## 📈 Métricas Calculadas

### Taxa de Entrega
```typescript
deliveryRate = (messagesDelivered / totalMessages) * 100
```

### Tempo Médio de Entrega
```typescript
averageDeliveryTime = SUM(deliveredAt - sentAt) / COUNT(delivered)
```

### MRR (Monthly Recurring Revenue)
```typescript
mrr = SUM(activeSubscriptions.plan.priceMonthly)
```

### ARR (Annual Recurring Revenue)
```typescript
arr = mrr * 12
```

### Churn Rate
```typescript
churnRate = (canceledSubscriptions / totalSubscriptions) * 100
```

### LTV (Lifetime Value)
```typescript
ltv = averageRevenuePerUser / (churnRate / 100)
```

## 🔧 Otimizações

### Queries SQL Otimizadas
- Uso de `DATE_TRUNC` para agrupamentos por data
- Índices nas colunas de data (`sent_at`, `paid_at`, etc.)
- Agregações no banco de dados (não em memória)
- Paginação para grandes volumes de dados

### Performance Frontend
- Lazy loading de gráficos
- Debounce em filtros
- Cache de métricas
- Virtualização de listas grandes

### Exemplo de Query Otimizada
```sql
SELECT 
  DATE(sent_at) as date,
  status,
  COUNT(*) as count
FROM messages
WHERE organization_id = $1
  AND sent_at >= $2
  AND sent_at <= $3
GROUP BY DATE(sent_at), status
ORDER BY date ASC
```

## 🎯 Casos de Uso

### 1. Dashboard Executivo
```typescript
// Métricas gerais dos últimos 30 dias
const metrics = await analyticsService.getDashboardMetrics(
  organizationId,
  { period: MetricPeriod.LAST_30_DAYS }
);

// Exibir: mensagens, contatos, campanhas, receita
```

### 2. Análise de Campanha
```typescript
// Analytics detalhado de uma campanha
const analytics = await analyticsService.getCampaignAnalytics(
  campaignId,
  { period: MetricPeriod.CUSTOM, startDate, endDate }
);

// Exibir: performance, timeline, erros
```

### 3. Relatório Financeiro
```typescript
// Métricas de receita do mês atual
const revenue = await analyticsService.getRevenueAnalytics(
  organizationId,
  { period: MetricPeriod.THIS_MONTH }
);

// Exibir: MRR, ARR, churn, LTV
```

### 4. Monitoramento de Mensagens
```typescript
// Análise de mensagens dos últimos 7 dias
const messages = await analyticsService.getMessageAnalytics(
  organizationId,
  { period: MetricPeriod.LAST_7_DAYS }
);

// Exibir: taxa de entrega, erros, horários de pico
```

## 🚀 Próximas Melhorias

- [ ] Exportação de relatórios (PDF, CSV, Excel)
- [ ] Alertas automáticos (taxa de entrega baixa, erros em massa)
- [ ] Comparação entre períodos
- [ ] Métricas em tempo real (WebSocket)
- [ ] Dashboards customizáveis
- [ ] Análise preditiva (ML)
- [ ] Segmentação avançada de dados
- [ ] Integração com Google Analytics
- [ ] Benchmarking (comparação com médias do mercado)
- [ ] A/B testing de campanhas

## 🔐 Segurança

- ✅ Todas as rotas protegidas com JWT
- ✅ Validação de permissões por organização
- ✅ Rate limiting aplicado
- ✅ Validação de inputs (DTOs)
- ✅ Sanitização de dados
- ✅ Queries parametrizadas (SQL injection protection)

## 📚 Referências

- [Recharts Documentation](https://recharts.org/)
- [SaaS Metrics Guide](https://www.saastr.com/saas-metrics/)
- [PostgreSQL Date Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [NestJS Documentation](https://docs.nestjs.com/)

---

**Desenvolvido com ❤️ para fornecer insights valiosos do seu negócio SaaS**
