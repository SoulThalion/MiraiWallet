import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'
import { TransactionType, RecurringPeriod, ImportSource } from '../types'

export class Transaction extends Model<
  InferAttributes<Transaction>,
  InferCreationAttributes<Transaction>
> {
  declare id:              CreationOptional<string>
  declare userId:          string
  declare accountId:       string
  declare categoryId:      CreationOptional<string | null>
  declare subcategoryId:   CreationOptional<string | null>
  declare description:     string
  declare amount:          number
  declare type:            TransactionType
  declare date:            string
  declare notes:           CreationOptional<string | null>
  declare isRecurring:     CreationOptional<boolean>
  declare recurringPeriod: CreationOptional<RecurringPeriod | null>
  declare importSource:    CreationOptional<ImportSource>
  /** Marcado por el usuario para ignorarlo en estadísticas/cálculos, sin borrar la fila. */
  declare isExcluded:      CreationOptional<boolean>
  declare createdAt:       CreationOptional<Date>
  declare updatedAt:       CreationOptional<Date>

  // Populated by eager loading
  declare account?:  import('./Account').Account
  declare category?:    import('./Category').Category
  declare subcategory?: import('./Subcategory').Subcategory
}

export function initTransaction(sequelize: Sequelize): void {
  Transaction.init(
    {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:      { type: DataTypes.UUID, allowNull: false },
      accountId:   { type: DataTypes.UUID, allowNull: false },
      categoryId:    { type: DataTypes.UUID, allowNull: true },
      subcategoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'subcategories', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      description: { type: DataTypes.STRING(200), allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(14, 2), allowNull: false,
        get() { return parseFloat((this.getDataValue('amount') as unknown as string) ?? '0') },
      },
      type:            { type: DataTypes.ENUM('income', 'expense', 'transfer'), allowNull: false },
      date:            { type: DataTypes.DATEONLY, allowNull: false },
      notes:           { type: DataTypes.TEXT,     allowNull: true },
      isRecurring:     { type: DataTypes.BOOLEAN,  defaultValue: false },
      recurringPeriod: { type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'), allowNull: true },
      importSource:    { type: DataTypes.ENUM('manual', 'csv', 'bank_api'), defaultValue: 'manual' },
      isExcluded:      { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt:       DataTypes.DATE,
      updatedAt:       DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
      indexes: [
        { fields: ['userId'] },
        { fields: ['accountId'] },
        { fields: ['categoryId'] },
        { fields: ['subcategoryId'] },
        { fields: ['userId', 'date'] },
        { fields: ['userId', 'isExcluded', 'date'] },
      ],
    }
  )
}
