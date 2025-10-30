# 📡 Configuração Evolution API - Guia Completo

## 🎯 Visão Geral

Guia completo para configurar e integrar a Evolution API v2 no sistema de mensagens WhatsApp.

## 🔗 Endpoints da Evolution API

### Base URL
```
https://dev.evo.sistemabrasil.online
```

## 📨 Envio de Mensagens

### 1. Texto Simples

**Endpoint:** `POST /message/sendText/{instance}`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "your_api_key_here"
}
```

**Body:**
```json
{
  "number": "5511999999999",
  "text": "Olá! Como posso ajudar?",
  "delay": 0,
  "linkPreview": true
}
```

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá!"
    }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

### 2. Envio de Mídia

**Endpoint:** `POST /message/sendMedia/{instance}`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "apikey": "your_api_key_here"
}
```

**Body:**
```json
{
  "number": "5511999999999",
  "mediatype": "image",
  "mimetype": "image/png",
  "caption": "Confira esta imagem!",
  "media": "https://example.com/image.jpg",
  "fileName": "image.png",
  "delay": 0
}
```

**Tipos de Mídia:**
- `image`: Imagens (PNG, JPG, JPEG, GIF)
- `video`: Vídeos (MP4, AVI, MOV)
- `audio`: Áudios (MP3, WAV, OGG)
- `document`: Documentos (PDF, DOC, DOCX, XLS, XLSX)

**MimeTypes:**
```typescript
{
  image: 'image/png',
  video: 'video/mp4',
  audio: 'audio/mp3',
  document: 'application/pdf'
}
```

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5F5A632EAE722"
  },
  "message": {
    "imageMessage": {
      "url": "https://mmg.whatsapp.net/...",
      "mimetype": "image/png",
      "caption": "Confira esta imagem!",
      "fileSha256": "...",
      "fileLength": "1305757",
      "height": 1080,
      "width": 1920
    }
  },
  "messageTimestamp": "1717775575",
  "status": "PENDING"
}
```

## 🔧 Gestão de Instâncias

### Criar Instância

**Endpoint:** `POST /instance/create`

**Body:**
```json
{
  "instanceName": "my-instance",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS",
  "number": "",
  "token": "your_api_key"
}
```

### Conectar Instância

**Endpoint:** `GET /instance/connect/{instance}`

### Buscar Instâncias

**Endpoint:** `GET /instance/fetchInstances?instanceName={instance}`

### Status da Conexão

**Endpoint:** `GET /instance/connectionState/{instance}`

**Response:**
```json
{
  "state": "open"
}
```

**Estados Possíveis:**
- `open` / `connected`: Conectado
- `connecting`: Conectando
- `qr`: Aguardando QR Code
- `close` / `disconnected`: Desconectado

### Logout/Desconectar

**Endpoint:** `DELETE /instance/logout/{instance}`

## 🪝 Configuração de Webhooks

### Configurar Webhook

**Endpoint:** `POST /webhook/set/{instance}`

**Body:**
```json
{
  "url": "https://your-api.com/messages/webhook",
  "webhook_by_events": true,
  "events": [
    "MESSAGES_UPDATE",
    "MESSAGES_SET",
    "MESSAGE_STATUS_UPDATE"
  ]
}
```

### Eventos Disponíveis

- `MESSAGES_UPDATE`: Atualização de status de mensagem
- `MESSAGES_SET`: Nova mensagem recebida
- `MESSAGE_STATUS_UPDATE`: Status de entrega/leitura
- `CONNECTION_UPDATE`: Mudança no status da conexão
- `QRCODE_UPDATED`: QR Code atualizado

### Payload do Webhook

Quando uma mensagem é enviada/recebida/atualizada:

```json
{
  "event": "messages.update",
  "instance": "my-instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE594145F4C59B4"
    },
    "update": {
      "status": 3
    }
  }
}
```

**Status Codes:**
- `0`: ERROR
- `1`: PENDING
- `2`: SERVER_ACK (enviado ao servidor)
- `3`: DELIVERY_ACK (entregue)
- `4`: READ (lido)
- `5`: PLAYED (áudio reproduzido)

## 🔐 Autenticação

Todas as requisições precisam do header:

```
apikey: your_api_key_here
```

Configure no `.env`:
```env
EVOLUTION_API_URL=https://dev.evo.sistemabrasil.online
EVOLUTION_API_KEY=your_api_key_here
```

## 📝 Implementação no Código

### Evolution API Provider

```typescript
// apps/api/src/whatsapp/providers/evolution-api.provider.ts

async sendMessage(
  instanceId: string, 
  to: string, 
  message: string, 
  media?: { url: string; type: string; caption?: string }
): Promise<SendMessageResult> {
  // Se tem mídia, usa sendMedia
  if (media) {
    const response = await fetch(
      `${this.baseUrl}/message/sendMedia/${instanceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number: to,
          mediatype: media.type,
          media: media.url,
          caption: media.caption || message,
          fileName: `file.${this.getFileExtension(media.type)}`,
          mimetype: this.getMimeType(media.type),
        }),
      }
    );
    
    // ...
  }
  
  // Texto simples
  const response = await fetch(
    `${this.baseUrl}/message/sendText/${instanceId}`,
    // ...
  );
}
```

## 🧪 Testes com cURL

### Texto

```bash
curl -X POST https://dev.evo.sistemabrasil.online/message/sendText/my-instance \
  -H "Content-Type: application/json" \
  -H "apikey: your_key" \
  -d '{
    "number": "5511999999999",
    "text": "Olá do cURL!"
  }'
```

### Imagem

```bash
curl -X POST https://dev.evo.sistemabrasil.online/message/sendMedia/my-instance \
  -H "Content-Type: application/json" \
  -H "apikey: your_key" \
  -d '{
    "number": "5511999999999",
    "mediatype": "image",
    "mimetype": "image/png",
    "caption": "Imagem de teste",
    "media": "https://picsum.photos/200",
    "fileName": "test.png"
  }'
```

### Status da Conexão

```bash
curl -X GET https://dev.evo.sistemabrasil.online/instance/connectionState/my-instance \
  -H "apikey: your_key"
```

## 🔍 Troubleshooting

### Erro: "Instance not found"

**Causa:** Instância não existe ou nome incorreto

**Solução:**
```bash
# Listar instâncias
curl -X GET https://dev.evo.sistemabrasil.online/instance/fetchInstances \
  -H "apikey: your_key"

# Criar instância
curl -X POST https://dev.evo.sistemabrasil.online/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: your_key" \
  -d '{
    "instanceName": "my-instance",
    "qrcode": true
  }'
```

### Erro: "Not connected"

**Causa:** Instância desconectada ou QR Code não escaneado

**Solução:**
```bash
# Conectar
curl -X GET https://dev.evo.sistemabrasil.online/instance/connect/my-instance \
  -H "apikey: your_key"

# Buscar QR Code
curl -X GET https://dev.evo.sistemabrasil.online/instance/fetchInstances?instanceName=my-instance \
  -H "apikey: your_key"
```

### Mensagens não enviando

**Verificações:**
1. ✅ Instância está conectada?
2. ✅ API Key está correta?
3. ✅ Número está no formato correto? (com DDI, ex: 5511999999999)
4. ✅ URL da mídia está acessível?

## 📊 Monitoramento

### Logs da Evolution API

Verifique os logs do servidor Evolution API para debug:

```bash
# Se estiver rodando via Docker
docker logs evolution-api

# Verificar últimas 100 linhas
docker logs --tail 100 evolution-api

# Acompanhar em tempo real
docker logs -f evolution-api
```

### Logs do Sistema

No nosso sistema, os logs ficam em:

```
apps/api/src/messages/processors/message.processor.ts
apps/api/src/whatsapp/providers/evolution-api.provider.ts
```

Procure por:
```
[MessageProcessor] Processing message {messageId}
[EvolutionApiProvider] Error sending message
```

## 🚀 Recursos Avançados

### Mencionar Usuários

```json
{
  "number": "5511999999999",
  "text": "Olá @5511888888888!",
  "mentioned": ["5511888888888"]
}
```

### Preview de Links

```json
{
  "number": "5511999999999",
  "text": "Confira: https://example.com",
  "linkPreview": true
}
```

### Delay no Envio

```json
{
  "number": "5511999999999",
  "text": "Mensagem com delay",
  "delay": 5000
}
```

### Responder Mensagem

```json
{
  "number": "5511999999999",
  "text": "Resposta",
  "quoted": {
    "key": {
      "id": "BAE594145F4C59B4"
    },
    "message": {
      "conversation": "Mensagem original"
    }
  }
}
```

## 📚 Referências

- [Evolution API v2 Docs](https://doc.evolution-api.com/v2)
- [GitHub Repository](https://github.com/EvolutionAPI/evolution-api)
- [Postman Collection](https://www.postman.com/agenciadgcode/evolution-api)
- [Community Discord](https://evolution-api.com/)

## ✅ Checklist de Configuração

- [x] Evolution API URL configurada
- [x] API Key obtida e configurada
- [x] Instância criada
- [x] QR Code escaneado
- [x] Envio de texto funcionando
- [x] Envio de mídia funcionando
- [ ] Webhooks configurados
- [ ] Monitoramento ativo
- [ ] Logs sendo coletados

---

**Última atualização:** 29/10/2025
**Versão Evolution API:** v2.0
**Status:** ✅ Configurado e Funcional
