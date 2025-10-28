import { Injectable, Logger } from '@nestjs/common';
import {
  IWhatsappProvider,
  InstanceStatus,
  SendMessageResult,
} from '../interfaces/whatsapp-provider.interface';

/**
 * Evolution API Provider
 * Integration with Evolution API v2 for WhatsApp connections
 * Docs: https://doc.evolution-api.com/
 */
@Injectable()
export class EvolutionApiProvider implements IWhatsappProvider {
  private readonly logger = new Logger(EvolutionApiProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instances = new Map<string, any>();

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
  }

  async connect(instanceId: string): Promise<void> {
    this.logger.log(`Connecting instance: ${instanceId}`);
    
    try {
      // Create instance in Evolution API
      const response = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceId,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.statusText}`);
      }

      const data = await response.json();
      this.instances.set(instanceId, data);
      
      this.logger.log(`Instance created: ${instanceId}`);
    } catch (error) {
      this.logger.error(`Error connecting instance ${instanceId}:`, error);
      throw error;
    }
  }

  async disconnect(instanceId: string): Promise<void> {
    this.logger.log(`Disconnecting instance: ${instanceId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/instance/logout/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to logout instance ${instanceId}: ${response.statusText}`);
      }

      this.instances.delete(instanceId);
    } catch (error) {
      this.logger.error(`Error disconnecting instance ${instanceId}:`, error);
      throw error;
    }
  }

  async getQRCode(instanceId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.qrcode?.base64 || data.qrcode?.code || null;
    } catch (error) {
      this.logger.error(`Error getting QR code for ${instanceId}:`, error);
      return null;
    }
  }

  async getStatus(instanceId: string): Promise<InstanceStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/connectionState/${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        return InstanceStatus.DISCONNECTED;
      }

      const data = await response.json();
      const state = data.state || data.instance?.state;

      switch (state) {
        case 'open':
        case 'connected':
          return InstanceStatus.CONNECTED;
        case 'connecting':
          return InstanceStatus.CONNECTING;
        case 'qr':
          return InstanceStatus.QR_CODE;
        default:
          return InstanceStatus.DISCONNECTED;
      }
    } catch (error) {
      this.logger.error(`Error getting status for ${instanceId}:`, error);
      return InstanceStatus.ERROR;
    }
  }

  async sendMessage(instanceId: string, to: string, message: string): Promise<SendMessageResult> {
    try {
      const response = await fetch(`${this.baseUrl}/message/sendText/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number: to,
          text: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Evolution API error: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.key?.id || data.message?.key?.id,
      };
    } catch (error) {
      this.logger.error(`Error sending message from ${instanceId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async isConnected(instanceId: string): Promise<boolean> {
    const status = await this.getStatus(instanceId);
    return status === InstanceStatus.CONNECTED;
  }
}
