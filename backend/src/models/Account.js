'use strict'

const { DataTypes, Model } = require('sequelize')

class Account extends Model {}

function initAccount(sequelize) {
  Account.init(
    {
      id: {
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey:   true,
      },
      userId: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type:      DataTypes.STRING(100),
        allowNull: false,
      },
      type: {
        type:         DataTypes.ENUM('checking', 'savings', 'investment', 'cash'),
        defaultValue: 'checking',
      },
      balance: {
        type:         DataTypes.DECIMAL(14, 2),
        defaultValue: 0,
        get() {
          return parseFloat(this.getDataValue('balance') ?? 0)
        },
      },
      currency: {
        type:         DataTypes.STRING(3),
        defaultValue: 'EUR',
      },
      institution: {
        type:      DataTypes.STRING(100),
        allowNull: true,
      },
      color: {
        type:         DataTypes.STRING(7),
        defaultValue: '#1A8CFF',
      },
      isActive: {
        type:         DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName:  'Account',
      tableName:  'accounts',
      timestamps: true,
    }
  )

  return Account
}

module.exports = { Account, initAccount }
