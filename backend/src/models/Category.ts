import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'
import { CategoryType } from '../types'

export class Category extends Model<
  InferAttributes<Category>,
  InferCreationAttributes<Category>
> {
  declare id:            CreationOptional<string>
  declare userId:        string
  declare name:          string
  declare icon:          CreationOptional<string>
  declare color:         CreationOptional<string>
  declare monthlyBudget: CreationOptional<number>
  declare type:          CreationOptional<CategoryType>
  declare isDefault:     CreationOptional<boolean>
  declare createdAt:     CreationOptional<Date>
  declare updatedAt:     CreationOptional<Date>

  declare subcategories?: import('./Subcategory').Subcategory[]
}

export function initCategory(sequelize: Sequelize): void {
  Category.init(
    {
      id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:        { type: DataTypes.UUID,        allowNull: false },
      name:          { type: DataTypes.STRING(60),  allowNull: false },
      icon:          { type: DataTypes.STRING(10),  defaultValue: '💰' },
      color:         { type: DataTypes.STRING(7),   defaultValue: '#1A8CFF' },
      monthlyBudget: {
        type: DataTypes.DECIMAL(14, 2), defaultValue: 0,
        get() { return parseFloat((this.getDataValue('monthlyBudget') as unknown as string) ?? '0') },
      },
      type:          { type: DataTypes.ENUM('expense', 'income'), defaultValue: 'expense' },
      isDefault:     { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt:     DataTypes.DATE,
      updatedAt:     DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Category',
      tableName: 'categories',
      indexes:   [{ fields: ['userId'] }, { unique: true, fields: ['userId', 'name'] }],
    }
  )
}
