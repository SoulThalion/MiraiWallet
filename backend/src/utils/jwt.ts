import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import env from '../config/env'
import { JwtPayload, TokenPair } from '../types'
import { User } from '../models/User'

const accessSignOptions = { expiresIn: env.jwt.expiresIn } as SignOptions
const refreshSignOptions = { expiresIn: env.jwt.refreshExpiresIn } as SignOptions

export const signAccessToken  = (payload: JwtPayload): string =>
  jwt.sign(payload, env.jwt.secret as Secret, accessSignOptions)

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.jwt.refreshSecret as Secret, refreshSignOptions)

export const verifyAccessToken  = (token: string): JwtPayload =>
  jwt.verify(token, env.jwt.secret)        as JwtPayload

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.jwt.refreshSecret) as JwtPayload

export function createTokenPair(user: User): TokenPair {
  const payload: JwtPayload = { sub: user.id, role: user.role }
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    tokenType:    'Bearer',
    expiresIn:    env.jwt.expiresIn,
  }
}
