import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔄 Criando usuário administrador...');
  
  try {
    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (existingUser) {
      console.log('✅ Usuário admin já existe!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Senha: password');
      
      // Atualizar a senha para garantir que está correta
      const passwordHash = await bcrypt.hash('password', 12);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      });
      console.log('🔄 Senha atualizada com sucesso!');
      return;
    }

    // Criar novo usuário
    const passwordHash = await bcrypt.hash('password', 12);
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin',
        passwordHash,
      },
    });

    console.log('✅ Usuário admin criado com sucesso!');

    // Criar organização
    const organization = await prisma.organization.create({
      data: {
        name: 'Admin Org',
        slug: 'admin-org',
        ownerId: user.id,
      },
    });

    console.log('✅ Organização criada com sucesso!');

    // Adicionar usuário como membro da organização
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    console.log('✅ Membro adicionado à organização!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Senha: password');
    console.log('');
    console.log('✨ Agora você pode fazer login no sistema!');

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
