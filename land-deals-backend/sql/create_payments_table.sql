-- create_payments_table.sql
-- Run this on your MySQL server to add the payments table.

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    party_type ENUM('owner','buyer','investor','other') DEFAULT 'other',
    party_id INT DEFAULT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);
-- Create idx_payments_deal_id if it does not already exist (works on older MySQL)
SELECT COUNT(*) INTO @cnt FROM information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'idx_payments_deal_id';
SET @sql = IF(@cnt = 0, 'ALTER TABLE payments ADD INDEX idx_payments_deal_id (deal_id)', 'SELECT "index_exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create idx_payments_party if it does not already exist
SELECT COUNT(*) INTO @cnt FROM information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'idx_payments_party';
SET @sql = IF(@cnt = 0, 'ALTER TABLE payments ADD INDEX idx_payments_party (party_type, party_id)', 'SELECT "index_exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
