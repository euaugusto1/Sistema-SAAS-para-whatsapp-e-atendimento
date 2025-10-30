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
    this.logger.log(`🔌 Connecting instance: ${instanceId}`);
    this.logger.log(`Evolution API URL: ${this.baseUrl}`);
    this.logger.log(`API Key configured: ${this.apiKey ? 'Yes' : 'No'}`);
    
    try {
      // Verificar se a instância já existe
      const checkResponse = await fetch(`${this.baseUrl}/instance/fetchInstances?instanceName=${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      }).catch((err) => {
        this.logger.error(`Failed to fetch instances: ${err.message}`);
        return null;
      });

      if (checkResponse?.ok) {
        const instances = await checkResponse.json();
        this.logger.log(`Fetch response:`, JSON.stringify(instances, null, 2));
        
        const exists = Array.isArray(instances) ? instances.some(i => i.instance?.instanceName === instanceId) : instances?.instance?.instanceName === instanceId;
        
        if (exists) {
          this.logger.log(`Instance ${instanceId} already exists, trying to connect...`);
          
          // Tentar conectar instância existente
          const connectResponse = await fetch(`${this.baseUrl}/instance/connect/${instanceId}`, {
            method: 'GET',
            headers: {
              'apikey': this.apiKey,
            },
          });
          
          if (connectResponse.ok) {
            const connectData = await connectResponse.json();
            this.logger.log(`✅ Instance ${instanceId} connected successfully:`, JSON.stringify(connectData, null, 2));
            return;
          } else {
            const errorText = await connectResponse.text();
            this.logger.warn(`Connect failed: ${connectResponse.status} - ${errorText}`);
          }
        }
      }

      // Criar nova instância na Evolution API
      this.logger.log(`Creating new instance in Evolution API: ${instanceId}`);
      
      const createPayload = {
        instanceName: instanceId,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };
      
      this.logger.log(`Create payload:`, JSON.stringify(createPayload, null, 2));
      
      const response = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(createPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Evolution API error: ${response.status} - ${errorText}`);
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.instances.set(instanceId, data);
      
      this.logger.log(`✅ Instance created successfully: ${instanceId}`);
      this.logger.log(`Instance data:`, JSON.stringify(data, null, 2));
      
      // Aguardar um momento para a instância inicializar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Conectar a instância para gerar QR code
      this.logger.log(`Initiating connection for QR code generation...`);
      const connectResponse = await fetch(`${this.baseUrl}/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });
      
      if (connectResponse.ok) {
        const connectData = await connectResponse.json();
        this.logger.log(`✅ Instance ${instanceId} connection initiated:`, JSON.stringify(connectData, null, 2));
      } else {
        const errorText = await connectResponse.text();
        this.logger.warn(`Failed to initiate connection for ${instanceId}: ${connectResponse.status} - ${errorText}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error connecting instance ${instanceId}:`, error);
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
    this.logger.log(`📱 Getting QR code for instance: ${instanceId}`);
    
    try {
      // Primeiro, tenta conectar a instância para gerar o QR code
      this.logger.log(`Calling connect endpoint to generate QR...`);
      const connectResponse = await fetch(`${this.baseUrl}/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (connectResponse.ok) {
        const connectData = await connectResponse.json();
        this.logger.log(`Connect response:`, JSON.stringify(connectData, null, 2));
        
        // A Evolution API pode retornar o QR diretamente na resposta do connect
        if (connectData.qrcode) {
          this.logger.log(`✅ QR code received from connect endpoint`);
          return connectData.qrcode.base64 || connectData.qrcode.code || connectData.qrcode;
        }
        if (connectData.base64) {
          this.logger.log(`✅ QR code (base64) received from connect endpoint`);
          return connectData.base64;
        }
        if (connectData.code) {
          this.logger.log(`✅ QR code (code) received from connect endpoint`);
          return connectData.code;
        }
      } else {
        const errorText = await connectResponse.text();
        this.logger.warn(`Connect endpoint failed for ${instanceId}: ${connectResponse.status} - ${errorText}`);
      }

      // Aguardar um momento para o QR ser gerado
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar informações da instância incluindo QR code
      this.logger.log(`Fetching instance details for QR code...`);
      const fetchResponse = await fetch(`${this.baseUrl}/instance/fetchInstances?instanceName=${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        this.logger.error(`Failed to fetch instance ${instanceId}: ${fetchResponse.status} - ${errorText}`);
        return null;
      }

      const instances = await fetchResponse.json();
      this.logger.log(`Fetch instances response:`, JSON.stringify(instances, null, 2));
      
      const instance = Array.isArray(instances) 
        ? instances.find(i => i.instance?.instanceName === instanceId) 
        : instances;
      
      if (instance?.instance?.qrcode) {
        const qrcode = instance.instance.qrcode;
        this.logger.log(`✅ QR code found in instance data`);
        return qrcode.base64 || qrcode.code || qrcode.pairingCode || qrcode;
      }

      // Também verificar no nível root da resposta
      if (instance?.qrcode) {
        this.logger.log(`✅ QR code found at root level`);
        return instance.qrcode.base64 || instance.qrcode.code || instance.qrcode;
      }

      this.logger.warn(`⚠️ No QR code available for ${instanceId}. Instance state: ${instance?.instance?.state || 'unknown'}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Error getting QR code for ${instanceId}:`, error);
      return null;
    }
  }

  async getStatus(instanceId: string): Promise<InstanceStatus> {
    try {
      this.logger.log(`🔍 Checking status for instance: ${instanceId}`);
      
      const response = await fetch(`${this.baseUrl}/instance/connectionState/${instanceId}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Status check failed: ${response.status} - ${errorText}`);
        return InstanceStatus.DISCONNECTED;
      }

      const data = await response.json();
      this.logger.log(`Status response:`, JSON.stringify(data, null, 2));
      
      const state = data.state || data.instance?.state;
      this.logger.log(`Instance ${instanceId} state: ${state}`);

      switch (state) {
        case 'open':
        case 'connected':
          return InstanceStatus.CONNECTED;
        case 'connecting':
          return InstanceStatus.CONNECTING;
        case 'qr':
        case 'qrReadCode':
          return InstanceStatus.QR_CODE;
        case 'close':
        case 'closed':
          return InstanceStatus.DISCONNECTED;
        default:
          this.logger.warn(`Unknown state: ${state}, defaulting to DISCONNECTED`);
          return InstanceStatus.DISCONNECTED;
      }
    } catch (error) {
      this.logger.error(`❌ Error getting status for ${instanceId}:`, error);
      return InstanceStatus.ERROR;
    }
  }

  async sendMessage(
    instanceId: string, 
    to: string, 
    message: string, 
    media?: { url: string; type: string; caption?: string; fileName?: string }
  ): Promise<SendMessageResult> {
    try {
      // Se tem mídia, usa o endpoint sendMedia
      if (media) {
        const response = await fetch(`${this.baseUrl}/message/sendMedia/${instanceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
          body: JSON.stringify({
            number: to,
            mediatype: media.type, // image, video, audio, document
            media: media.url, // URL or base64
            caption: media.caption || message,
            fileName: media.fileName || `file.${this.getFileExtension(media.type)}`,
            mimetype: this.getMimeType(media.type),
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
      }

      // Envio de texto simples
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

  private getMimeType(mediaType: string): string {
    const mimeTypes: Record<string, string> = {
      image: 'image/png',
      video: 'video/mp4',
      audio: 'audio/mp3',
      document: 'application/pdf',
    };
    return mimeTypes[mediaType] || 'application/octet-stream';
  }

  private getFileExtension(mediaType: string): string {
    const extensions: Record<string, string> = {
      image: 'png',
      video: 'mp4',
      audio: 'mp3',
      document: 'pdf',
    };
    return extensions[mediaType] || 'bin';
  }

  async isConnected(instanceId: string): Promise<boolean> {
    const status = await this.getStatus(instanceId);
    return status === InstanceStatus.CONNECTED;
  }
}
