import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationGuard } from '../common/guards/organization.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [OrganizationsService, OrganizationGuard],
  controllers: [OrganizationsController],
  exports: [OrganizationsService, OrganizationGuard],
})
export class OrganizationsModule {}
