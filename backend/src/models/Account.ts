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
  /** Saldo inicial del periodo del último Excel ING (estimado: saldo tras 1.ª fila − importe de esa fila). */
  declare statementOpeningSaldo: CreationOptional<number | null>
  /** Saldo final según última fila «Saldo» del último Excel importado en esta cuenta. */
  declare statementClosingSaldo: CreationOptional<number | null>
  declare statementPeriodFirstDate: CreationOptional<string | null>
  declare statementPeriodLastDate:  CreationOptional<string | null>
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
      statementOpeningSaldo: {
        type: DataTypes.DECIMAL(14, 2), allowNull: true,
        get() {
          const v = this.getDataValue('statementOpeningSaldo') as unknown
          return v == null ? null : parseFloat(String(v))
        },
      },
      statementClosingSaldo: {
        type: DataTypes.DECIMAL(14, 2), allowNull: true,
        get() {
          const v = this.getDataValue('statementClosingSaldo') as unknown
          return v == null ? null : parseFloat(String(v))
        },
      },
      statementPeriodFirstDate: { type: DataTypes.DATEONLY, allowNull: true },
      statementPeriodLastDate:  { type: DataTypes.DATEONLY, allowNull: true },
      createdAt:   DataTypes.DATE,
      updatedAt:   DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Account',
      tableName: 'accounts',
      indexes: [
        { fields: ['userId'] },
        { fields: ['userId', 'isActive'] },
      ],
    }
  )
}
