import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and create organization', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        organizationName: 'My Org',
      };

      const hashedPassword = 'hashed_password';
      const newUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(newUser);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValueOnce('access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('refresh_hash');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...newUser,
        memberships: [],
      });

      const result = await service.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        passwordHash: hashedPassword,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw BadRequestException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('existing@example.com');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_password',
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValueOnce('access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('refresh_hash');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...user,
        memberships: [],
      });

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('user@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'notfound@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_password',
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid_refresh_token';
      const payload = {
        sub: 'user-1',
        sessionId: 'session-1',
      };

      const session = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed_refresh',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockPrismaService.session.findUnique.mockResolvedValue(session);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.delete.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValueOnce('new_access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('new_refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_refresh_hash');
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        memberships: [],
      });

      const result = await service.refresh(refreshToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
      expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if session not found', async () => {
      const refreshToken = 'invalid_token';
      const payload = {
        sub: 'user-1',
        sessionId: 'invalid-session',
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session expired', async () => {
      const refreshToken = 'expired_token';
      const payload = {
        sub: 'user-1',
        sessionId: 'session-1',
      };

      const expiredSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed_refresh',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockPrismaService.session.findUnique.mockResolvedValue(expiredSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.delete.mockResolvedValue({});

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with memberships', async () => {
      const userId = 'user-1';
      const userWithMemberships = {
        id: userId,
        email: 'user@example.com',
        name: 'User',
        passwordHash: 'hash',
        sessions: [],
        memberships: [
          {
            id: 'member-1',
            role: 'OWNER',
            organization: {
              id: 'org-1',
              name: 'My Org',
              slug: 'my-org',
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithMemberships);

      const result = await service.getProfile(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('sessions');
      expect(result).toHaveProperty('memberships');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('invalid-user')).rejects.toThrow(UnauthorizedException);
    });
  });
});
