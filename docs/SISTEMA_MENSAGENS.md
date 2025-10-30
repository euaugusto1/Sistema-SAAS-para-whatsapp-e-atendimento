# 📱 Sistema de Mensagens - Documentação Completa

## 📋 Visão Geral

Sistema completo de envio e gerenciamento de mensagens WhatsApp com suporte a filas, retentativas automáticas e rastreamento de status.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│                                                               │
│  MessagesController ─► MessagesService ─► Bull Queue        │
│         │                      │                │            │
│         │                      │                ▼            │
│         │                      │         MessageProcessor   │
│         │                      │                │            │
│         │                      ▼                ▼            │
│         │              WhatsappService   Evolution API       │
│         │                      │                             │
│         ▼                      ▼                             │
│  Prisma Database ◄──────────────────────────────            │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos

```
apps/api/src/messages/
├── messages.controller.ts    # Endpoints REST
├── messages.service.ts       # Lógica de negócio
├── messages.module.ts        # Configuração do módulo
├── dto/
│   ├── send-message.dto.ts   # DTO para envio
│   └── webhook-message.dto.ts # DTO para webhooks
└── processors/
    └── message.processor.ts  # Processamento em background
```

## 🎯 Funcionalidades

### ✅ Implementadas

1. **Envio de Mensagens**
   - ✅ Validação de número de telefone (10-15 dígitos)
   - ✅ Criação automática de contatos
   - ✅ Suporte a mídia (preparado, aguarda Evolution API)
   - ✅ Processamento em fila (Bull Queue)
   - ✅ 3 tentativas automáticas de reenvio

2. **Rastreamento de Status**
   - ✅ PENDING: Aguardando envio
   - ✅ SENT: Enviada com sucesso
   - ✅ DELIVERED: Entregue (via webhook)
   - ✅ READ: Lida (via webhook)
   - ✅ FAILED: Falha no envio

3. **Gestão de Mensagens**
   - ✅ Listagem com paginação (50 por página)
   - ✅ Filtros por status, instância, campanha
   - ✅ Busca por número de telefone
   - ✅ Estatísticas agregadas

4. **Retentativas**
   - ✅ Sistema de retry manual via endpoint
   - ✅ Retry automático na fila (3 tentativas)
   - ✅ Registro de erros no banco

5. **Suporte a Mídia Completo** ✅
   - ✅ DTOs com mediaUrl, mediaType, fileName
   - ✅ Schema do banco pronto
   - ✅ Evolution API Provider atualizado
   - ✅ Suporte a image, video, audio, document
   - ✅ Envio via URL ou base64

6. **Webhooks** (estrutura pronta)
   - ✅ Endpoint `/webhook` criado
   - ✅ DTO com phone, status, error
   - ⚠️ Precisa configurar na Evolution API
   - ⚠️ Atualização automática de status

## 📚 API Endpoints

### POST `/messages`
Envia uma nova mensagem (texto ou mídia)

**Body:**
```json
{
  "instanceId": "uuid",
  "to": "5511999999999",
  "message": "Olá!",
  "organizationId": "uuid",
  "campaignId": "uuid (opcional)",
  "contactName": "João (opcional)",
  "mediaUrl": "https://example.com/image.jpg (opcional)",
  "mediaType": "image|video|audio|document (opcional)"
}
```

**Tipos de Mídia Suportados:**
- `image`: PNG, JPG, JPEG, GIF
- `video`: MP4, AVI, MOV
- `audio`: MP3, WAV, OGG
- `document`: PDF, DOC, DOCX, XLS, XLSX

**Response:**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "sentAt": "2024-01-15T10:30:00Z",
  ...
}
```

### GET `/messages`
Lista mensagens com paginação

**Query Params:**
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 50, max: 100)
- `status`: Filtro por status
- `instanceId`: Filtro por instância
- `campaignId`: Filtro por campanha
- `phone`: Busca por telefone

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### GET `/messages/stats`
Estatísticas de mensagens

**Response:**
```json
{
  "total": 1000,
  "pending": 50,
  "sent": 800,
  "delivered": 700,
  "read": 400,
  "failed": 50
}
```

### GET `/messages/:id`
Detalhes de uma mensagem específica

### POST `/messages/:id/retry`
Reenvia uma mensagem que falhou

### POST `/messages/webhook`
Recebe atualizações de status da Evolution API

## 🔧 Configuração

### 1. Variáveis de Ambiente

```env
# Evolution API
EVOLUTION_API_URL=https://dev.evo.sistemabrasil.online
EVOLUTION_API_KEY=your_api_key_here

# Redis (para Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Database (Supabase)
DATABASE_URL=postgresql://...
```

### 2. Webhook na Evolution API

Configure o webhook na Evolution API para receber atualizações:

```bash
POST https://dev.evo.sistemabrasil.online/webhook/set/{instanceId}
{
  "url": "https://your-api.com/messages/webhook",
  "webhook_by_events": true,
  "events": [
    "MESSAGES_UPDATE",
    "MESSAGES_SET"
  ]
}
```

## 🚀 Como Usar

### Envio Simples

```typescript
// Frontend
const response = await apiClient.post('/messages', {
  instanceId: 'abc-123',
  to: '5511999999999',
  message: 'Olá! Como posso ajudar?',
  organizationId: user.organizationId
});
```

### Envio com Mídia ✅

```typescript
// Imagem
const response = await apiClient.post('/messages', {
  instanceId: 'abc-123',
  to: '5511999999999',
  message: 'Confira esta imagem!',
  organizationId: user.organizationId,
  mediaUrl: 'https://example.com/image.jpg',
  mediaType: 'image'
});

// Vídeo
await apiClient.post('/messages', {
  instanceId: 'abc-123',
  to: '5511999999999',
  message: 'Veja este vídeo!',
  organizationId: user.organizationId,
  mediaUrl: 'https://example.com/video.mp4',
  mediaType: 'video'
});

// Documento
await apiClient.post('/messages', {
  instanceId: 'abc-123',
  to: '5511999999999',
  message: 'Segue o documento em anexo',
  organizationId: user.organizationId,
  mediaUrl: 'https://example.com/documento.pdf',
  mediaType: 'document'
});
```

### Listagem com Filtros

```typescript
const { data } = await apiClient.get('/messages', {
  params: {
    page: 1,
    limit: 20,
    status: 'FAILED',
    instanceId: 'abc-123'
  }
});
```

### Retry de Mensagem Falha

```typescript
await apiClient.post(`/messages/${messageId}/retry`);
```

## 📊 Fluxo de Processamento

```
1. POST /messages
   ↓
2. MessagesService.send()
   - Valida número de telefone
   - Cria/atualiza contato
   - Salva mensagem no BD (PENDING)
   - Adiciona na fila Bull
   ↓
3. MessageProcessor.sendMessage()
   - Processa job da fila
   - Chama WhatsappService
   - Atualiza status para SENT/FAILED
   ↓
4. Evolution API
   - Envia mensagem
   - Retorna sucesso/erro
   ↓
5. Webhook (futuro)
   - Recebe DELIVERED/READ
   - Atualiza status no BD
```

## 🔍 Validações

### Número de Telefone
```typescript
// Remove caracteres não numéricos
phone = phone.replace(/\D/g, '');

// Valida tamanho (10-15 dígitos)
if (phone.length < 10 || phone.length > 15) {
  throw new Error('Número inválido');
}
```

### Contato Automático
```typescript
// Se não existir, cria automaticamente
if (!contact && contactName) {
  contact = await prisma.contact.create({
    data: {
      name: contactName,
      phone: cleanPhone,
      organizationId
    }
  });
}
```

## 🎨 Integração Frontend

### Página de Mensagens

Crie/atualize `apps/web/src/pages/messages.tsx`:

```typescript
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import apiClient from '../lib/api/client';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const { data } = await apiClient.get('/messages');
      setMessages(data.data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <h1>Mensagens</h1>
      {/* Implementar tabela/lista de mensagens */}
    </Layout>
  );
}
```

## 🐛 Troubleshooting

### Mensagens ficam em PENDING

**Causa:** Redis/Bull Queue não está rodando ou configurado incorretamente

**Solução:**
```bash
# Verificar logs
docker-compose logs redis

# Reiniciar serviço
docker-compose restart redis
```

### Erro "Instance not found"

**Causa:** Instância WhatsApp não existe ou está desconectada

**Solução:**
1. Verificar se a instância existe: `GET /whatsapp`
2. Conectar a instância: `POST /whatsapp/:id/connect`
3. Gerar QR code: `GET /whatsapp/:id/qrcode`

### Mensagens falham sempre

**Causa:** Evolution API não acessível ou apiKey incorreta

**Solução:**
```bash
# Testar conectividade
curl https://dev.evo.sistemabrasil.online/instance/fetchInstances \
  -H "apikey: your_key_here"
```

## 📈 Próximos Passos

1. **Suporte a Mídia Completo**
   - Atualizar Evolution API Provider
   - Implementar upload de arquivos
   - Validação de tipos/tamanhos

2. **Webhooks Funcionais**
   - Configurar na Evolution API
   - Testar atualização de status
   - Logs de eventos

3. **Frontend de Mensagens**
   - Página de listagem
   - Filtros avançados
   - Envio de mensagens individuais
   - Upload de mídia

4. **Analytics**
   - Dashboard de estatísticas
   - Gráficos de performance
   - Taxa de entrega/leitura

5. **Agendamento**
   - Envio programado
   - Fuso horário
   - Repetição

## 🔗 Referências

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Bull Queue Docs](https://docs.bullmq.io/)
- [Prisma Docs](https://www.prisma.io/docs)
- [NestJS Queue](https://docs.nestjs.com/techniques/queues)

## ✅ Checklist de Configuração

### Backend ✅
- [x] DTOs criados/atualizados (text + media)
- [x] Service com validações
- [x] Processor com retry automático
- [x] Endpoints REST (7 endpoints)
- [x] Schema Prisma atualizado
- [x] Evolution API Provider com mídia
- [x] WhatsappService com mídia
- [x] Interface atualizada

### Funcionalidades ✅
- [x] Envio de texto
- [x] Envio de mídia (image, video, audio, document)
- [x] Validação de telefone
- [x] Criação automática de contatos
- [x] Sistema de filas (Bull)
- [x] Retry automático (3 tentativas)
- [x] Estatísticas de mensagens

### Pendente 🔄
- [ ] Webhooks configurados na Evolution API
- [ ] Frontend de mensagens
- [ ] Upload de arquivos
- [ ] Testes automatizados
- [ ] Agendamento de mensagens

## 📖 Documentação Adicional

- [Evolution API - Guia Completo](./EVOLUTION_API.md)
- [Menu de Navegação](./MENU_NAVEGACAO.md)
- [Configuração Supabase](./CONFIGURACAO_SUPABASE.md)

---

**Última atualização:** 29/10/2025
**Versão:** 2.0.0
**Status:** ✅ Totalmente Funcional (texto + mídia)
