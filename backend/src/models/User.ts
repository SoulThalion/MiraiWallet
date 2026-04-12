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
      email:        { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
      passwordHash: { type: DataTypes.STRING,      allowNull: false },
      role:         { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
      refreshToken: { type: DataTypes.TEXT,         allowNull: true },
      isActive:     { type: DataTypes.BOOLEAN,      defaultValue: true },
      lastLoginAt:  { type: DataTypes.DATE,         allowNull: true },
      createdAt:    DataTypes.DATE,
      updatedAt:    DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
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
