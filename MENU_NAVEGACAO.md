# 📋 Menu de Navegação - Referência Completa

**Última Atualização:** 29 de Outubro de 2025  
**Arquivo:** `apps/web/src/components/Layout.tsx`

---

## 🎯 **Estrutura do Menu Lateral**

### ✅ **Itens Ativos no Menu**

| Ícone | Nome | Rota | Status | Descrição |
|-------|------|------|--------|-----------|
| ◆ | **Dashboard** | `/dashboard` | ✅ Ativo | Visão geral do sistema, métricas e planos |
| 📢 | **Campanhas** | `/campaigns` | ✅ Ativo | Gestão de campanhas de disparo em massa |
| 👥 | **Contatos** | `/contacts` | ✅ Ativo | Gerenciamento de contatos |
| 📱 | **WhatsApp** | `/whatsapp` | ✅ Ativo | Instâncias WhatsApp conectadas |
| 💬 | **Mensagens** | `/messages` | ✅ Ativo | Histórico e envio de mensagens |
| 📊 | **Analytics** | `/analytics` | ✅ Ativo | Relatórios e análises detalhadas |
| 💳 | **Assinatura** | `/plans` | ✅ Ativo | Planos e faturamento |

---

## 📦 **Funcionalidades Vinculadas**

### 1. **Dashboard** (`/dashboard`)
**Componente:** `apps/web/src/pages/dashboard.tsx`

**Seções:**
- ✅ Métricas principais (enviadas, entregues, falhas, contatos, campanhas, instâncias)
- ✅ **Planos de Assinatura** (novo)
  - Cards dos 4 planos
  - Preços e features
  - Botões de ação
  - Link para `/plans`
- ✅ Ações rápidas
- ✅ Contatos recentes
- ✅ Campanhas ativas
- ✅ Instâncias conectadas
- ✅ Atividades recentes

**Modais:**
- Adicionar contato
- Nova campanha
- Nova instância
- Enviar mensagem

---

### 2. **Campanhas** (`/campaigns`)
**Status:** ✅ Implementado

**Funcionalidades:**
- Listar campanhas
- Criar nova campanha
- Editar campanha
- Deletar campanha
- Iniciar/Pausar/Retomar campanha
- Visualizar estatísticas
- Filtrar por status

---

### 3. **Contatos** (`/contacts`)
**Status:** ✅ Implementado

**Funcionalidades:**
- CRUD completo de contatos
- Import CSV
- Export CSV
- Tags e categorização
- Busca e filtros
- Visualizar histórico de mensagens

---

### 4. **WhatsApp** (`/whatsapp`)
**Status:** ✅ Implementado

**Funcionalidades:**
- Criar instância
- Conectar via QR Code
- Desconectar instância
- Verificar status
- Deletar instância
- Visualizar histórico

---

### 5. **Mensagens** (`/messages`)
**Status:** ✅ Implementado

**Funcionalidades:**
- Listar mensagens
- Enviar mensagem individual
- Filtrar por status
- Retry em falhas
- Visualizar detalhes
- Histórico completo

---

### 6. **Analytics** (`/analytics`)
**Status:** ✅ Implementado

**Funcionalidades:**
- Dashboard de métricas
- Gráficos de performance
- Taxa de entrega
- Análise de receita
- Métricas de campanhas
- Relatórios exportáveis

---

### 7. **Assinatura** (`/plans`)
**Status:** ✅ Implementado

**Funcionalidades:**
- Visualizar todos os planos
- Comparar features
- Toggle mensal/anual
- Assinar plano
- Escolher forma de pagamento (Stripe/MercadoPago)
- FAQ sobre planos

**Planos Disponíveis:**
1. **Gratuito** - R$ 0/mês
2. **Iniciante** - R$ 49,90/mês
3. **Profissional** - R$ 99,90/mês (Destaque)
4. **Empresarial** - R$ 299,90/mês

---

## 🎨 **Design do Menu**

### Características Visuais
- 🌈 Fundo: Preto com gradiente verde neon
- ✨ Animações: Hover com glow e translateX
- 🎭 Ícones: Emojis coloridos para melhor identificação
- 💚 Cor primária: Verde neon (#00ff88)
- 🔵 Estado ativo: Destaque com borda e sombra
- 🔴 Botão Sair: Vermelho com hover effect

### Estados do Item
- **Normal:** Texto em verde transparente
- **Hover:** Glow verde + translateX(8px)
- **Ativo:** Fundo verde + borda + sombra intensa

---

## 📝 **Como Adicionar Novo Item ao Menu**

### Passo 1: Criar a Página
```typescript
// apps/web/src/pages/nova-funcionalidade.tsx
export default function NovaFuncionalidade() {
  return <div>Conteúdo aqui</div>;
}
```

### Passo 2: Adicionar ao Menu
```typescript
// apps/web/src/components/Layout.tsx
const navigation = [
  // ... itens existentes
  { name: 'Nome da Funcionalidade', href: '/rota', icon: '🎯' },
];
```

### Passo 3: Atualizar este Documento
```markdown
| 🎯 | **Nova Funcionalidade** | `/rota` | ✅ Ativo | Descrição da funcionalidade |
```

### Passo 4: Testar
1. Acessar dashboard
2. Clicar no novo item do menu
3. Verificar rota ativa (highlight)
4. Confirmar funcionalidade

---

## 🔄 **Histórico de Alterações**

### 29/10/2025
- ✅ Alterado "Assinatura" de `/subscription` para `/plans`
- ✅ Atualizados ícones para emojis (melhor UX)
- ✅ Adicionada seção de planos no dashboard
- ✅ Criados 4 planos no banco de dados
- ✅ Implementado design dos cards de planos

### Próximas Alterações Previstas
- [ ] Adicionar item "Configurações"
- [ ] Adicionar item "Equipe" (gerenciar membros)
- [ ] Adicionar item "Relatórios"
- [ ] Adicionar item "Automações"
- [ ] Adicionar item "Templates"

---

## 🎯 **Regra de Ouro**

> **TODA nova funcionalidade DEVE ter um item correspondente no menu lateral!**

### Checklist para Novas Funcionalidades:
- [ ] Criar página em `apps/web/src/pages/`
- [ ] Adicionar item no array `navigation` em `Layout.tsx`
- [ ] Escolher emoji apropriado como ícone
- [ ] Definir rota clara e intuitiva
- [ ] Atualizar este documento (`MENU_NAVEGACAO.md`)
- [ ] Testar navegação e estado ativo
- [ ] Verificar responsividade mobile
- [ ] Documentar funcionalidades da página

---

## 📱 **Responsividade Mobile**

### Comportamento
- Desktop (>768px): Menu fixo lateral
- Mobile (<768px): Menu oculto (slide-in)
- Largura do menu: 260px
- Transição: 0.3s ease

### Melhorias Futuras
- [ ] Adicionar botão hamburger para mobile
- [ ] Implementar overlay ao abrir menu mobile
- [ ] Adicionar gestos de swipe
- [ ] Menu bottom navigation (alternativa mobile)

---

## 🎨 **Personalização**

### Cores
```css
--primary: #00ff88 (verde neon)
--primary-hover: #00cc66
--background: rgba(0, 0, 0, 0.8)
--border: rgba(0, 255, 136, 0.2)
--active: rgba(0, 255, 136, 0.1)
--danger: #ff4444
```

### Fontes
```css
font-family: 'Poppins', sans-serif
font-weights: 300, 400, 500, 600, 700
```

---

## 📊 **Métricas de Uso**

### Páginas Mais Acessadas (previsto)
1. Dashboard (entrada principal)
2. Campanhas (criação de disparos)
3. Contatos (gestão de leads)
4. WhatsApp (conexões)
5. Mensagens (monitoramento)
6. Analytics (relatórios)
7. Assinatura (upgrade de plano)

---

## 🔗 **Links Relacionados**

- **Layout Component:** `apps/web/src/components/Layout.tsx`
- **Páginas:** `apps/web/src/pages/`
- **Estilos Globais:** `apps/web/src/styles/globals.css`
- **Autenticação:** `apps/web/src/lib/auth/`

---

## ✅ **Status Geral do Menu**

```
Total de Itens: 7
✅ Funcionais: 7
⚠️ Parciais: 0
❌ Não Implementados: 0

Cobertura: 100%
```

---

**Mantenha este documento sempre atualizado ao adicionar novas funcionalidades!** 🚀
