import { PasswordHashingService } from '../../../infrastructure/services/PasswordHashingService';

describe('PasswordHashingService', () => {
  let passwordHashingService: PasswordHashingService;

  beforeEach(() => {
    passwordHashingService = new PasswordHashingService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'Test123!@#';
      const hash = await passwordHashingService.hash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test123!@#';
      const hash1 = await passwordHashingService.hash(password);
      const hash2 = await passwordHashingService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'Test123!@#';
      const hash = await passwordHashingService.hash(password);

      const isValid = await passwordHashingService.verify(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'Test123!@#';
      const wrongPassword = 'Wrong123!@#';
      const hash = await passwordHashingService.hash(password);

      const isValid = await passwordHashingService.verify(hash, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'Test123!@#';
      const invalidHash = 'not_a_valid_hash';

      const isValid = await passwordHashingService.verify(invalidHash, password);

      expect(isValid).toBe(false);
    });
  });
});
