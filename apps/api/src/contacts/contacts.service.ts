import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

interface CsvRow {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  [key: string]: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; error: string }>;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateContactDto) {
    // Check if contact with same phone already exists in organization
    const existing = await this.prisma.contact.findFirst({
      where: {
        organizationId,
        phone: this.normalizePhone(dto.phone),
      },
    });

    if (existing) {
      throw new BadRequestException('Contato com este telefone já existe.');
    }

    return this.prisma.contact.create({
      data: {
        organizationId,
        name: dto.name,
        phone: this.normalizePhone(dto.phone),
        email: dto.email?.toLowerCase(),
        company: dto.company,
        customFields: dto.customFields || {},
      },
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 50,
    filters?: {
      q?: string;
      status?: 'active' | 'blocked';
      tag?: string;
      listId?: string;
      noname?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { phone: { contains: filters.q } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters?.status === 'blocked') where.isBlocked = true;
    if (filters?.status === 'active') where.isBlocked = false;
    if (filters?.tag) where.tags = { has: filters.tag };
    if (filters?.noname) where.OR = [{ name: null }, { name: '' }];
    if (filters?.listId) {
      where.listMemberships = { some: { listId: filters.listId } };
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // Relation name in schema is `listMemberships`, not `lists`
          listMemberships: {
            include: {
              list: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      // Keep original key for backward compatibility; frontend handles both
      contacts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        listMemberships: {
          include: {
            list: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }

    return contact;
  }

  async update(organizationId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(organizationId, id); // Ensure contact exists and belongs to org

    // If phone is being updated, check for duplicates
    if (dto.phone) {
      const normalized = this.normalizePhone(dto.phone);
      const existing = await this.prisma.contact.findFirst({
        where: {
          organizationId,
          phone: normalized,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException('Outro contato com este telefone já existe.');
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone && { phone: this.normalizePhone(dto.phone) }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.customFields !== undefined && { customFields: dto.customFields }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isBlocked !== undefined && { isBlocked: dto.isBlocked }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id); // Ensure contact exists and belongs to org

    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async importCsv(organizationId: string, csvData: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      const rows = this.parseCsv(csvData);

      if (rows.length === 0) {
        throw new BadRequestException('CSV vazio ou inválido.');
      }

      // Get existing phones to check for duplicates
      const existingContacts = await this.prisma.contact.findMany({
        where: { organizationId },
        select: { phone: true },
      });

      const existingPhones = new Set(existingContacts.map((c) => c.phone));
      const processedPhones = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because of header and 0-index

        try {
          // Validate required fields
          if (!row.name || !row.phone) {
            result.errors.push({
              row: rowNumber,
              error: 'Nome e telefone são obrigatórios',
            });
            result.failed++;
            continue;
          }

          const normalizedPhone = this.normalizePhone(row.phone);

          // Check for duplicates
          if (existingPhones.has(normalizedPhone) || processedPhones.has(normalizedPhone)) {
            result.duplicates++;
            continue;
          }

          // Extract custom fields (any column that's not name, phone, email, company)
          const customFields: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            if (!['name', 'phone', 'email', 'company'].includes(key) && row[key]) {
              customFields[key] = row[key];
            }
          });

          // Create contact
          await this.prisma.contact.create({
            data: {
              organizationId,
              name: row.name,
              phone: normalizedPhone,
              email: row.email?.toLowerCase(),
              company: row.company,
              customFields: Object.keys(customFields).length > 0 ? customFields : {},
            },
          });

          processedPhones.add(normalizedPhone);
          result.success++;
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: error.message || 'Erro desconhecido',
          });
          result.failed++;
        }
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao processar CSV: ' + error.message);
    }
  }

  private parseCsv(csvData: string): CsvRow[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: CsvRow = { name: '', phone: '' };

      headers.forEach((header, index) => {
        if (values[index]) {
          row[header] = values[index];
        }
      });

      rows.push(row);
    }

    return rows;
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  // Extra operations
  async updateTags(organizationId: string, id: string, tags: string[]) {
    await this.findOne(organizationId, id);
    return this.prisma.contact.update({ where: { id }, data: { tags } });
  }

  async setBlocked(organizationId: string, id: string, isBlocked: boolean) {
    await this.findOne(organizationId, id);
    return this.prisma.contact.update({ where: { id }, data: { isBlocked } });
  }

  async addToList(
    organizationId: string,
    contactId: string,
    payload: { listId?: string; listName?: string },
  ) {
    await this.findOne(organizationId, contactId);

    let listId = payload.listId;
    if (!listId && payload.listName) {
      let list = await this.prisma.contactList.findFirst({
        where: { organizationId, name: payload.listName },
      });
      if (!list) {
        list = await this.prisma.contactList.create({
          data: { organizationId, name: payload.listName },
        });
      }
      listId = list.id;
    }
    if (!listId) throw new BadRequestException('listId ou listName é obrigatório');

    // Create membership if not exists
    await this.prisma.contactListMember.upsert({
      where: { listId_contactId: { listId, contactId } },
      update: {},
      create: { listId, contactId },
    });

    return { success: true };
  }

  async removeFromList(organizationId: string, contactId: string, listId: string) {
    await this.findOne(organizationId, contactId);
    await this.prisma.contactListMember.delete({
      where: { listId_contactId: { listId, contactId } },
    });
    return { success: true };
  }
}
