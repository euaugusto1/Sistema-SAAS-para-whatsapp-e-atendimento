# Code Quality & Standards

## 📋 Overview

Este projeto utiliza um conjunto de ferramentas para garantir qualidade e consistência do código:

- **ESLint** - Análise estática de código e detecção de problemas
- **Prettier** - Formatação consistente de código
- **Husky** - Git hooks para automação de qualidade
- **TypeScript** - Type checking rigoroso
- **Jest** - Testes unitários e E2E

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
# Na raiz do projeto
npm install

# Configurar Husky
npm run prepare
```

### 2. Executar Linting

```bash
# Verificar todos os arquivos
npm run lint

# Corrigir automaticamente
npm run lint:fix

# Verificar formatação
npm run format:check

# Formatar todos os arquivos
npm run format
```

### 3. Executar por Workspace

```bash
# Lint na API
cd apps/api && npm run lint

# Lint no Web
cd apps/web && npm run lint
```

## 🔧 Configuração

### ESLint Rules

O projeto usa as seguintes regras principais:

```json
{
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "error",
  "no-console": "warn",
  "no-debugger": "error",
  "prettier/prettier": "error"
}
```

**Exceções permitidas:**
- `console.warn()` e `console.error()` são permitidos
- Variáveis prefixadas com `_` podem ficar sem uso
- Arquivos de configuração (*.config.js) são ignorados

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### Git Hooks (Husky)

#### Pre-commit
Executa automaticamente antes de cada commit:
1. ✅ Lint dos arquivos staged
2. ✅ Formatação com Prettier
3. ✅ Correção automática de problemas

#### Pre-push
Executa antes de fazer push:
1. ✅ Type checking da API
2. ✅ Type checking do Web
3. ✅ Build de validação

## 📝 Lint-Staged

Arquivos staged são processados automaticamente:

```json
{
  "**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "**/*.{js,jsx}": ["eslint --fix", "prettier --write"],
  "**/*.{json,md}": ["prettier --write"]
}
```

## 🎯 Best Practices

### 1. **Imports Organization**

```typescript
// ✅ CORRETO - Ordem de imports
import { Module } from '@nestjs/common';           // Externos
import { PrismaService } from '../prisma';         // Internos relativos
import { CreateUserDto } from './dto';             // Locais
import type { User } from '@prisma/client';        // Types por último
```

### 2. **Naming Conventions**

```typescript
// ✅ CORRETO
class UserService {}                    // PascalCase para classes
const MAX_RETRIES = 3;                  // UPPER_SNAKE_CASE para constantes
function sendMessage() {}               // camelCase para funções
interface UserData {}                   // PascalCase para interfaces
type UserId = string;                   // PascalCase para types
```

### 3. **TypeScript Usage**

```typescript
// ❌ EVITE
function process(data: any) {}

// ✅ PREFIRA
function process(data: UserData) {}
function process(data: unknown) {}     // Se tipo realmente desconhecido
```

### 4. **Error Handling**

```typescript
// ✅ CORRETO
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('Detailed error message');
}
```

### 5. **Async/Await**

```typescript
// ❌ EVITE
getData().then(data => processData(data)).catch(err => handleError(err));

// ✅ PREFIRA
try {
  const data = await getData();
  await processData(data);
} catch (error) {
  handleError(error);
}
```

## 🔍 VS Code Integration

### Extensões Recomendadas

Instale as extensões sugeridas:
- **ESLint** - Lint em tempo real
- **Prettier** - Formatação automática
- **Prisma** - Syntax highlighting para schema
- **Tailwind CSS** - Autocomplete do Tailwind

### Settings Aplicadas

O projeto já inclui configurações em `.vscode/settings.json`:
- ✅ Format on save habilitado
- ✅ ESLint fix on save
- ✅ Organize imports on save
- ✅ Prettier como formatter padrão

## 🧪 CI/CD Integration

### GitHub Actions

O workflow `.github/workflows/code-quality.yml` executa:

**On Push/PR:**
1. ✅ ESLint check
2. ✅ Prettier check
3. ✅ TypeScript compilation
4. ✅ Tests unitários
5. ✅ Tests E2E

**Branches monitoradas:**
- `main` - Produção
- `develop` - Desenvolvimento

## 🚫 Bypass (Use com Moderação)

### Pular Pre-commit Hook

```bash
git commit --no-verify -m "Emergency fix"
```

### Desabilitar Regra Específica

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = externalLib();

/* eslint-disable no-console */
console.log('Debug info');
console.log('More debug');
/* eslint-enable no-console */
```

## 📊 Métricas de Qualidade

### Targets

- **Code Coverage**: Mínimo 80%
- **ESLint Warnings**: Máximo 0 (--max-warnings 0)
- **TypeScript Errors**: 0
- **Prettier Issues**: 0

### Comandos de Verificação

```bash
# Coverage report
npm run test:cov

# Type checking
npm run type-check

# Lint com zero warnings
npm run lint
```

## 🔄 Workflow Recomendado

### Antes de Commit

1. ✅ Código funcionando
2. ✅ Tests passando (`npm test`)
3. ✅ Sem erros de lint (`npm run lint`)
4. ✅ Formatação correta (`npm run format`)

### Antes de PR

1. ✅ Branch atualizada com main/develop
2. ✅ Todos os tests passando
3. ✅ Build sem erros
4. ✅ Coverage adequado

### Durante Code Review

- Verifique se CI passou
- Confirme que código segue patterns
- Valide que tem testes adequados
- Revise mensagens de commit

## 🛠️ Troubleshooting

### ESLint não está funcionando

```bash
# Reinstalar dependências
npm install

# Verificar extensão VS Code instalada
code --list-extensions | grep dbaeumer.vscode-eslint

# Recarregar window do VS Code
Ctrl+Shift+P > Reload Window
```

### Prettier conflitando com ESLint

```bash
# Verificar se eslint-config-prettier está instalado
npm list eslint-config-prettier

# Reinstalar se necessário
npm install --save-dev eslint-config-prettier
```

### Husky hooks não executam

```bash
# Reinstalar Husky
npm run prepare

# Verificar permissões (Linux/Mac)
chmod +x .husky/*

# Windows: Verificar se Git Bash está instalado
```

## 📚 Referências

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Lint-staged](https://github.com/okonet/lint-staged)

## 🎓 Training Resources

- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [NestJS Style Guide](https://docs.nestjs.com/techniques/performance)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
