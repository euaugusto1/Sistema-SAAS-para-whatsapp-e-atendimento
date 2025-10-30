# ✅ Checklist de Nova Funcionalidade

**Use este checklist SEMPRE que implementar uma nova funcionalidade no sistema!**

---

## 📋 **Passo a Passo Obrigatório**

### 1️⃣ **Backend (API)**

#### Banco de Dados
- [ ] Criar/Atualizar model no `schema.prisma`
- [ ] Executar migração: `npx prisma migrate dev --name nome_da_feature`
- [ ] Verificar status: `npx prisma migrate status`
- [ ] Criar seed (se necessário): `prisma/seed-feature.ts`

#### Serviço e Controller
- [ ] Criar módulo: `nest g module nome-da-feature`
- [ ] Criar service: `nest g service nome-da-feature`
- [ ] Criar controller: `nest g controller nome-da-feature`
- [ ] Criar DTOs em `dto/`
- [ ] Implementar validações com `class-validator`
- [ ] Adicionar guards de autenticação/autorização
- [ ] Documentar endpoints com comentários

#### Testes
- [ ] Criar testes unitários do service
- [ ] Criar testes de integração do controller
- [ ] Executar: `npm test`
- [ ] Verificar cobertura: `npm run test:cov`

---

### 2️⃣ **Frontend**

#### Página
- [ ] Criar página em `apps/web/src/pages/nome-da-feature.tsx`
- [ ] Implementar UI com Tailwind CSS ou estilos customizados
- [ ] Adicionar loading states
- [ ] Adicionar error handling
- [ ] Implementar validação de formulários (se houver)
- [ ] Adicionar feedback visual (toasts, alerts)

#### Componentes
- [ ] Criar componentes reutilizáveis em `components/`
- [ ] Documentar props dos componentes
- [ ] Implementar responsividade mobile
- [ ] Adicionar acessibilidade (ARIA labels)

#### Integração com API
- [ ] Criar funções de API em `lib/api/` ou usar `apiClient`
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states
- [ ] Implementar retry em caso de falha (se necessário)

---

### 3️⃣ **Menu de Navegação** ⚠️ **OBRIGATÓRIO**

#### Adicionar ao Menu Lateral
- [ ] Abrir `apps/web/src/components/Layout.tsx`
- [ ] Adicionar item no array `navigation`:
  ```typescript
  { name: 'Nome da Feature', href: '/rota', icon: '🎯' }
  ```
- [ ] Escolher emoji apropriado como ícone
- [ ] Testar navegação no browser
- [ ] Verificar estado ativo (highlight) ao acessar página

#### Atualizar Documentação
- [ ] Atualizar `MENU_NAVEGACAO.md`
- [ ] Adicionar linha na tabela de itens ativos
- [ ] Descrever funcionalidades na seção correspondente
- [ ] Atualizar histórico de alterações

---

### 4️⃣ **Dashboard (Se Aplicável)**

#### Adicionar Card/Seção no Dashboard
- [ ] Criar card de acesso rápido
- [ ] Adicionar métricas relacionadas (se houver)
- [ ] Implementar ação rápida (botão/modal)
- [ ] Linkar com a página principal da feature

#### Métricas
- [ ] Adicionar contadores no dashboard
- [ ] Criar gráficos (se necessário)
- [ ] Implementar atualização em tempo real (se necessário)

---

### 5️⃣ **Estilos e UI**

#### CSS/Styling
- [ ] Adicionar estilos em `globals.css` (se necessário)
- [ ] Seguir padrão de cores do sistema:
  - Verde neon: `#00ff88`
  - Preto: `#000000`
  - Gradientes: `linear-gradient(...)`
- [ ] Implementar animações hover
- [ ] Verificar contraste de cores (acessibilidade)

#### Responsividade
- [ ] Testar em desktop (>1024px)
- [ ] Testar em tablet (768px - 1024px)
- [ ] Testar em mobile (<768px)
- [ ] Verificar menu lateral em mobile
- [ ] Testar orientação portrait e landscape

---

### 6️⃣ **Permissões e Segurança**

#### Autorização
- [ ] Implementar guards de permissão (se necessário)
- [ ] Verificar roles de usuário (OWNER, ADMIN, MEMBER)
- [ ] Implementar isolamento de dados por organização
- [ ] Adicionar validação de ownership

#### Segurança
- [ ] Sanitizar inputs
- [ ] Validar dados no backend
- [ ] Implementar rate limiting (se necessário)
- [ ] Adicionar logs de ações sensíveis

---

### 7️⃣ **Documentação**

#### README/Docs
- [ ] Atualizar README principal (se necessário)
- [ ] Criar documentação da feature em `docs/`
- [ ] Documentar API endpoints
- [ ] Adicionar exemplos de uso
- [ ] Documentar configurações necessárias

#### Comentários no Código
- [ ] Adicionar JSDoc nos principais métodos
- [ ] Documentar lógica complexa
- [ ] Explicar decisões de arquitetura
- [ ] Adicionar TODOs para melhorias futuras

---

### 8️⃣ **Testes Manuais**

#### Funcionalidade
- [ ] Testar fluxo completo happy path
- [ ] Testar cenários de erro
- [ ] Verificar validações
- [ ] Testar com dados reais
- [ ] Testar edge cases

#### Integração
- [ ] Verificar integração com outras features
- [ ] Testar multi-tenancy (organizações diferentes)
- [ ] Verificar performance com volume de dados
- [ ] Testar em diferentes browsers
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

---

### 9️⃣ **Performance**

#### Otimização
- [ ] Implementar paginação (se listar dados)
- [ ] Adicionar índices no banco de dados
- [ ] Otimizar queries (evitar N+1)
- [ ] Implementar caching (se necessário)
- [ ] Lazy loading de componentes pesados

#### Monitoramento
- [ ] Adicionar logs relevantes
- [ ] Implementar métricas (se necessário)
- [ ] Configurar alertas de erro (Sentry)

---

### 🔟 **Deploy e Produção**

#### Preparação
- [ ] Verificar variáveis de ambiente necessárias
- [ ] Atualizar `.env.example` (se novos vars)
- [ ] Testar build de produção
  - [ ] Backend: `npm run build`
  - [ ] Frontend: `npm run build`
- [ ] Verificar migrations em produção

#### Deploy
- [ ] Fazer backup do banco antes de deploy
- [ ] Executar migrations: `npx prisma migrate deploy`
- [ ] Executar seeds (se necessário)
- [ ] Verificar logs após deploy
- [ ] Testar funcionalidade em produção
- [ ] Monitorar por 24h após deploy

---

## 🎯 **Template de Commit**

```
feat(nome-da-feature): descrição curta

- Implementa [funcionalidade X]
- Adiciona endpoint POST /api/feature
- Cria página /feature no frontend
- Adiciona item no menu lateral
- Atualiza documentação MENU_NAVEGACAO.md

Closes #123
```

---

## 📊 **Exemplo Prático: Feature "Planos de Assinatura"**

### ✅ Checklist Completo

#### Backend
- [x] Model `Plan` no schema.prisma
- [x] Migration criada e aplicada
- [x] Seed com 4 planos
- [x] PaymentsService implementado
- [x] PaymentsController com endpoints
- [x] DTOs validados

#### Frontend
- [x] Página `/plans` criada
- [x] Grid de cards de planos
- [x] Toggle mensal/anual
- [x] Integração com API
- [x] Responsivo

#### Menu
- [x] Item "Assinatura" adicionado com ícone 💳
- [x] Rota `/plans` configurada
- [x] MENU_NAVEGACAO.md atualizado

#### Dashboard
- [x] Seção de planos adicionada
- [x] 4 cards com preços e features
- [x] Botões de ação
- [x] Estilos CSS customizados

#### Documentação
- [x] CONFIGURACAO_SUPABASE.md criado
- [x] MENU_NAVEGACAO.md atualizado
- [x] README atualizado

---

## 🚀 **Dicas Importantes**

### ✅ FAÇA
- ✅ Siga o padrão de código existente
- ✅ Teste em diferentes cenários
- ✅ Documente tudo
- ✅ Adicione ao menu lateral
- ✅ Peça code review

### ❌ NÃO FAÇA
- ❌ Criar feature sem adicionar ao menu
- ❌ Fazer commit sem testar
- ❌ Ignorar validações
- ❌ Deixar TODOs sem resolver
- ❌ Esquecer documentação

---

## 📞 **Precisa de Ajuda?**

- Consultar `MENU_NAVEGACAO.md` para estrutura do menu
- Consultar `DIAGNOSTICO_SISTEMA.md` para overview
- Consultar `CONFIGURACAO_SUPABASE.md` para banco de dados
- Buscar exemplos em features existentes

---

**Salve este checklist e use sempre que implementar algo novo!** ✨
