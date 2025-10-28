import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

const MEMBER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateOrganizationDto) {
    const slug = await this.generateUniqueSlug(dto.slug || dto.name);

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        owner: { connect: { id: ownerId } },
        members: {
          create: {
            role: MEMBER_ROLES.OWNER,
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
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
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
  }

  async findOneForUser(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findFirst({
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

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    return organization;
  }

  async getMembers(organizationId: string, userId: string) {
    await this.ensureMembership(organizationId, userId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }

  async inviteMember(organizationId: string, inviterId: string, dto: InviteMemberDto) {
    const inviterMembership = await this.ensureMembership(organizationId, inviterId);

    const inviterRole = inviterMembership.role as MemberRole;
    if (inviterRole !== MEMBER_ROLES.OWNER && inviterRole !== MEMBER_ROLES.ADMIN) {
      throw new ForbiddenException('Apenas owners e admins podem convidar membros.');
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: {
          email: dto.email,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Usuário já faz parte da organização.');
    }

    const existingInvite = await this.prisma.organizationInvite.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: dto.email,
        },
      },
    });

    if (existingInvite) {
      return {
        type: 'invite',
        invitation: existingInvite,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (user) {
      const membership = await this.prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: dto.role || MEMBER_ROLES.MEMBER,
        },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      return {
        type: 'member',
        membership,
      };
    }

    const invitation = await this.prisma.organizationInvite.create({
      data: {
        organizationId,
        email: dto.email,
        name: dto.name,
        role: dto.role || MEMBER_ROLES.MEMBER,
        inviterId,
        token: this.generateInviteToken(),
      },
    });

    return {
      type: 'invite',
      invitation,
    };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Convite já foi utilizado.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.email !== invite.email) {
      throw new ForbiddenException('Convite não pertence a este usuário.');
    }

    const existingMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId,
      },
    });

    if (existingMembership) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return existingMembership;
    }

    const membership = await this.prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
    });

    await this.prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return membership;
  }

  async isMember(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    return Boolean(membership);
  }

  async ensureMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Você não tem acesso a esta organização.');
    }

    return membership;
  }

  private async generateUniqueSlug(input: string) {
    const base = this.slugify(input);
    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.organization.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
      slug = `${base}-${counter++}`;
    }
  }

  private slugify(value: string) {
    return (value || 'organizacao')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 60) || randomUUID();
  }

  private generateInviteToken() {
    return randomUUID().replace(/-/g, '');
  }
}
