import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenPayload {
  sub: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtl = process.env.JWT_ACCESS_TTL || '15m';
  private readonly refreshTokenTtl = process.env.JWT_REFRESH_TTL || '7d';
  private readonly refreshTokenTtlMs = this.parseTtlToMilliseconds(this.refreshTokenTtl);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('E-mail já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    await this.createDefaultOrganization(user.id, dto.organizationName || dto.name || dto.email);

    return this.issueTokensForUser(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.issueTokensForUser(user.id);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { id: payload.sessionId } });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    const stillValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!stillValid) {
      throw new UnauthorizedException('Token de refresh inválido.');
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Token de refresh expirado.');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.issueTokensForUser(payload.sub);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  private async issueTokensForUser(userId: string) {
    const sessionId = randomUUID();
    const payload: TokenPayload = {
      sub: userId,
      sessionId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtl,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.refreshTokenTtl,
      secret: this.getRefreshSecret(),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      },
    });

    const user = await this.getProfile(userId);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  private async createDefaultOrganization(ownerId: string, name?: string) {
    const baseName = (name || 'Minha organização').trim();
    const baseSlug = this.slugify(baseName);

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.organization.findUnique({ where: { slug } });
      if (!existing) {
        break;
      }
      slug = `${baseSlug}-${counter++}`;
    }

    await this.prisma.organization.create({
      data: {
        name: baseName,
        slug,
        owner: {
          connect: { id: ownerId },
        },
        members: {
          create: {
            role: 'OWNER',
            user: {
              connect: { id: ownerId },
            },
          },
        },
      },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, sessions, ...rest } = user;
    return rest;
  }

  private async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.getRefreshSecret(),
      });
    } catch (error) {
      throw new UnauthorizedException('Token de refresh inválido.');
    }
  }

  private getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'changeme';
  }

  private parseTtlToMilliseconds(ttl: string) {
    const match = ttl.match(/^(\d+)([smhdw])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || multipliers.d);
  }

  private slugify(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 60) || randomUUID();
  }
}
