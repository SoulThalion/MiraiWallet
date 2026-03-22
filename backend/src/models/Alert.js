'use strict'

const { DataTypes, Model } = require('sequelize')

class Alert extends Model {}

function initAlert(sequelize) {
  Alert.init(
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
      type: {
        type:      DataTypes.ENUM('danger', 'warning', 'success', 'info'),
        allowNull: false,
      },
      badge: {
        type:      DataTypes.STRING(30),
        allowNull: false,
      },
      title: {
        type:      DataTypes.STRING(150),
        allowNull: false,
      },
      body: {
        type:      DataTypes.TEXT,
        allowNull: false,
      },
      amount: {
        type:      DataTypes.STRING(50),
        allowNull: true,
      },
      actions: {
        // JSON array: [{ label, style }]
        type:      DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      isRead: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isDismissed: {
        type:         DataTypes.BOOLEAN,
        defaultValue: false,
      },
      expiresAt: {
        type:      DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName:  'Alert',
      tableName:  'alerts',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['userId', 'isDismissed'] },
      ],
    }
  )

  return Alert
}

module.exports = { Alert, initAlert }
