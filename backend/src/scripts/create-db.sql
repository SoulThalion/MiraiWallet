-- Run once: mysql -u root -p < src/scripts/create-db.sql
CREATE DATABASE IF NOT EXISTS mirai_wallet      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS mirai_wallet_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON mirai_wallet.*      TO 'root'@'localhost';
GRANT ALL PRIVILEGES ON mirai_wallet_test.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Databases ready.' AS status;
