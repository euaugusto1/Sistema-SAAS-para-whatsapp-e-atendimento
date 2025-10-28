# Contributing Guide

## 🎯 Code Quality Standards

Este projeto mantém altos padrões de qualidade de código. Antes de contribuir, leia este guia completo.

## 🚀 Setup Inicial

### 1. Fork e Clone

```bash
# Clone seu fork
git clone https://github.com/seu-usuario/saas.git
cd saas

# Configure upstream
git remote add upstream https://github.com/original/saas.git
```

### 2. Instalar Dependências

```bash
# Instalar todas as dependências
npm install

# Configurar git hooks
npm run prepare
```

### 3. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp apps/api/.env.example apps/api/.env

# Editar com suas configurações
code apps/api/.env
```

## 🌿 Workflow de Branch

### Branch Naming Convention

```
feature/nome-da-feature       # Nova funcionalidade
fix/descricao-do-bug          # Correção de bug
refactor/area-refatorada      # Refatoração
docs/topico-documentado       # Documentação
test/area-testada             # Adição de testes
chore/tarefa-manutencao       # Tarefas de manutenção
```

**Exemplos:**
- `feature/payment-integration`
- `fix/auth-token-expiration`
- `refactor/message-service`
- `docs/api-endpoints`

### Criando uma Branch

```bash
# Sempre partir de develop atualizada
git checkout develop
git pull upstream develop

# Criar branch
git checkout -b feature/sua-feature
```

## 📝 Commit Messages

### Formato

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Documentação
- **style**: Formatação (sem mudança de código)
- **refactor**: Refatoração
- **test**: Adição de testes
- **chore**: Tarefas de manutenção
- **perf**: Melhoria de performance

### Exemplos

```bash
# Feature
git commit -m "feat(messages): add retry mechanism for failed messages"

# Fix
git commit -m "fix(auth): correct token expiration validation"

# Docs
git commit -m "docs(readme): update installation instructions"

# Refactor
git commit -m "refactor(campaigns): extract processor logic to service"
```

### Commit com Corpo

```bash
git commit -m "feat(webhooks): add Evolution API webhook handler

- Receive message status updates
- Update message and recipient status
- Handle DELIVERED, READ, and FAILED events

Closes #123"
```

## ✅ Checklist Antes de Commit

### Automático (via Husky)
- ✅ ESLint fix
- ✅ Prettier format
- ✅ Staged files only

### Manual
```bash
# 1. Tests passando
npm test

# 2. Lint sem warnings
npm run lint

# 3. Type check sem erros
npm run type-check

# 4. Build funcionando
npm run build
```

## 🧪 Testing Standards

### Coverage Mínimo
- **Unitário**: 80% de coverage
- **E2E**: Fluxos críticos cobertos

### Estrutura de Testes

```typescript
// ✅ BOM
describe('CampaignsService', () => {
  describe('create', () => {
    it('should create a campaign with valid data', async () => {
      // Arrange
      const dto = { name: 'Test', instanceId: '123' };
      
      // Act
      const result = await service.create(dto);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Test');
    });

    it('should throw error when instance not found', async () => {
      // Test error case
    });
  });
});
```

### Executar Testes

```bash
# Todos os testes
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E
npm run test:e2e
```

## 📦 Pull Request Process

### 1. Antes de Abrir PR

```bash
# Atualizar com develop
git checkout develop
git pull upstream develop

# Rebase sua branch
git checkout feature/sua-feature
git rebase develop

# Resolver conflitos se houver
# Executar testes
npm test

# Push
git push origin feature/sua-feature
```

### 2. Template de PR

```markdown
## 📝 Descrição

Breve descrição do que foi implementado.

## 🎯 Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## ✅ Checklist

- [ ] Code segue style guide
- [ ] Tests adicionados/atualizados
- [ ] Documentação atualizada
- [ ] CI passando
- [ ] Self-review realizado

## 🧪 Como Testar

1. Passo a passo para testar
2. Comandos necessários
3. Resultados esperados

## 📸 Screenshots (se aplicável)

## 🔗 Issues Relacionadas

Closes #123
```

### 3. Code Review

**Aguarde:**
- ✅ CI passar
- ✅ Aprovação de 1+ reviewer
- ✅ Sem conflitos

**Responda:**
- Comentários de reviewers
- Sugestões de melhorias
- Dúvidas levantadas

## 🎨 Style Guide

### TypeScript

```typescript
// ✅ CORRETO
interface UserData {
  id: string;
  name: string;
  email: string;
}

async function createUser(data: UserData): Promise<User> {
  const user = await prisma.user.create({ data });
  return user;
}

// ❌ EVITE
async function createUser(data: any) {
  const user = await prisma.user.create({ data });
  return user;
}
```

### NestJS

```typescript
// ✅ CORRETO - Dependency Injection
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {}
}

// ❌ EVITE - Instanciação manual
@Injectable()
export class UsersService {
  private prisma = new PrismaService();
}
```

### React/Next.js

```typescript
// ✅ CORRETO - Functional components
export default function CampaignsList() {
  const [campaigns, setCampaigns] = useState([]);
  
  useEffect(() => {
    loadCampaigns();
  }, []);
  
  return <div>{/* ... */}</div>;
}

// ✅ CORRETO - Error boundaries
try {
  await apiClient.post('/campaigns', data);
  toast.success('Campaign created!');
} catch (error) {
  toast.error('Failed to create campaign');
  console.error(error);
}
```

## 🐛 Reportando Bugs

### Template de Issue

```markdown
## 🐛 Descrição do Bug

Descrição clara do problema.

## 🔄 Passos para Reproduzir

1. Ir para '...'
2. Clicar em '...'
3. Ver erro

## ✅ Comportamento Esperado

O que deveria acontecer.

## ❌ Comportamento Atual

O que está acontecendo.

## 🖼️ Screenshots

Se aplicável.

## 🌍 Ambiente

- OS: [e.g. Ubuntu 22.04]
- Node: [e.g. 18.17.0]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

## 📝 Logs

```
Cole logs relevantes aqui
```

## 💡 Sugerindo Features

### Template de Feature Request

```markdown
## 💡 Feature Solicitada

Descrição clara da feature.

## 🎯 Problema que Resolve

Qual problema esta feature resolve?

## 💭 Solução Proposta

Como você imagina que funcione?

## 🔄 Alternativas Consideradas

Outras formas de resolver?

## 📎 Contexto Adicional

Qualquer contexto relevante.
```

## 🏆 Boas Práticas

### 1. **Commits Pequenos e Focados**
```bash
# ✅ BOM
git commit -m "feat(auth): add JWT token validation"
git commit -m "test(auth): add token validation tests"
git commit -m "docs(auth): update authentication docs"

# ❌ EVITE
git commit -m "Add auth system with tests and docs"
```

### 2. **Testes Antes de Features**
```typescript
// TDD approach
// 1. Escrever teste
it('should send message via WhatsApp', async () => {
  const result = await service.sendMessage(data);
  expect(result.success).toBe(true);
});

// 2. Implementar feature
// 3. Ver teste passar
```

### 3. **Documentação Inline**
```typescript
/**
 * Sends a message via WhatsApp Evolution API
 * 
 * @param data - Message data including recipient and content
 * @returns Promise with send result and message ID
 * @throws Error if instance is not connected
 * 
 * @example
 * ```typescript
 * const result = await sendMessage({
 *   instanceId: '123',
 *   to: '5511999999999',
 *   message: 'Hello!'
 * });
 * ```
 */
async sendMessage(data: SendMessageDto) {
  // Implementation
}
```

### 4. **Error Handling Consistente**
```typescript
// ✅ BOM
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new BadRequestException('Failed to process request');
}

// ❌ EVITE
try {
  await riskyOperation();
} catch (error) {
  console.log(error);
  return null;
}
```

## 🤝 Comunidade

### Onde Pedir Ajuda

- 💬 **Discussions**: Perguntas gerais
- 🐛 **Issues**: Bugs e features
- 📧 **Email**: Para questões privadas

### Code of Conduct

- Seja respeitoso
- Aceite feedback construtivo
- Foque no melhor para o projeto
- Ajude outros contribuidores

## 📚 Recursos

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## 🎓 Aprendendo

### Para Iniciantes

1. Comece com issues marcadas como `good first issue`
2. Leia o código existente
3. Faça perguntas nas discussions
4. Contribua com documentação primeiro

### Para Avançados

1. Implemente features complexas
2. Revise PRs de outros
3. Melhore performance
4. Contribua com testes

---

**Obrigado por contribuir! 🚀**
