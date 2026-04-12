import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'

export class Subcategory extends Model<
  InferAttributes<Subcategory>,
  InferCreationAttributes<Subcategory>
> {
  declare id:          CreationOptional<string>
  declare userId:      string
  declare categoryId: string
  declare name:        string
  declare icon:        CreationOptional<string>
  declare color:       CreationOptional<string>
  declare createdAt:   CreationOptional<Date>
  declare updatedAt:   CreationOptional<Date>
}

export function initSubcategory(sequelize: Sequelize): void {
  Subcategory.init(
    {
      id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId:     { type: DataTypes.UUID, allowNull: false },
      categoryId: { type: DataTypes.UUID, allowNull: false },
      name:       { type: DataTypes.STRING(60), allowNull: false },
      icon:       { type: DataTypes.STRING(10), defaultValue: '📁' },
      color:      { type: DataTypes.STRING(7), defaultValue: '#1A8CFF' },
      createdAt:  DataTypes.DATE,
      updatedAt:  DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Subcategory',
      tableName: 'subcategories',
      indexes: [
        { fields: ['userId'] },
        { fields: ['categoryId'] },
        { unique: true, fields: ['userId', 'categoryId', 'name'] },
      ],
    }
  )
}
