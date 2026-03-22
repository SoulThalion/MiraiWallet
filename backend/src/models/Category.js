'use strict'

const { DataTypes, Model } = require('sequelize')

class Category extends Model {}

function initCategory(sequelize) {
  Category.init(
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
        type:      DataTypes.STRING(60),
        allowNull: false,
      },
      icon: {
        type:         DataTypes.STRING(10),
        defaultValue: '💰',
      },
      color: {
        type:         DataTypes.STRING(7),
        defaultValue: '#1A8CFF',
      },
      monthlyBudget: {
        type:         DataTypes.DECIMAL(14, 2),
        defaultValue: 0,
        get() {
          return parseFloat(this.getDataValue('monthlyBudget') ?? 0)
        },
      },
      type: {
        type:         DataTypes.ENUM('expense', 'income'),
        defaultValue: 'expense',
      },
      isDefault: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName:  'Category',
      tableName:  'categories',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { unique: true, fields: ['userId', 'name'] },
      ],
    }
  )

  return Category
}

module.exports = { Category, initCategory }
