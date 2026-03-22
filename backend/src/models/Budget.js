'use strict'

const { DataTypes, Model } = require('sequelize')

class Budget extends Model {}

function initBudget(sequelize) {
  Budget.init(
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
      categoryId: {
        type:      DataTypes.UUID,
        allowNull: false,
      },
      amount: {
        type:      DataTypes.DECIMAL(14, 2),
        allowNull: false,
        get() {
          return parseFloat(this.getDataValue('amount') ?? 0)
        },
      },
      month: {
        // Format: YYYY-MM  e.g. "2024-03"
        type:      DataTypes.STRING(7),
        allowNull: false,
      },
      notes: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName:  'Budget',
      tableName:  'budgets',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { unique: true, fields: ['userId', 'categoryId', 'month'] },
      ],
    }
  )

  return Budget
}

module.exports = { Budget, initBudget }
