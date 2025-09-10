-- Idempotent creation of payment_proofs and index compatible with older MySQL
CREATE TABLE IF NOT EXISTS payment_proofs (
  id INT NOT NULL AUTO_INCREMENT,
  payment_id INT NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  uploaded_by INT DEFAULT NULL,
  uploaded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT payment_proofs_fk_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create index if it does not exist
SET @schema := DATABASE();
SET @tbl := 'payment_proofs';
SET @idx := 'idx_payment_proofs_payment_id';
SELECT COUNT(*) INTO @exists FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@schema AND TABLE_NAME=@tbl AND INDEX_NAME=@idx;
SET @sql = IF(@exists=0, CONCAT('CREATE INDEX ', @idx, ' ON ', @tbl, '(payment_id)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
