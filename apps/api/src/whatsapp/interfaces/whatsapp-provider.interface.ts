// Abstract provider interface for WhatsApp integration
export interface IWhatsappProvider {
  connect(instanceId: string): Promise<void>;
  disconnect(instanceId: string): Promise<void>;
  getQRCode(instanceId: string): Promise<string | null>;
  getStatus(instanceId: string): Promise<InstanceStatus>;
  sendMessage(instanceId: string, to: string, message: string): Promise<SendMessageResult>;
  isConnected(instanceId: string): Promise<boolean>;
}

export enum InstanceStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  QR_CODE = 'QR_CODE',
  ERROR = 'ERROR',
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface QRCodeData {
  qrCode: string | null;
  status: InstanceStatus;
}
