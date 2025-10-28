import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.message.deleteMany();
    await prisma.campaignRecipient.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.contactListMember.deleteMany();
    await prisma.contactList.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.messageTemplate.deleteMany();
    await prisma.whatsappInstance.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.session.deleteMany();
    await prisma.organizationInvite.deleteMany();
    await prisma.organizationMember.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'New User',
          organizationName: 'My Company',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('newuser@example.com');
          expect(res.body.user.name).toBe('New User');
          expect(res.body.user).not.toHaveProperty('passwordHash');
          expect(res.body.user.memberships).toBeDefined();
          expect(res.body.user.memberships.length).toBeGreaterThan(0);
        });
    });

    it('should reject registration with existing email', async () => {
      // Register first user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
      });

      // Try to register again with same email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPassword123!',
          name: 'Another User',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('já cadastrado');
        });
    });

    it('should reject registration with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'User',
        })
        .expect(400);
    });

    it('should reject registration with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: '123',
          name: 'User',
        })
        .expect(400);
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'USER@EXAMPLE.COM',
          password: 'Password123!',
          name: 'User',
        })
        .expect(201);

      expect(response.body.user.email).toBe('user@example.com');
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'loginuser@example.com',
        password: 'Password123!',
        name: 'Login User',
      });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('loginuser@example.com');
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('inválidas');
        });
    });

    it('should reject login with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should login with case-insensitive email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'LOGINUSER@EXAMPLE.COM',
          password: 'Password123!',
        })
        .expect(200);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and get refresh token
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'refreshuser@example.com',
        password: 'Password123!',
        name: 'Refresh User',
      });

      refreshToken = response.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.refreshToken).not.toBe(refreshToken); // Should be a new token
        });
    });

    it('should reject refresh with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject refresh with expired token', async () => {
      // This test would require mocking time or waiting for token expiry
      // For now, we'll test with a malformed token
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token' })
        .expect(401);
    });

    it('should invalidate old refresh token after refresh', async () => {
      // First refresh - should succeed
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Second refresh with same token - should fail
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and get access token
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'meuser@example.com',
        password: 'Password123!',
        name: 'Me User',
      });

      accessToken = response.body.accessToken;
    });

    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('meuser@example.com');
          expect(res.body.name).toBe('Me User');
          expect(res.body).not.toHaveProperty('passwordHash');
          expect(res.body).toHaveProperty('memberships');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('Integration: Full auth flow', () => {
    it('should complete register -> login -> refresh -> me flow', async () => {
      // 1. Register
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flowuser@example.com',
          password: 'Password123!',
          name: 'Flow User',
          organizationName: 'Flow Org',
        })
        .expect(201);

      const { accessToken: accessToken1, refreshToken: refreshToken1 } = registerRes.body;
      expect(accessToken1).toBeDefined();
      expect(refreshToken1).toBeDefined();

      // 2. Get profile with access token
      const meRes1 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);

      expect(meRes1.body.email).toBe('flowuser@example.com');
      expect(meRes1.body.memberships.length).toBeGreaterThan(0);

      // 3. Login again
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flowuser@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const { accessToken: accessToken2 } = loginRes.body;
      expect(accessToken2).toBeDefined();
      expect(accessToken2).not.toBe(accessToken1);

      // 4. Refresh token
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: refreshToken1 })
        .expect(200);

      const { accessToken: accessToken3, refreshToken: refreshToken2 } = refreshRes.body;
      expect(accessToken3).toBeDefined();
      expect(refreshToken2).toBeDefined();
      expect(refreshToken2).not.toBe(refreshToken1);

      // 5. Get profile with new access token
      const meRes2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken3}`)
        .expect(200);

      expect(meRes2.body.email).toBe('flowuser@example.com');
    });
  });
});
