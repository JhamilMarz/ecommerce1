import { SendNotificationUseCase } from '@/application/use-cases/send-notification';
import { NotificationRepository } from '@/domain/repositories/notification-repository';
import { NotificationProviderRegistry } from '@/application/interfaces/notification-provider';
import { Notification } from '@/domain/entities/notification';
import { NotificationChannel } from '@/domain/value-objects/notification-channel';

describe('SendNotificationUseCase', () => {
  let useCase: SendNotificationUseCase;
  let mockRepository: jest.Mocked<NotificationRepository>;
  let mockProviderRegistry: jest.Mocked<NotificationProviderRegistry>;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      send: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      }),
      isAvailable: jest.fn().mockResolvedValue(true),
      getProviderName: jest.fn().mockReturnValue('MockProvider'),
      getSupportedChannel: jest.fn().mockReturnValue('email'),
    };

    mockRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByCorrelationId: jest.fn(),
      findByEventType: jest.fn(),
      findByStatus: jest.fn(),
      findByRecipientId: jest.fn(),
      findRetryable: jest.fn(),
      countByStatus: jest.fn(),
      deleteById: jest.fn(),
    } as any;

    mockProviderRegistry = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      registerProvider: jest.fn(),
      hasProvider: jest.fn().mockReturnValue(true),
      getRegisteredChannels: jest.fn().mockReturnValue(['email', 'webhook']),
    } as any;

    useCase = new SendNotificationUseCase(mockRepository, mockProviderRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute()', () => {
    const validInput = {
      eventType: 'user.created',
      channel: 'email' as NotificationChannel,
      recipientId: 'user-123',
      recipientEmail: 'test@example.com',
      subject: 'Welcome!',
      message: 'Welcome to our platform',
      metadata: { userId: 'user-123' },
      correlationId: 'corr-123',
    };

    it('should create and send notification successfully', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute(validInput);

      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it('should return existing notification if correlationId exists (idempotency)', async () => {
      const existingNotification = Notification.create(validInput);
      existingNotification.markSent('msg-existing');
      
      mockRepository.findByCorrelationId.mockResolvedValue(existingNotification);

      const result = await useCase.execute(validInput);

      expect(result).toBe(existingNotification);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it('should throw error if provider not found for channel', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockProviderRegistry.getProvider.mockReturnValue(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'No provider found for channel: email'
      );
    });

    it('should throw error if provider is not available', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockProvider.isAvailable.mockResolvedValue(false);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Provider MockProvider is not available'
      );
    });

    it('should mark notification as failed if send fails', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);
      
      mockProvider.send.mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      });

      const result = await useCase.execute(validInput);

      expect(result.status).toBe('failed');
      expect(result.lastError).toBe('SMTP connection failed');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle provider exceptions and mark notification as failed', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);
      
      mockProvider.send.mockRejectedValue(new Error('Network timeout'));

      const result = await useCase.execute(validInput);

      expect(result.status).toBe('failed');
      expect(result.lastError).toContain('Network timeout');
    });

    it('should validate notification data before saving', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);

      const invalidInput = {
        ...validInput,
        recipientEmail: 'invalid-email',
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow('Invalid email format');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should include metadata in notification', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);

      const inputWithMetadata = {
        ...validInput,
        metadata: { userId: 'user-123', source: 'web-app' },
      };

      const result = await useCase.execute(inputWithMetadata);

      expect(result.metadata).toEqual({ userId: 'user-123', source: 'web-app' });
    });

    it('should set correlationId for idempotency', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute(validInput);

      expect(result.correlationId).toBe('corr-123');
    });

    it('should select correct provider based on channel', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);

      await useCase.execute(validInput);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith('email');
    });
  });
});
