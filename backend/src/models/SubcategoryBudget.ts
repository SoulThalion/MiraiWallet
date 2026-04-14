import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'

export class SubcategoryBudget extends Model<
  InferAttributes<SubcategoryBudget>,
  InferCreationAttributes<SubcategoryBudget>
> {
  declare id: CreationOptional<string>
  declare userId: string
  declare subcategoryId: string
  declare amount: number
  declare month: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

export function initSubcategoryBudget(sequelize: Sequelize): void {
  SubcategoryBudget.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      subcategoryId: { type: DataTypes.UUID, allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(14, 2), allowNull: false,
        get() { return parseFloat((this.getDataValue('amount') as unknown as string) ?? '0') },
      },
      month: { type: DataTypes.STRING(7), allowNull: false },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'SubcategoryBudget',
      tableName: 'subcategory_budgets',
      indexes: [{ fields: ['userId'] }, { unique: true, fields: ['userId', 'subcategoryId', 'month'] }],
    }
  )
}
