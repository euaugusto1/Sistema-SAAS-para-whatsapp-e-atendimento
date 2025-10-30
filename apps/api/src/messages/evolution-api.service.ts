import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface EvolutionGroup {
  id: string;
  subject: string;
  subjectOwner: string;
  subjectTime: number;
  size: number;
  creation: number;
  participants: Array<{
    id: string;
    admin: string | null;
  }>;
}

export interface SendTextOptions {
  number: string;
  text: string;
  delay?: number;
  quoted?: any;
  mentions?: string[];
}

export interface SendMediaOptions {
  number: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  media: string; // URL or base64
  caption?: string;
  fileName?: string;
  delay?: number;
}

export interface SendAudioOptions {
  number: string;
  audio: string; // URL or base64
  delay?: number;
  encoding?: boolean;
}

export interface SendLocationOptions {
  number: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delay?: number;
}

export interface SendContactOptions {
  number: string;
  contacts: Array<{
    fullName: string;
    phoneNumber: string;
    organization?: string;
    email?: string;
  }>;
  delay?: number;
}

export interface SendButtonsOptions {
  number: string;
  title: string;
  description: string;
  footer?: string;
  buttons: Array<{
    title: string;
    displayText: string;
    id: string;
  }>;
  delay?: number;
}

export interface SendStickerOptions {
  number: string;
  image: string; // URL or base64
  delay?: number;
}

export interface SendTemplateOptions {
  number: string;
  templateName: string;
  language: string;
  components?: any[];
}

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;

    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('Evolution API credentials not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY env variables.');
    }
  }

  private getHeaders() {
    return {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Evolution API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Evolution API request failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Falha ao comunicar com Evolution API: ${error.message}`);
    }
  }

  /**
   * Fetch all groups from an instance
   */
  async fetchAllGroups(instanceName: string): Promise<EvolutionGroup[]> {
    this.logger.log(`Fetching all groups for instance: ${instanceName}`);
    const data = await this.makeRequest(`/group/fetchAllGroups/${instanceName}`, 'GET');
    return data;
  }

  /**
   * Find group info by JID
   */
  async findGroupInfo(instanceName: string, groupJid: string): Promise<EvolutionGroup> {
    this.logger.log(`Finding group info for: ${groupJid}`);
    const data = await this.makeRequest(`/group/findGroupInfos/${instanceName}?groupJid=${groupJid}`, 'GET');
    return data;
  }

  /**
   * Send plain text message
   */
  async sendText(instanceName: string, options: SendTextOptions) {
    this.logger.log(`Sending text to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'composing',
      },
      textMessage: {
        text: options.text,
      },
    };

    if (options.mentions && options.mentions.length > 0) {
      body.options['mentions'] = {
        mentioned: options.mentions,
      };
    }

    if (options.quoted) {
      body.options['quoted'] = options.quoted;
    }

    return await this.makeRequest(`/message/sendText/${instanceName}`, 'POST', body);
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMedia(instanceName: string, options: SendMediaOptions) {
    this.logger.log(`Sending ${options.mediaType} to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'composing',
      },
      mediaMessage: {
        mediaType: options.mediaType,
        media: options.media,
        fileName: options.fileName,
        caption: options.caption,
      },
    };

    return await this.makeRequest(`/message/sendMedia/${instanceName}`, 'POST', body);
  }

  /**
   * Send WhatsApp audio
   */
  async sendAudio(instanceName: string, options: SendAudioOptions) {
    this.logger.log(`Sending audio to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'recording',
        encoding: options.encoding !== false,
      },
      audioMessage: {
        audio: options.audio,
      },
    };

    return await this.makeRequest(`/message/sendWhatsAppAudio/${instanceName}`, 'POST', body);
  }

  /**
   * Send location
   */
  async sendLocation(instanceName: string, options: SendLocationOptions) {
    this.logger.log(`Sending location to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'composing',
      },
      locationMessage: {
        name: options.name,
        address: options.address,
        latitude: options.latitude,
        longitude: options.longitude,
      },
    };

    return await this.makeRequest(`/message/sendLocation/${instanceName}`, 'POST', body);
  }

  /**
   * Send contact
   */
  async sendContact(instanceName: string, options: SendContactOptions) {
    this.logger.log(`Sending contact to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'composing',
      },
      contactMessage: options.contacts.map(contact => ({
        fullName: contact.fullName,
        phoneNumber: contact.phoneNumber,
        organization: contact.organization,
        email: contact.email,
        wuid: contact.phoneNumber,
      })),
    };

    return await this.makeRequest(`/message/sendContact/${instanceName}`, 'POST', body);
  }

  /**
   * Send buttons
   */
  async sendButtons(instanceName: string, options: SendButtonsOptions) {
    this.logger.log(`Sending buttons to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      title: options.title,
      description: options.description,
      footer: options.footer,
      buttons: options.buttons,
      delay: options.delay || 0,
    };

    return await this.makeRequest(`/message/sendButtons/${instanceName}`, 'POST', body);
  }

  /**
   * Send sticker
   */
  async sendSticker(instanceName: string, options: SendStickerOptions) {
    this.logger.log(`Sending sticker to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      options: {
        delay: options.delay || 0,
        presence: 'composing',
      },
      stickerMessage: {
        image: options.image,
      },
    };

    return await this.makeRequest(`/message/sendSticker/${instanceName}`, 'POST', body);
  }

  /**
   * Send template message
   */
  async sendTemplate(instanceName: string, options: SendTemplateOptions) {
    this.logger.log(`Sending template to ${options.number} via ${instanceName}`);
    
    const body = {
      number: options.number,
      templateMessage: {
        name: options.templateName,
        language: options.language || 'pt_BR',
        components: options.components || [],
      },
    };

    return await this.makeRequest(`/message/sendTemplate/${instanceName}`, 'POST', body);
  }

  /**
   * Send status (WhatsApp story)
   */
  async sendStatus(instanceName: string, content: string, type: 'text' | 'image' | 'video' = 'text') {
    this.logger.log(`Sending status via ${instanceName}`);
    
    const body = {
      statusMessage: {
        type,
        content,
        allContacts: true,
      },
    };

    return await this.makeRequest(`/message/sendStatus/${instanceName}`, 'POST', body);
  }
}
