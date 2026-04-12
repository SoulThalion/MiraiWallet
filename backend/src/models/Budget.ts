import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'

export class Budget extends Model<
  InferAttributes<Budget>,
  InferCreationAttributes<Budget>
> {
  declare id:         CreationOptional<string>
  declare userId:     string
  declare categoryId: string
  declare amount:     number
  declare month:      string   // YYYY-MM
  declare notes:      CreationOptional<string | null>
  declare createdAt:  CreationOptional<Date>
  declare updatedAt:  CreationOptional<Date>
}

export function initBudget(sequelize: Sequelize): void {
  Budget.init(
    {
      id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:     { type: DataTypes.UUID,    allowNull: false },
      categoryId: { type: DataTypes.UUID,    allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(14, 2), allowNull: false,
        get() { return parseFloat((this.getDataValue('amount') as unknown as string) ?? '0') },
      },
      month:      { type: DataTypes.STRING(7), allowNull: false },
      notes:      { type: DataTypes.TEXT,      allowNull: true },
      createdAt:  DataTypes.DATE,
      updatedAt:  DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Budget',
      tableName: 'budgets',
      indexes:   [{ fields: ['userId'] }, { unique: true, fields: ['userId', 'categoryId', 'month'] }],
    }
  )
}
