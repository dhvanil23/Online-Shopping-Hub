const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');

class User extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          len: [5, 255]
        },
        set(value) {
          this.setDataValue('email', value.toLowerCase().trim());
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [config.security.passwordMinLength, 128]
        }
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          notEmpty: true
        },
        set(value) {
          this.setDataValue('firstName', value.trim());
        }
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          notEmpty: true
        },
        set(value) {
          this.setDataValue('lastName', value.trim());
        }
      },
      role: {
        type: DataTypes.ENUM('customer', 'admin', 'vendor', 'support'),
        defaultValue: 'customer',
        allowNull: false
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastLoginIP: {
        type: DataTypes.INET,
        allowNull: true
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true
      },
      preferences: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      paranoid: true, // Soft deletes
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['email']
        },
        {
          fields: ['role']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['email_verification_token']
        },
        {
          fields: ['password_reset_token']
        }
      ],
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await User.hashPassword(user.password);
          }
          if (!user.emailVerificationToken) {
            user.emailVerificationToken = User.generateToken();
            user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await User.hashPassword(user.password);
          }
        }
      }
    });
  }

  // Instance methods
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  async incrementLoginAttempts() {
    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after max attempts
    if (this.loginAttempts + 1 >= config.security.maxLoginAttempts) {
      updates.lockedUntil = new Date(Date.now() + config.security.lockoutDuration);
    }
    
    return this.update(updates);
  }

  async resetLoginAttempts() {
    return this.update({
      loginAttempts: 0,
      lockedUntil: null
    });
  }

  isLocked() {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  generatePasswordResetToken() {
    const token = User.generateToken();
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return token;
  }

  generateEmailVerificationToken() {
    const token = User.generateToken();
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    delete values.twoFactorSecret;
    delete values.deletedAt;
    return values;
  }

  // Static methods
  static async hashPassword(password) {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async findByEmail(email) {
    return this.findOne({
      where: { 
        email: email.toLowerCase().trim(),
        isActive: true
      }
    });
  }

  static async findByVerificationToken(token) {
    return this.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });
  }

  static async findByPasswordResetToken(token) {
    return this.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });
  }
}

module.exports = User;