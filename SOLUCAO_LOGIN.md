# 🔧 SOLUCIONANDO PROBLEMA DE LOGIN

## ❌ Problema Atual
Não é possível fazer login como administrador porque **o banco de dados Supabase não está acessível**.

```
Erro: Can't reach database server at aws-1-us-east-2.pooler.supabase.com:6543
```

---

## ✅ SOLUÇÃO 1: Reativar Supabase (RECOMENDADO)

Projetos Supabase gratuitos pausam após 7 dias de inatividade.

### Passo a Passo:

1. **Acesse o Dashboard do Supabase**
   ```
   https://supabase.com/dashboard
   ```

2. **Faça login** com suas credenciais

3. **Selecione seu projeto** na lista

4. **Reative o projeto**
   - Se aparecer "⏸️ Project Paused", clique em **"Resume Project"** ou **"Restore"**
   - Aguarde 2-5 minutos para o banco de dados ficar online

5. **Teste a conexão**
   ```powershell
   cd d:\VS\saas\apps\api
   npx ts-node test-db-connection.ts
   ```

6. **Se a conexão funcionar, execute o seed**
   ```powershell
   cd d:\VS\saas\apps\api
   npm run prisma:seed
   ```

7. **Inicie o servidor**
   ```powershell
   # Terminal 1: API
   cd d:\VS\saas\apps\api
   npm run dev

   # Terminal 2: Frontend
   cd d:\VS\saas\apps\web
   npm run dev
   ```

8. **Faça login**
   ```
   📧 Email: admin@example.com
   🔑 Senha: password
   ```

---

## ✅ SOLUÇÃO 2: Usar Banco de Dados Local

Se o Supabase continuar indisponível, use PostgreSQL e Redis locais.

### Passo a Passo:

1. **Inicie o Docker** (Docker Desktop deve estar rodando)

2. **Suba os containers**
   ```powershell
   cd d:\VS\saas
   docker-compose -f docker-compose.local.yml up -d
   ```

3. **Copie as variáveis de ambiente**
   ```powershell
   copy .env.local.example apps\api\.env
   ```

4. **Execute as migrations**
   ```powershell
   cd apps\api
   npx prisma migrate dev --name init
   ```

5. **Execute o seed**
   ```powershell
   npm run prisma:seed
   ```

6. **Inicie o servidor**
   ```powershell
   # Terminal 1: API
   cd d:\VS\saas\apps\api
   npm run dev

   # Terminal 2: Frontend  
   cd d:\VS\saas\apps\web
   npm run dev
   ```

7. **Faça login**
   ```
   📧 Email: admin@example.com
   🔑 Senha: password
   ```

---

## ✅ SOLUÇÃO 3: Verificar Credenciais Supabase

Se o projeto Supabase está ativo mas ainda não conecta:

1. **Acesse o Dashboard do Supabase**
   ```
   https://supabase.com/dashboard
   ```

2. **Vá para Settings → Database**

3. **Copie a Connection String**
   - Sessão: "Connection Pooling"
   - Modo: "Transaction" (porta 6543)
   - Copie a string completa

4. **Atualize o .env**
   ```powershell
   # Edite: d:\VS\saas\apps\api\.env
   DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[REF]:[SENHA]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
   ```

5. **Teste novamente**
   ```powershell
   cd d:\VS\saas\apps\api
   npx ts-node test-db-connection.ts
   ```

---

## 🔍 Diagnóstico Rápido

Execute este comando para verificar o status:

```powershell
cd d:\VS\saas\apps\api
npx ts-node test-db-connection.ts
```

### Possíveis Resultados:

#### ✅ Conexão OK
```
✅ Conexão estabelecida com sucesso!
✅ Usuário admin encontrado no banco!
```
→ **Solução**: Apenas inicie os servidores e faça login

#### ⚠️ Conexão OK, mas sem usuário admin
```
✅ Conexão estabelecida com sucesso!
⚠️  Usuário admin NÃO encontrado no banco!
```
→ **Solução**: Execute `npm run prisma:seed`

#### ❌ Não consegue conectar
```
❌ Erro ao conectar ao banco de dados:
🔌 Não foi possível alcançar o servidor
```
→ **Solução**: Use SOLUÇÃO 1 (Reativar Supabase) ou SOLUÇÃO 2 (Banco Local)

---

## 📋 Comandos Úteis

### Testar conexão com banco
```powershell
cd d:\VS\saas\apps\api
npx ts-node test-db-connection.ts
```

### Criar usuário admin
```powershell
cd d:\VS\saas\apps\api
npm run prisma:seed
```

### Ver logs do Docker
```powershell
docker-compose -f docker-compose.local.yml logs -f
```

### Parar containers locais
```powershell
docker-compose -f docker-compose.local.yml down
```

### Reiniciar containers
```powershell
docker-compose -f docker-compose.local.yml restart
```

---

## 🆘 Ainda com problemas?

1. **Verifique se o Docker está rodando** (para SOLUÇÃO 2)
2. **Verifique seu firewall/antivírus** (pode bloquear conexões)
3. **Tente usar uma VPN** (alguns provedores bloqueiam AWS)
4. **Verifique o status do Supabase**: https://status.supabase.com

---

## 📧 Credenciais Padrão

Após executar o seed com sucesso:

```
📧 Email: admin@example.com
🔑 Senha: password
```

Estas credenciais funcionam tanto no Supabase quanto no banco local.
