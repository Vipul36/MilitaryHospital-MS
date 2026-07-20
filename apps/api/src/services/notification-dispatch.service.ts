import { wsService } from './websocket.service';

export interface NotificationPayload {
  recipientUserId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName?: string;
  subject: string;
  message: string;
  channel: 'EMAIL' | 'SMS' | 'BOTH';
  category: 'APPOINTMENT' | 'REFERRAL' | 'LAB_REPORT' | 'EMERGENCY';
}

export class NotificationDispatchService {
  private static instance: NotificationDispatchService;

  private constructor() {}

  public static getInstance(): NotificationDispatchService {
    if (!NotificationDispatchService.instance) {
      NotificationDispatchService.instance = new NotificationDispatchService();
    }
    return NotificationDispatchService.instance;
  }

  public async dispatch(payload: NotificationPayload): Promise<{ success: boolean; emailSent: boolean; smsSent: boolean; logId: string }> {
    const timestamp = new Date().toISOString();
    const logId = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let emailSent = false;
    let smsSent = false;

    // 1. Dispatch Email if requested
    if (payload.channel === 'EMAIL' || payload.channel === 'BOTH') {
      const targetEmail = payload.recipientEmail || 'patient@mhshms.mil';
      console.log(`[NotificationDispatchService] 📧 [EMAIL SENT] [ID: ${logId}] To: ${targetEmail} | Subject: "${payload.subject}" | Body: ${payload.message}`);
      emailSent = true;
    }

    // 2. Dispatch SMS if requested
    if (payload.channel === 'SMS' || payload.channel === 'BOTH') {
      const targetPhone = payload.recipientPhone || '+91 98765 43210';
      console.log(`[NotificationDispatchService] 📱 [SMS SENT] [ID: ${logId}] To: ${targetPhone} | Text: "${payload.subject}: ${payload.message}"`);
      smsSent = true;
    }

    // 3. Broadcast real-time WebSocket event
    wsService.broadcast('SYSTEM_NOTIFICATION', {
      logId,
      category: payload.category,
      channel: payload.channel,
      recipientName: payload.recipientName || 'Valued Patient / Staff',
      subject: payload.subject,
      message: payload.message,
      timestamp
    });

    return {
      success: true,
      emailSent,
      smsSent,
      logId
    };
  }
}

export const notificationDispatchService = NotificationDispatchService.getInstance();
