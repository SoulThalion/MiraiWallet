'use strict'

const { DataTypes, Model } = require('sequelize')
const bcrypt               = require('bcryptjs')
const env                  = require('../config/env')

class User extends Model {
  // ── Instance helpers ──────────────────────────────────
  async comparePassword(candidate) {
    return bcrypt.compare(candidate, this.passwordHash)
  }

  toSafeJSON() {
    const { passwordHash, refreshToken, ...safe } = this.toJSON()
    return safe
  }
}

function initUser(sequelize) {
  User.init(
    {
      id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
      },
      name: {
        type:      DataTypes.STRING(100),
        allowNull: false,
        validate:  { len: [2, 100] },
      },
      email: {
        type:      DataTypes.STRING(254),
        allowNull: false,
        unique:    true,
        validate:  { isEmail: true },
      },
      passwordHash: {
        type:      DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type:         DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
      },
      refreshToken: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type:         DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLoginAt: {
        type:      DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName:  'User',
      tableName:  'users',
      timestamps: true,  // createdAt, updatedAt
      hooks: {
        // Hash password before create or update
        beforeCreate: async (user) => {
          if (user.passwordHash) {
            user.passwordHash = await bcrypt.hash(user.passwordHash, env.bcryptRounds)
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('passwordHash')) {
            user.passwordHash = await bcrypt.hash(user.passwordHash, env.bcryptRounds)
          }
        },
      },
    }
  )

  return User
}

module.exports = { User, initUser }
