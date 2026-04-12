import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'
import { AlertType } from '../types'

export interface AlertAction {
  label: string
  style: 'primary' | 'secondary' | 'success' | 'gold'
}

export class Alert extends Model<
  InferAttributes<Alert>,
  InferCreationAttributes<Alert>
> {
  declare id:          CreationOptional<string>
  declare userId:      string
  declare type:        AlertType
  declare badge:       string
  declare title:       string
  declare body:        string
  declare amount:      CreationOptional<string | null>
  declare actions:     CreationOptional<AlertAction[]>
  declare isRead:      CreationOptional<boolean>
  declare isDismissed: CreationOptional<boolean>
  declare expiresAt:   CreationOptional<Date | null>
  declare createdAt:   CreationOptional<Date>
  declare updatedAt:   CreationOptional<Date>
}

export function initAlert(sequelize: Sequelize): void {
  Alert.init(
    {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:      { type: DataTypes.UUID,        allowNull: false },
      type:        { type: DataTypes.ENUM('danger', 'warning', 'success', 'info'), allowNull: false },
      badge:       { type: DataTypes.STRING(30),  allowNull: false },
      title:       { type: DataTypes.STRING(150), allowNull: false },
      body:        { type: DataTypes.TEXT,         allowNull: false },
      amount:      { type: DataTypes.STRING(50),  allowNull: true },
      actions:     { type: DataTypes.JSON,         defaultValue: [] },
      isRead:      { type: DataTypes.BOOLEAN,      defaultValue: false },
      isDismissed: { type: DataTypes.BOOLEAN,      defaultValue: false },
      expiresAt:   { type: DataTypes.DATE,         allowNull: true },
      createdAt:   DataTypes.DATE,
      updatedAt:   DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Alert',
      tableName: 'alerts',
      indexes:   [{ fields: ['userId'] }, { fields: ['userId', 'isDismissed'] }],
    }
  )
}
