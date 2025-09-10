-- Create payment_proofs table
CREATE TABLE IF NOT EXISTS payment_proofs (
  id INT NOT NULL AUTO_INCREMENT,
  payment_id INT NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  uploaded_by INT DEFAULT NULL,
  uploaded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_proofs_payment_id (payment_id),
  CONSTRAINT payment_proofs_fk_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- create_payment_proofs_table.sql
-- Adds a table to store uploaded proof file metadata for payments

CREATE TABLE IF NOT EXISTS payment_proofs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    uploaded_by INT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON payment_proofs(payment_id);
