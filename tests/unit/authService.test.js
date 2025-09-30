const authService = require('../../src/services/authService');
const { User } = require('../../src/models');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models');
jest.mock('../../src/services/emailService');
jest.mock('../../src/services/cacheService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ id: '123', ...userData });

      const result = await authService.register(userData);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(User.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '123');
    });

    it('should throw error if user already exists', async () => {
      const userData = { email: 'existing@example.com' };
      User.findOne.mockResolvedValue({ id: '123' });

      await expect(authService.register(userData)).rejects.toThrow('User already exists with this email');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: 'john@example.com',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        update: jest.fn()
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.login('john@example.com', 'password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(mockUser.update).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.login('invalid@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const userId = '123';
      const tokens = authService.generateTokens(userId);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      
      const decodedAccess = jwt.decode(tokens.accessToken);
      expect(decodedAccess.id).toBe(userId);
    });
  });
});