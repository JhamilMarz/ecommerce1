import { Notification } from '@/domain/entities/notification';
import { NotificationChannel } from '@/domain/value-objects/notification-channel';
import { NotificationStatus } from '@/domain/value-objects/notification-status';

describe('Notification Entity', () => {
  const validEmail = 'test@example.com';
  const validPhone = '+1234567890';
  const validWebhookUrl = 'https://webhook.example.com/notify';

  describe('create()', () => {
    it('should create a notification with email channel', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Welcome!',
        message: 'Welcome to our platform',
        metadata: { userId: 'user-123' },
        correlationId: 'corr-123',
      });

      expect(notification.eventType).toBe('user.created');
      expect(notification.channel).toBe('email');
      expect(notification.recipientEmail).toBe(validEmail);
      expect(notification.status).toBe('pending');
      expect(notification.retries).toBe(0);
      expect(notification.id).toBeDefined();
    });

    it('should create a notification with webhook channel', () => {
      const notification = Notification.create({
        eventType: 'order.created',
        channel: 'webhook' as NotificationChannel,
        recipientId: 'merchant-123',
        recipientWebhookUrl: validWebhookUrl,
        subject: 'New Order',
        message: 'Order #123 created',
        metadata: { orderId: '123' },
        correlationId: 'corr-456',
      });

      expect(notification.channel).toBe('webhook');
      expect(notification.recipientWebhookUrl).toBe(validWebhookUrl);
      expect(notification.status).toBe('pending');
    });

    it('should throw error for invalid email', () => {
      expect(() => {
        Notification.create({
          eventType: 'user.created',
          channel: 'email' as NotificationChannel,
          recipientId: 'user-123',
          recipientEmail: 'invalid-email',
          subject: 'Test',
          message: 'Test message',
          correlationId: 'corr-789',
        });
      }).toThrow('Invalid email format');
    });

    it('should throw error for missing email with email channel', () => {
      expect(() => {
        Notification.create({
          eventType: 'user.created',
          channel: 'email' as NotificationChannel,
          recipientId: 'user-123',
          subject: 'Test',
          message: 'Test message',
          correlationId: 'corr-abc',
        });
      }).toThrow('Email is required for email notifications');
    });

    it('should throw error for missing webhook URL with webhook channel', () => {
      expect(() => {
        Notification.create({
          eventType: 'order.created',
          channel: 'webhook' as NotificationChannel,
          recipientId: 'merchant-123',
          subject: 'Test',
          message: 'Test message',
          correlationId: 'corr-def',
        });
      }).toThrow('Webhook URL is required for webhook notifications');
    });
  });

  describe('markSent()', () => {
    it('should mark notification as sent', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markSent('msg-123', { deliveredAt: new Date() });

      expect(notification.status).toBe('sent');
      expect(notification.providerResponse).toEqual({ deliveredAt: expect.any(Date) });
      expect(notification.sentAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid status transition to sent', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markSent('msg-123');
      
      expect(() => {
        notification.markSent('msg-456');
      }).toThrow('Invalid status transition');
    });
  });

  describe('markFailed()', () => {
    it('should mark notification as failed', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      const error = 'SMTP connection failed';
      notification.markFailed(error);

      expect(notification.status).toBe('failed');
      expect(notification.lastError).toBe(error);
    });
  });

  describe('markRetrying()', () => {
    it('should mark notification as retrying', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markFailed('Initial error');
      notification.markRetrying();

      expect(notification.status).toBe('retrying');
    });

    it('should throw error for invalid status transition to retrying', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markSent('msg-123');

      expect(() => {
        notification.markRetrying();
      }).toThrow('Invalid status transition');
    });
  });

  describe('incrementRetry()', () => {
    it('should increment retry count', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      expect(notification.retries).toBe(0);
      notification.incrementRetry();
      expect(notification.retries).toBe(1);
      notification.incrementRetry();
      expect(notification.retries).toBe(2);
    });
  });

  describe('canRetry()', () => {
    it('should return true when retries are below max', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markFailed('Error');
      expect(notification.canRetry()).toBe(true);
    });

    it('should return false when retries reach max', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markFailed('Error 1');
      notification.incrementRetry();
      notification.markFailed('Error 2');
      notification.incrementRetry();
      notification.markFailed('Error 3');
      notification.incrementRetry();

      expect(notification.canRetry()).toBe(false);
    });

    it('should return false when status is sent', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markSent('msg-123');
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('isTerminal()', () => {
    it('should return true for sent status', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markSent('msg-123');
      expect(notification.isTerminal()).toBe(true);
    });

    it('should return false for pending status', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      expect(notification.isTerminal()).toBe(false);
    });

    it('should return false for retrying status', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      notification.markFailed('Error');
      notification.markRetrying();
      expect(notification.isTerminal()).toBe(false);
    });
  });

  describe('validate()', () => {
    it('should validate successfully for valid notification', () => {
      const notification = Notification.create({
        eventType: 'user.created',
        channel: 'email' as NotificationChannel,
        recipientId: 'user-123',
        recipientEmail: validEmail,
        subject: 'Test',
        message: 'Test',
        correlationId: 'corr-123',
      });

      expect(() => notification.validate()).not.toThrow();
    });

    it('should throw error for empty subject', () => {
      expect(() => {
        Notification.create({
          eventType: 'user.created',
          channel: 'email' as NotificationChannel,
          recipientId: 'user-123',
          recipientEmail: validEmail,
          subject: '',
          message: 'Test',
          correlationId: 'corr-123',
        });
      }).toThrow('Subject is required');
    });

    it('should throw error for empty message', () => {
      expect(() => {
        Notification.create({
          eventType: 'user.created',
          channel: 'email' as NotificationChannel,
          recipientId: 'user-123',
          recipientEmail: validEmail,
          subject: 'Test',
          message: '',
          correlationId: 'corr-123',
        });
      }).toThrow('Message is required');
    });
  });
});
