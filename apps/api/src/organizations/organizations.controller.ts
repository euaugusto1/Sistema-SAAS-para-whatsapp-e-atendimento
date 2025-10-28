import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { OrganizationsService } from './organizations.service';
import { OrganizationGuard } from '../common/guards/organization.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.organizationsService.findAllForUser(userId);
  }

  @UseGuards(OrganizationGuard)
  @Get(':organizationId')
  async findOne(@Param('organizationId') organizationId: string, @CurrentUser('id') userId: string) {
    return this.organizationsService.findOneForUser(organizationId, userId);
  }

  @UseGuards(OrganizationGuard)
  @Get(':organizationId/members')
  async members(@Param('organizationId') organizationId: string, @CurrentUser('id') userId: string) {
    return this.organizationsService.getMembers(organizationId, userId);
  }

  @UseGuards(OrganizationGuard)
  @Post(':organizationId/invite')
  async invite(
    @Param('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(organizationId, userId, dto);
  }

  @Post('invitations/accept')
  async accept(@CurrentUser('id') userId: string, @Body() dto: AcceptInviteDto) {
    return this.organizationsService.acceptInvite(dto.token, userId);
  }
}
