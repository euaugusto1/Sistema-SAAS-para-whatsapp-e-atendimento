import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { CurrentUser } from '../auth/current-user.decorator';

interface RequestUser {
  userId: string;
  organizationId: string;
}

@Controller('contacts')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(user.organizationId, createContactDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.contactsService.findAll(user.organizationId, page, limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contactsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.organizationId, id, updateContactDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contactsService.remove(user.organizationId, id);
  }

  @Post('import/csv')
  importCsv(@CurrentUser() user: RequestUser, @Body() importCsvDto: ImportCsvDto) {
    return this.contactsService.importCsv(user.organizationId, importCsvDto.csvData);
  }
}
