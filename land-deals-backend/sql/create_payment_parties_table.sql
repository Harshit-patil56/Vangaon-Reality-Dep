-- create_payment_parties_table.sql
-- Idempotent: create payment_parties table if not exists
SET @db := DATABASE();
SELECT COUNT(*) INTO @exists FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payment_parties';
SET @sql = IF(@exists = 0,
  'CREATE TABLE `payment_parties` (
     `id` INT AUTO_INCREMENT PRIMARY KEY,
     `payment_id` INT NOT NULL,
     `party_type` VARCHAR(64) NOT NULL,
     `party_id` INT NULL,
     `amount` DECIMAL(15,2) NULL,
     `percentage` DECIMAL(5,2) NULL,
     INDEX (`payment_id`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
  , 'SELECT "table_exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
