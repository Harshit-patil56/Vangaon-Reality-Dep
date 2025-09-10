-- Migration: add optional status & due_date to payments, and role/pay_to fields to payment_parties
-- Safe to run multiple times (IF NOT EXISTS guards where supported)

ALTER TABLE payments ADD COLUMN IF NOT EXISTS status ENUM('paid','pending','overdue') DEFAULT NULL AFTER payment_type;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date DATE AFTER payment_date;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type ENUM('land_purchase','investment_sale','documentation_legal','other') DEFAULT 'other' AFTER notes;

ALTER TABLE payment_parties ADD COLUMN IF NOT EXISTS role ENUM('payer','payee') DEFAULT NULL AFTER percentage;
ALTER TABLE payment_parties ADD COLUMN IF NOT EXISTS pay_to_id INT DEFAULT NULL AFTER role;
ALTER TABLE payment_parties ADD COLUMN IF NOT EXISTS pay_to_type ENUM('owner','buyer','investor','other') DEFAULT NULL AFTER pay_to_id;
ALTER TABLE payment_parties ADD COLUMN IF NOT EXISTS pay_to_name VARCHAR(255) DEFAULT NULL AFTER pay_to_type;

-- Indexes for faster traversal of payment flows
CREATE INDEX IF NOT EXISTS idx_payment_parties_pay_to ON payment_parties(pay_to_type, pay_to_id);
