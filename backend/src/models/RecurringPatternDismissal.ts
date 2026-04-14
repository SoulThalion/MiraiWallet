import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'

export class RecurringPatternDismissal extends Model<
  InferAttributes<RecurringPatternDismissal>,
  InferCreationAttributes<RecurringPatternDismissal>
> {
  declare id:           CreationOptional<string>
  declare userId:       string
  declare patternKey:   string
  declare dismissedYm:  string
  declare createdAt:    CreationOptional<Date>
  declare updatedAt:    CreationOptional<Date>
}

export function initRecurringPatternDismissal(sequelize: Sequelize): void {
  RecurringPatternDismissal.init(
    {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patternKey:  { type: DataTypes.STRING(400), allowNull: false },
      dismissedYm: { type: DataTypes.STRING(7), allowNull: false },
      createdAt:   DataTypes.DATE,
      updatedAt:   DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'RecurringPatternDismissal',
      tableName: 'recurring_pattern_dismissals',
      indexes: [
        { fields: ['userId'] },
        { unique: true, fields: ['userId', 'patternKey'] },
        { fields: ['userId', 'dismissedYm'] },
      ],
    },
  )
}
