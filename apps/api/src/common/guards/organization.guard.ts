import { BadRequestException, CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);
  
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      this.logger.warn('No user found in request');
      return false;
    }

    const organizationId = 
      request.params?.organizationId || 
      request.body?.organizationId ||
      request.query?.organizationId;

    this.logger.log(`User ${user.id} accessing with organizationId: ${organizationId}`);

    if (!organizationId) {
      this.logger.error('organizationId not provided');
      throw new BadRequestException('organizationId é obrigatório.');
    }

    const organization = await this.organizationsService.findOneForUser(organizationId, user.id);

    if (!organization) {
      this.logger.warn(`User ${user.id} does not have access to organization ${organizationId}`);
      throw new BadRequestException('Você não tem acesso a esta organização.');
    }

    request.organization = organization;
    request.user.organizationId = organizationId; // Adiciona organizationId ao user
    
    this.logger.log(`✅ User ${user.id} authorized for organization ${organizationId}`);

    return true;
  }
}
