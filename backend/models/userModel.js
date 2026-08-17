const crypto = require('crypto');
const pool = require('../config/db');

const createUser = async (name, email, passwordHash) => {
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, role',
    [name, email, passwordHash]
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

const createRefreshTokenRecord = async (userId, refreshToken) => {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, hash, expiresAt]
  );

  return result.rows[0];
};

const findRefreshTokenRecord = async (refreshToken) => {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hash]
  );

  return result.rows[0];
};

const revokeRefreshToken = async (refreshToken) => {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1`,
    [hash]
  );
};

const revokeAllUserRefreshTokens = async (userId) => {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  createRefreshTokenRecord,
  findRefreshTokenRecord,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};