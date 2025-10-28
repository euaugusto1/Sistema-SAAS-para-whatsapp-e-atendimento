import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      return false;
    }

    const organizationId = 
      request.params?.organizationId || 
      request.body?.organizationId ||
      request.query?.organizationId;

    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório.');
    }

    const organization = await this.organizationsService.findOneForUser(organizationId, user.id);

    request.organization = organization;

    return true;
  }
}
