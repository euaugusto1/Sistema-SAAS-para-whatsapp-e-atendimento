import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    organizationInvite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization with owner', async () => {
      const ownerId = 'user-1';
      const dto = {
        name: 'Test Organization',
        slug: 'test-org',
      };

      const expectedOrg = {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        ownerId,
        members: [
          {
            id: 'member-1',
            role: 'OWNER',
            user: {
              id: ownerId,
              email: 'owner@example.com',
              name: 'Owner',
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(expectedOrg);

      const result = await service.create(ownerId, dto);

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Organization',
          slug: 'test-org',
          owner: { connect: { id: ownerId } },
          members: {
            create: {
              role: 'OWNER',
              user: { connect: { id: ownerId } },
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      });
      expect(result).toEqual(expectedOrg);
    });

    it('should generate unique slug if provided slug exists', async () => {
      const ownerId = 'user-1';
      const dto = {
        name: 'Test Organization',
        slug: 'test-org',
      };

      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'test-org' }) // First check - slug exists
        .mockResolvedValueOnce(null); // Second check - test-org-1 is available

      mockPrismaService.organization.create.mockResolvedValue({
        id: 'org-1',
        slug: 'test-org-1',
      });

      await service.create(ownerId, dto);

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'test-org-1',
          }),
        }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return all organizations for a user', async () => {
      const userId = 'user-1';
      const organizations = [
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          members: [],
        },
        {
          id: 'org-2',
          name: 'Org 2',
          slug: 'org-2',
          members: [],
        },
      ];

      mockPrismaService.organization.findMany.mockResolvedValue(organizations);

      const result = await service.findAllForUser(userId);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: { userId },
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      });
      expect(result).toEqual(organizations);
    });
  });

  describe('findOneForUser', () => {
    it('should return organization if user is a member', async () => {
      const organizationId = 'org-1';
      const userId = 'user-1';
      const organization = {
        id: organizationId,
        name: 'My Org',
        slug: 'my-org',
        members: [],
      };

      mockPrismaService.organization.findFirst.mockResolvedValue(organization);

      const result = await service.findOneForUser(organizationId, userId);

      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          id: organizationId,
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      });
      expect(result).toEqual(organization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.findOneForUser('invalid-org', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMembers', () => {
    it('should return members if user has access', async () => {
      const organizationId = 'org-1';
      const userId = 'user-1';
      const membership = { id: 'member-1', role: 'OWNER' };
      const members = [
        {
          id: 'member-1',
          role: 'OWNER',
          user: { id: userId, email: 'owner@example.com', name: 'Owner' },
        },
      ];

      mockPrismaService.organizationMember.findFirst.mockResolvedValue(membership);
      mockPrismaService.organizationMember.findMany.mockResolvedValue(members);

      const result = await service.getMembers(organizationId, userId);

      expect(result).toEqual(members);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);

      await expect(service.getMembers('org-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('inviteMember', () => {
    it('should add existing user as member directly', async () => {
      const organizationId = 'org-1';
      const inviterId = 'user-1';
      const dto = {
        email: 'newmember@example.com',
        role: 'MEMBER' as const,
      };

      const inviterMembership = { id: 'member-1', role: 'OWNER' };
      const existingUser = { id: 'user-2', email: 'newmember@example.com' };
      const newMembership = {
        id: 'member-2',
        role: 'MEMBER',
        user: { id: 'user-2', email: 'newmember@example.com', name: 'New Member' },
      };

      mockPrismaService.organizationMember.findFirst
        .mockResolvedValueOnce(inviterMembership) // Inviter check
        .mockResolvedValueOnce(null); // Existing member check
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.organizationMember.create.mockResolvedValue(newMembership);

      const result = await service.inviteMember(organizationId, inviterId, dto);

      expect(result.type).toBe('member');
      expect(result.membership).toEqual(newMembership);
    });

    it('should create invitation for non-existing user', async () => {
      const organizationId = 'org-1';
      const inviterId = 'user-1';
      const dto = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'MEMBER' as const,
      };

      const inviterMembership = { id: 'member-1', role: 'ADMIN' };
      const invitation = {
        id: 'invite-1',
        email: 'newuser@example.com',
        token: 'invite-token',
      };

      mockPrismaService.organizationMember.findFirst
        .mockResolvedValueOnce(inviterMembership)
        .mockResolvedValueOnce(null);
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationInvite.create.mockResolvedValue(invitation);

      const result = await service.inviteMember(organizationId, inviterId, dto);

      expect(result.type).toBe('invite');
      expect(result.invitation).toEqual(invitation);
    });

    it('should throw ForbiddenException if inviter is not OWNER or ADMIN', async () => {
      const organizationId = 'org-1';
      const inviterId = 'user-1';
      const dto = { email: 'new@example.com' };

      const memberMembership = { id: 'member-1', role: 'MEMBER' };

      mockPrismaService.organizationMember.findFirst.mockResolvedValue(memberMembership);

      await expect(service.inviteMember(organizationId, inviterId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if user already a member', async () => {
      const organizationId = 'org-1';
      const inviterId = 'user-1';
      const dto = { email: 'existing@example.com' };

      const inviterMembership = { id: 'member-1', role: 'OWNER' };
      const existingMembership = { id: 'member-2' };

      mockPrismaService.organizationMember.findFirst
        .mockResolvedValueOnce(inviterMembership)
        .mockResolvedValueOnce(existingMembership);

      await expect(service.inviteMember(organizationId, inviterId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite and create membership', async () => {
      const token = 'invite-token';
      const userId = 'user-1';
      const invite = {
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'user@example.com',
        role: 'MEMBER',
        acceptedAt: null,
      };

      const user = {
        id: userId,
        email: 'user@example.com',
      };

      const newMembership = {
        id: 'member-1',
        organizationId: 'org-1',
        userId,
        role: 'MEMBER',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(invite);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue(newMembership);
      mockPrismaService.organizationInvite.update.mockResolvedValue({});

      const result = await service.acceptInvite(token, userId);

      expect(result).toEqual(newMembership);
      expect(mockPrismaService.organizationInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { acceptedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvite('invalid-token', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invite already accepted', async () => {
      const invite = {
        id: 'invite-1',
        acceptedAt: new Date(),
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(invite);

      await expect(service.acceptInvite('token', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if email does not match', async () => {
      const invite = {
        id: 'invite-1',
        email: 'other@example.com',
        acceptedAt: null,
      };

      const user = {
        id: 'user-1',
        email: 'user@example.com',
      };

      mockPrismaService.organizationInvite.findUnique.mockResolvedValue(invite);
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.acceptInvite('token', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isMember', () => {
    it('should return true if user is a member', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue({ id: 'member-1' });

      const result = await service.isMember('org-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if user is not a member', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);

      const result = await service.isMember('org-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('ensureMembership', () => {
    it('should return membership if user is a member', async () => {
      const membership = { id: 'member-1', role: 'OWNER' };

      mockPrismaService.organizationMember.findFirst.mockResolvedValue(membership);

      const result = await service.ensureMembership('org-1', 'user-1');

      expect(result).toEqual(membership);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);

      await expect(service.ensureMembership('org-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
