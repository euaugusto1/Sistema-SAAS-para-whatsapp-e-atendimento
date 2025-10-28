# Code Quality Examples

## 🎯 Exemplos Práticos de Boas Práticas

Este documento contém exemplos práticos lado-a-lado (❌ vs ✅) para você aplicar imediatamente.

---

## 1. TypeScript - Type Safety

### ❌ EVITE - Any Type
```typescript
async function sendMessage(data: any) {
  const result = await api.post('/messages', data);
  return result;
}
```

### ✅ PREFIRA - Strong Types
```typescript
interface SendMessageData {
  instanceId: string;
  to: string;
  message: string;
}

async function sendMessage(data: SendMessageData): Promise<MessageResult> {
  const result = await api.post('/messages', data);
  return result;
}
```

---

## 2. Error Handling

### ❌ EVITE - Silent Failures
```typescript
try {
  await sendWhatsapp(message);
} catch (error) {
  console.log('Error');
}
```

### ✅ PREFIRA - Proper Error Handling
```typescript
try {
  await sendWhatsapp(message);
} catch (error) {
  console.error('Failed to send WhatsApp message:', error);
  throw new BadRequestException('Message delivery failed', {
    cause: error,
    description: 'Unable to send message via Evolution API',
  });
}
```

---

## 3. Async/Await

### ❌ EVITE - Promise Chains
```typescript
function processMessages() {
  return getMessages()
    .then(messages => {
      return Promise.all(messages.map(m => sendMessage(m)));
    })
    .then(results => {
      return saveResults(results);
    })
    .catch(error => {
      handleError(error);
    });
}
```

### ✅ PREFIRA - Async/Await
```typescript
async function processMessages() {
  try {
    const messages = await getMessages();
    const results = await Promise.all(messages.map(m => sendMessage(m)));
    await saveResults(results);
  } catch (error) {
    handleError(error);
  }
}
```

---

## 4. NestJS Dependency Injection

### ❌ EVITE - Manual Instantiation
```typescript
@Injectable()
export class CampaignsService {
  private prisma = new PrismaService();
  private whatsapp = new WhatsappService();
  
  async create(data: CreateCampaignDto) {
    return this.prisma.campaign.create({ data });
  }
}
```

### ✅ PREFIRA - Constructor Injection
```typescript
@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}
  
  async create(data: CreateCampaignDto) {
    return this.prisma.campaign.create({ data });
  }
}
```

---

## 5. React Components

### ❌ EVITE - Class Components
```typescript
class CampaignsList extends React.Component {
  state = {
    campaigns: [],
    loading: false,
  };
  
  componentDidMount() {
    this.loadCampaigns();
  }
  
  loadCampaigns() {
    // ...
  }
  
  render() {
    return <div>{/* ... */}</div>;
  }
}
```

### ✅ PREFIRA - Functional Components with Hooks
```typescript
export default function CampaignsList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadCampaigns();
  }, []);
  
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/campaigns');
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return <div>{/* ... */}</div>;
}
```

---

## 6. Imports Organization

### ❌ EVITE - Desordenado
```typescript
import { CreateMessageDto } from './dto/create-message.dto';
import { Injectable } from '@nestjs/common';
import type { Message } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { WhatsappService } from '../whatsapp/whatsapp.service';
```

### ✅ PREFIRA - Organizado por Categoria
```typescript
// External libraries
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Internal services (absolute paths)
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

// Local files (relative paths)
import { CreateMessageDto } from './dto/create-message.dto';

// Types (last)
import type { Message } from '@prisma/client';
```

---

## 7. Naming Conventions

### ❌ EVITE - Inconsistente
```typescript
const maxRetry = 3;                    // ❌
class userService {}                   // ❌
function SendMessage() {}              // ❌
interface userData {}                  // ❌
const Campaign_Status = 'ACTIVE';      // ❌
```

### ✅ PREFIRA - Consistente
```typescript
const MAX_RETRIES = 3;                 // ✅ UPPER_SNAKE_CASE para constantes
class UserService {}                   // ✅ PascalCase para classes
function sendMessage() {}              // ✅ camelCase para funções
interface UserData {}                  // ✅ PascalCase para interfaces
const CAMPAIGN_STATUS = 'ACTIVE';      // ✅ UPPER_SNAKE_CASE para constantes
```

---

## 8. Database Queries

### ❌ EVITE - N+1 Problem
```typescript
async getCampaignsWithStats() {
  const campaigns = await this.prisma.campaign.findMany();
  
  for (const campaign of campaigns) {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
    });
    campaign.totalRecipients = recipients.length;
  }
  
  return campaigns;
}
```

### ✅ PREFIRA - Optimized Query
```typescript
async getCampaignsWithStats() {
  return this.prisma.campaign.findMany({
    include: {
      _count: {
        select: { recipients: true },
      },
      recipients: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}
```

---

## 9. Validation DTOs

### ❌ EVITE - No Validation
```typescript
export class CreateCampaignDto {
  name: string;
  message: string;
  contactIds: string[];
}
```

### ✅ PREFIRA - With Validation
```typescript
import { IsString, IsNotEmpty, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsArray()
  @IsNotEmpty()
  contactIds: string[];
}
```

---

## 10. Environment Variables

### ❌ EVITE - Hardcoded Values
```typescript
const databaseUrl = 'postgresql://user:pass@localhost:5432/db';
const apiKey = '123456789';
const port = 3001;
```

### ✅ PREFIRA - Environment Variables
```typescript
const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.EVOLUTION_API_KEY;
const port = parseInt(process.env.PORT || '3001', 10);

// With validation
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
```

---

## 11. Boolean Logic

### ❌ EVITE - Confuso
```typescript
if (user !== null && user !== undefined && user.active === true) {
  // ...
}

const isValid = status === 'ACTIVE' ? true : false;
```

### ✅ PREFIRA - Claro
```typescript
if (user?.active) {
  // ...
}

const isValid = status === 'ACTIVE';
```

---

## 12. Array Operations

### ❌ EVITE - Loops Desnecessários
```typescript
const activeUsers = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].active) {
    activeUsers.push(users[i]);
  }
}

const userIds = [];
for (const user of users) {
  userIds.push(user.id);
}
```

### ✅ PREFIRA - Array Methods
```typescript
const activeUsers = users.filter(user => user.active);

const userIds = users.map(user => user.id);
```

---

## 13. Object Destructuring

### ❌ EVITE - Repetição
```typescript
function sendMessage(message) {
  const to = message.to;
  const text = message.text;
  const instanceId = message.instanceId;
  
  return api.send(instanceId, to, text);
}
```

### ✅ PREFIRA - Destructuring
```typescript
function sendMessage(message) {
  const { to, text, instanceId } = message;
  
  return api.send(instanceId, to, text);
}

// Or directly in parameters
function sendMessage({ to, text, instanceId }) {
  return api.send(instanceId, to, text);
}
```

---

## 14. Optional Chaining

### ❌ EVITE - Nested Ifs
```typescript
let userName;
if (user) {
  if (user.profile) {
    if (user.profile.name) {
      userName = user.profile.name;
    }
  }
}
```

### ✅ PREFIRA - Optional Chaining
```typescript
const userName = user?.profile?.name;
```

---

## 15. Nullish Coalescing

### ❌ EVITE - OR Operator
```typescript
const port = process.env.PORT || 3001;  // ❌ Falso se PORT = "0"
const name = user.name || 'Anonymous';  // ❌ Falso se name = ""
```

### ✅ PREFIRA - Nullish Coalescing
```typescript
const port = process.env.PORT ?? 3001;  // ✅ Só fallback se null/undefined
const name = user.name ?? 'Anonymous';  // ✅ Permite string vazia
```

---

## 16. Template Literals

### ❌ EVITE - String Concatenation
```typescript
const message = 'Hello ' + user.name + ', your order #' + order.id + ' is ready!';
const url = baseUrl + '/api/v1/users/' + userId;
```

### ✅ PREFIRA - Template Literals
```typescript
const message = `Hello ${user.name}, your order #${order.id} is ready!`;
const url = `${baseUrl}/api/v1/users/${userId}`;
```

---

## 17. Function Return Types

### ❌ EVITE - Implicit Return
```typescript
async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}
```

### ✅ PREFIRA - Explicit Return Type
```typescript
async function getUser(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}
```

---

## 18. Guard Clauses

### ❌ EVITE - Nested Ifs
```typescript
function processOrder(order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.status === 'PENDING') {
        // Process order
        return processPayment(order);
      }
    }
  }
  return null;
}
```

### ✅ PREFIRA - Early Returns
```typescript
function processOrder(order) {
  if (!order) return null;
  if (order.items.length === 0) return null;
  if (order.status !== 'PENDING') return null;
  
  // Process order
  return processPayment(order);
}
```

---

## 19. Constants Extraction

### ❌ EVITE - Magic Numbers/Strings
```typescript
if (user.role === 'ADMIN') {
  // ...
}

setTimeout(() => {
  retry();
}, 5000);

if (campaigns.length > 100) {
  // ...
}
```

### ✅ PREFIRA - Named Constants
```typescript
const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
} as const;

const RETRY_DELAY_MS = 5000;
const MAX_CAMPAIGNS_PER_PAGE = 100;

if (user.role === ROLES.ADMIN) {
  // ...
}

setTimeout(() => {
  retry();
}, RETRY_DELAY_MS);

if (campaigns.length > MAX_CAMPAIGNS_PER_PAGE) {
  // ...
}
```

---

## 20. Comments

### ❌ EVITE - Comentários Óbvios
```typescript
// Get user by ID
const user = await getUser(id);

// Loop through campaigns
for (const campaign of campaigns) {
  // Send message
  await sendMessage(campaign);
}
```

### ✅ PREFIRA - Comentários Úteis
```typescript
// Fetch user with eager-loaded organization to reduce DB queries
const user = await getUser(id, { include: { organization: true } });

// Process campaigns in batches to avoid rate limiting (max 10/sec)
for (const campaign of campaigns) {
  await sendMessage(campaign);
  await sleep(100); // 100ms delay = max 10 messages/sec
}
```

---

## 📚 Recursos Adicionais

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### NestJS
- [NestJS Best Practices](https://docs.nestjs.com/fundamentals/testing)
- [NestJS Techniques](https://docs.nestjs.com/techniques/performance)

### React/Next.js
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Next.js Best Practices](https://nextjs.org/docs/getting-started/react-essentials)

### Clean Code
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Refactoring Guru](https://refactoring.guru/)

---

## 🎯 Checklist Rápido

Antes de fazer commit, pergunte-se:

- [ ] Usei tipos explícitos em vez de `any`?
- [ ] Tratei erros adequadamente com try/catch?
- [ ] Usei async/await em vez de .then()?
- [ ] Organizei imports por categoria?
- [ ] Nomes de variáveis são descritivos?
- [ ] Extraí magic numbers/strings para constantes?
- [ ] Usei guard clauses para evitar nested ifs?
- [ ] Adicionei validação em DTOs?
- [ ] Usei optional chaining (?.) quando apropriado?
- [ ] Comentários explicam "porquê" e não "o quê"?

---

**Lembre-se**: Code is read more often than it is written. Write for the next developer (which might be you in 6 months)! 🚀
