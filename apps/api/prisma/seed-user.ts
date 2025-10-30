import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Criando usuário de teste...');

  // Hash da senha
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Criar usuário PRIMEIRO
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Administrador',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Usuário criado:', user.email);

  // Criar organização COM o ownerId do usuário
  const org = await prisma.organization.upsert({
    where: { slug: 'teste-org' },
    update: {},
    create: {
      name: 'Organização Teste',
      slug: 'teste-org',
      ownerId: user.id,
    },
  });

  console.log('✅ Organização criada:', org.name);

  // Criar membership
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
      joinedAt: new Date(),
    },
  });

  console.log('✅ Membership criada');

  console.log('\n🎉 Usuário de teste criado com sucesso!');
  console.log('\n📧 Email: admin@example.com');
  console.log('🔑 Senha: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
