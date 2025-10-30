import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔄 Testando conexão com o banco de dados...');
  console.log('📍 Host: aws-1-us-east-2.pooler.supabase.com:6543');
  console.log('');
  
  try {
    // Tentar executar uma query simples
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('');
    
    // Verificar se existe o usuário admin
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });
    
    if (adminUser) {
      console.log('✅ Usuário admin encontrado no banco!');
      console.log('📧 Email: admin@example.com');
      console.log('🆔 ID:', adminUser.id);
      console.log('👤 Nome:', adminUser.name);
    } else {
      console.log('⚠️  Usuário admin NÃO encontrado no banco!');
      console.log('💡 Execute o seed para criar: npm run prisma:seed');
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao banco de dados:');
    console.error('');
    
    if (error.code === 'P1001') {
      console.error('🔌 Não foi possível alcançar o servidor do banco de dados.');
      console.error('');
      console.error('Possíveis causas:');
      console.error('1. O projeto Supabase está pausado (projetos gratuitos pausam após inatividade)');
      console.error('   → Acesse https://supabase.com/dashboard e "Unpause" o projeto');
      console.error('');
      console.error('2. Firewall ou proxy bloqueando a conexão');
      console.error('   → Tente desabilitar temporariamente o firewall/antivírus');
      console.error('');
      console.error('3. Problemas de rede');
      console.error('   → Verifique sua conexão com a internet');
      console.error('');
      console.error('4. Credenciais incorretas no .env');
      console.error('   → Verifique DATABASE_URL e DIRECT_URL');
    } else {
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
