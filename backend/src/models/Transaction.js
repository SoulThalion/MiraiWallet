'use strict'

const { DataTypes, Model } = require('sequelize')

class Transaction extends Model {}

function initTransaction(sequelize) {
  Transaction.init(
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
      accountId: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      categoryId: {
        type:      DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type:      DataTypes.STRING(200),
        allowNull: false,
      },
      amount: {
        type:      DataTypes.DECIMAL(14, 2),
        allowNull: false,
        get() {
          return parseFloat(this.getDataValue('amount') ?? 0)
        },
      },
      type: {
        type:      DataTypes.ENUM('income', 'expense', 'transfer'),
        allowNull: false,
      },
      date: {
        type:      DataTypes.DATEONLY,
        allowNull: false,
      },
      notes: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
      isRecurring: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
      },
      recurringPeriod: {
        type:      DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
        allowNull: true,
      },
      importSource: {
        type:      DataTypes.ENUM('manual', 'csv', 'bank_api'),
        defaultValue: 'manual',
      },
    },
    {
      sequelize,
      modelName:  'Transaction',
      tableName:  'transactions',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['accountId'] },
        { fields: ['categoryId'] },
        { fields: ['date'] },
        { fields: ['userId', 'date'] },
      ],
    }
  )

  return Transaction
}

module.exports = { Transaction, initTransaction }
