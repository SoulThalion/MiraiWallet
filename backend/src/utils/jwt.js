'use strict'

const jwt = require('jsonwebtoken')
const env = require('../config/env')

/**
 * JWT utilities — sign and verify access + refresh tokens.
 * Tokens include only the userId (and role) in the payload
 * to keep them small; all other user data is fetched from DB.
 */

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn })
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret)
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret)
}

/**
 * Build the full token pair returned to the client on login / refresh.
 */
function createTokenPair(user) {
  const payload = { sub: user.id, role: user.role }
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    tokenType:    'Bearer',
    expiresIn:    env.jwt.expiresIn,
  }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, createTokenPair }
