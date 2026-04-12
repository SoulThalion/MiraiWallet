import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'
import { AccountType } from '../types'

export class Account extends Model<
  InferAttributes<Account>,
  InferCreationAttributes<Account>
> {
  declare id:          CreationOptional<string>
  declare userId:      string
  declare name:        string
  declare type:        CreationOptional<AccountType>
  declare balance:     CreationOptional<number>
  declare currency:    CreationOptional<string>
  declare institution: CreationOptional<string | null>
  declare color:       CreationOptional<string>
  declare isActive:    CreationOptional<boolean>
  declare createdAt:   CreationOptional<Date>
  declare updatedAt:   CreationOptional<Date>
}

export function initAccount(sequelize: Sequelize): void {
  Account.init(
    {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:      { type: DataTypes.UUID, allowNull: false },
      name:        { type: DataTypes.STRING(100), allowNull: false },
      type:        { type: DataTypes.ENUM('checking', 'savings', 'investment', 'cash'), defaultValue: 'checking' },
      balance:     {
        type: DataTypes.DECIMAL(14, 2), defaultValue: 0,
        get() { return parseFloat((this.getDataValue('balance') as unknown as string) ?? '0') },
      },
      currency:    { type: DataTypes.STRING(3),   defaultValue: 'EUR' },
      institution: { type: DataTypes.STRING(100), allowNull: true },
      color:       { type: DataTypes.STRING(7),   defaultValue: '#1A8CFF' },
      isActive:    { type: DataTypes.BOOLEAN,      defaultValue: true },
      createdAt:   DataTypes.DATE,
      updatedAt:   DataTypes.DATE,
    },
    { sequelize, modelName: 'Account', tableName: 'accounts' }
  )
}
