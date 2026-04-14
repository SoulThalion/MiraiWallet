import {
  DataTypes, Model, InferAttributes, InferCreationAttributes,
  CreationOptional, Sequelize,
} from 'sequelize'
import bcrypt from 'bcryptjs'
import env    from '../config/env'
import { UserRole } from '../types'

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id:           CreationOptional<string>
  declare name:         string
  declare email:        string
  declare passwordHash: string
  declare role:         CreationOptional<UserRole>
  declare refreshToken: CreationOptional<string | null>
  declare isActive:     CreationOptional<boolean>
  declare lastLoginAt:  CreationOptional<Date | null>
  /** `calendar` = mes natural; `custom` = usa inicio/fin/ancla. */
  declare monthCycleMode: CreationOptional<'calendar' | 'custom'>
  declare monthCycleStartDay: CreationOptional<number>
  declare monthCycleEndDay: CreationOptional<number>
  /** `previous` = inicio en mes anterior al etiquetado; `current` = anclado al mes etiquetado (o cruza al siguiente si inicio > fin). */
  declare monthCycleAnchor: CreationOptional<'previous' | 'current'>
  /** UUIDs de categorías excluidas del detector de gastos recurrentes (JSON array). */
  declare recurringExcludedCategoryIds: CreationOptional<string[] | null>
  /** UUIDs de subcategorías excluidas del detector de gastos recurrentes (JSON array). */
  declare recurringExcludedSubcategoryIds: CreationOptional<string[] | null>
  /** UUIDs de categorías excluidas del presupuesto (JSON array). */
  declare budgetExcludedCategoryIds: CreationOptional<string[] | null>
  /** UUIDs de subcategorías excluidas del presupuesto (JSON array). */
  declare budgetExcludedSubcategoryIds: CreationOptional<string[] | null>
  /** Claves de patrones recurrentes marcados como ahorro (JSON array). */
  declare recurringSavingsPatternKeys: CreationOptional<string[] | null>
  /** UUIDs de categorías marcadas globalmente como ahorro (JSON array). */
  declare recurringSavingsCategoryIds: CreationOptional<string[] | null>
  /** UUIDs de subcategorías marcadas globalmente como ahorro (JSON array). */
  declare recurringSavingsSubcategoryIds: CreationOptional<string[] | null>
  /** Overrides de clasificación por patrón recurrente (no muta transacciones). */
  declare recurringPatternCategoryOverrides: CreationOptional<Array<{
    patternKey: string
    categoryId: string
    subcategoryId?: string | null
  }> | null>
  declare createdAt:    CreationOptional<Date>
  declare updatedAt:    CreationOptional<Date>

  async comparePassword(candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.passwordHash)
  }

  toSafeJSON(): Omit<User['_creationAttributes'], 'passwordHash' | 'refreshToken'> {
    const { passwordHash, refreshToken, ...safe } = this.toJSON() as Record<string, unknown>
    return safe as ReturnType<User['toSafeJSON']>
  }
}

export function initUser(sequelize: Sequelize): void {
  User.init(
    {
      id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name:         { type: DataTypes.STRING(100), allowNull: false, validate: { len: [2, 100] } },
      email:        { type: DataTypes.STRING(254), allowNull: false, validate: { isEmail: true } },
      passwordHash: { type: DataTypes.STRING,      allowNull: false },
      role:         { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
      refreshToken: { type: DataTypes.TEXT,         allowNull: true },
      isActive:     { type: DataTypes.BOOLEAN,      defaultValue: true },
      lastLoginAt:  { type: DataTypes.DATE,         allowNull: true },
      monthCycleMode: {
        type: DataTypes.ENUM('calendar', 'custom'),
        allowNull: false,
        defaultValue: 'calendar',
      },
      monthCycleStartDay: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1, max: 31 },
      },
      monthCycleEndDay: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 31,
        validate: { min: 1, max: 31 },
      },
      monthCycleAnchor: {
        type: DataTypes.ENUM('previous', 'current'),
        allowNull: false,
        defaultValue: 'previous',
      },
      recurringExcludedCategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      recurringExcludedSubcategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      budgetExcludedCategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      budgetExcludedSubcategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      recurringSavingsPatternKeys: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      recurringSavingsCategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      recurringSavingsSubcategoryIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      recurringPatternCategoryOverrides: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      createdAt:    DataTypes.DATE,
      updatedAt:    DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] },
        { fields: ['isActive'] },
      ],
      hooks: {
        beforeCreate: async (user) => {
          user.passwordHash = await bcrypt.hash(user.passwordHash, env.bcryptRounds)
        },
        beforeUpdate: async (user) => {
          if (user.changed('passwordHash')) {
            user.passwordHash = await bcrypt.hash(user.passwordHash, env.bcryptRounds)
          }
        },
      },
    }
  )
}
