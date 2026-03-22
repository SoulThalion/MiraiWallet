-- Mirai Wallet — MySQL database setup
-- Run once as a privileged MySQL user:
--   mysql -u root -p < src/scripts/create-db.sql

-- ── Development database ──────────────────────────────────
CREATE DATABASE IF NOT EXISTS mirai_wallet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ── Test database (for Vitest) ────────────────────────────
CREATE DATABASE IF NOT EXISTS mirai_wallet_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ── Grant privileges (adjust user/host as needed) ─────────
GRANT ALL PRIVILEGES ON mirai_wallet.*      TO 'root'@'localhost';
GRANT ALL PRIVILEGES ON mirai_wallet_test.* TO 'root'@'localhost';

FLUSH PRIVILEGES;

SELECT 'Databases created successfully.' AS status;
