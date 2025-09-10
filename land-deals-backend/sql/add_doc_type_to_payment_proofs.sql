-- add_doc_type_to_payment_proofs.sql
-- Idempotent migration: add doc_type column to payment_proofs if it does not exist
SET @db := DATABASE();
SET @tbl := 'payment_proofs';
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = @tbl AND COLUMN_NAME = 'doc_type';
SET @sql = IF(@exists = 0, 'ALTER TABLE `payment_proofs` ADD COLUMN `doc_type` VARCHAR(128) NULL AFTER `file_path`;', 'SELECT "column_exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
