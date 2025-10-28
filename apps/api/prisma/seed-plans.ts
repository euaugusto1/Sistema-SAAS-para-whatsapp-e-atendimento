import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('🌱 Seeding plans...');

  // Free Plan
  await prisma.plan.upsert({
    where: { id: 'free-plan' },
    update: {},
    create: {
      id: 'free-plan',
      name: 'Gratuito',
      description: 'Plano gratuito para testar a plataforma',
      priceMonthly: 0,
      priceYearly: 0,
      messagesLimit: 100,
      contactsLimit: 50,
      features: {
        whatsappInstances: 1,
        campaigns: true,
        templates: false,
        analytics: false,
        support: 'community',
      },
      isActive: true,
    },
  });

  // Starter Plan
  await prisma.plan.upsert({
    where: { id: 'starter-plan' },
    update: {},
    create: {
      id: 'starter-plan',
      name: 'Iniciante',
      description: 'Ideal para pequenos negócios',
      priceMonthly: 49.90,
      priceYearly: 499.00,
      messagesLimit: 1000,
      contactsLimit: 500,
      features: {
        whatsappInstances: 2,
        campaigns: true,
        templates: true,
        analytics: true,
        support: 'email',
        customFields: true,
      },
      isActive: true,
    },
  });

  // Professional Plan
  await prisma.plan.upsert({
    where: { id: 'professional-plan' },
    update: {},
    create: {
      id: 'professional-plan',
      name: 'Profissional',
      description: 'Para empresas em crescimento',
      priceMonthly: 99.90,
      priceYearly: 999.00,
      messagesLimit: 5000,
      contactsLimit: 2000,
      features: {
        whatsappInstances: 5,
        campaigns: true,
        templates: true,
        analytics: true,
        support: 'priority',
        customFields: true,
        automation: true,
        webhooks: true,
      },
      isActive: true,
    },
  });

  // Enterprise Plan
  await prisma.plan.upsert({
    where: { id: 'enterprise-plan' },
    update: {},
    create: {
      id: 'enterprise-plan',
      name: 'Empresarial',
      description: 'Solução completa para grandes empresas',
      priceMonthly: 299.90,
      priceYearly: 2999.00,
      messagesLimit: null, // Unlimited
      contactsLimit: null, // Unlimited
      features: {
        whatsappInstances: null, // Unlimited
        campaigns: true,
        templates: true,
        analytics: true,
        support: '24/7',
        customFields: true,
        automation: true,
        webhooks: true,
        api: true,
        customBranding: true,
        dedicatedAccount: true,
      },
      isActive: true,
    },
  });

  console.log('✅ Plans seeded successfully!');
}

async function main() {
  try {
    await seedPlans();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
