# 📱 Sistema de Mensagens WhatsApp - Guia Rápido

## ✅ Status: PRONTO PARA USO

Sistema completo de envio de mensagens WhatsApp com suporte a **texto e mídia** (imagens, vídeos, áudios e documentos).

## 🚀 Como Usar

### 1. Certifique-se que a instância está conectada

```bash
GET http://localhost:3001/whatsapp
```

Verifique se o `status` é `CONNECTED`. Se não estiver:

```bash
# Conectar
POST http://localhost:3001/whatsapp/{instanceId}/connect

# Gerar QR Code
GET http://localhost:3001/whatsapp/{instanceId}/qrcode
```

### 2. Enviar Mensagem de Texto

```bash
POST http://localhost:3001/messages
Content-Type: application/json
Authorization: Bearer {seu_token}

{
  "instanceId": "sua-instancia-id",
  "to": "5511999999999",
  "message": "Olá! Como posso ajudar?",
  "organizationId": "sua-org-id"
}
```

### 3. Enviar Imagem

```bash
POST http://localhost:3001/messages
Content-Type: application/json
Authorization: Bearer {seu_token}

{
  "instanceId": "sua-instancia-id",
  "to": "5511999999999",
  "message": "Confira esta imagem!",
  "organizationId": "sua-org-id",
  "mediaUrl": "https://picsum.photos/200",
  "mediaType": "image"
}
```

### 4. Enviar Vídeo

```bash
{
  "instanceId": "sua-instancia-id",
  "to": "5511999999999",
  "message": "Assista este vídeo!",
  "organizationId": "sua-org-id",
  "mediaUrl": "https://example.com/video.mp4",
  "mediaType": "video"
}
```

### 5. Enviar Documento

```bash
{
  "instanceId": "sua-instancia-id",
  "to": "5511999999999",
  "message": "Segue o documento em anexo",
  "organizationId": "sua-org-id",
  "mediaUrl": "https://example.com/documento.pdf",
  "mediaType": "document"
}
```

### 6. Listar Mensagens

```bash
GET http://localhost:3001/messages?page=1&limit=50
```

Filtros disponíveis:
- `status`: PENDING, SENT, DELIVERED, READ, FAILED
- `instanceId`: UUID da instância
- `campaignId`: UUID da campanha
- `phone`: Número de telefone

### 7. Ver Estatísticas

```bash
GET http://localhost:3001/messages/stats
```

Retorna:
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

### 8. Reenviar Mensagem que Falhou

```bash
POST http://localhost:3001/messages/{messageId}/retry
```

## 📋 Tipos de Mídia Suportados

| Tipo | Formatos | MimeType Padrão |
|------|----------|-----------------|
| `image` | PNG, JPG, JPEG, GIF | image/png |
| `video` | MP4, AVI, MOV | video/mp4 |
| `audio` | MP3, WAV, OGG | audio/mp3 |
| `document` | PDF, DOC, DOCX, XLS, XLSX | application/pdf |

## 🔍 Acompanhar Envio

1. **Status da Mensagem:**
   - `PENDING`: Aguardando envio
   - `SENT`: Enviada com sucesso
   - `DELIVERED`: Entregue
   - `READ`: Lida
   - `FAILED`: Falhou

2. **Verificar Status:**
```bash
GET http://localhost:3001/messages/{messageId}
```

3. **Sistema Automático:**
   - ✅ 3 tentativas automáticas em caso de falha
   - ✅ Retry exponencial (1s, 2s, 4s)
   - ✅ Contato criado automaticamente se não existir

## ⚙️ Configuração

Verifique o arquivo `.env`:

```env
# Evolution API
EVOLUTION_API_URL=https://dev.evo.sistemabrasil.online
EVOLUTION_API_KEY=sua_chave_aqui

# Redis (para filas)
REDIS_HOST=localhost
REDIS_PORT=6379

# Supabase
DATABASE_URL=postgresql://...
```

## 🐛 Troubleshooting

### Mensagens ficam em PENDING

**Problema:** Redis não está rodando

**Solução:**
```bash
docker-compose up -d redis
```

### Erro "Instance not found"

**Problema:** Instância não existe ou está desconectada

**Solução:**
1. Verificar instâncias: `GET /whatsapp`
2. Conectar: `POST /whatsapp/{id}/connect`
3. Gerar QR: `GET /whatsapp/{id}/qrcode`

### Erro "Invalid phone number"

**Problema:** Número no formato incorreto

**Solução:** Use o formato completo com DDI:
- ✅ Correto: `5511999999999`
- ❌ Errado: `11999999999` ou `+55 11 99999-9999`

## 📚 Documentação Completa

Para mais detalhes, consulte:

- [Sistema de Mensagens Completo](./SISTEMA_MENSAGENS.md)
- [Evolution API - Guia](./EVOLUTION_API.md)
- [Implementação Detalhada](./IMPLEMENTACAO_MENSAGENS_COMPLETA.md)

## ✨ Recursos

- ✅ Envio de texto
- ✅ Envio de mídia (imagem, vídeo, áudio, documento)
- ✅ Validação automática de telefone
- ✅ Criação automática de contatos
- ✅ Sistema de filas (Bull)
- ✅ Retry automático (3 tentativas)
- ✅ Estatísticas em tempo real
- ✅ Paginação e filtros
- ✅ Webhooks (estrutura pronta)

---

**Versão:** 2.0.0  
**Status:** ✅ Production Ready  
**Última atualização:** 29/10/2025
