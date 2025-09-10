-- Migration to add installment support fields to payments table
-- Run this to add missing installment fields

USE land_deals_db;

-- Add installment metadata fields if they don't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS total_installments INT DEFAULT NULL COMMENT 'Total number of installments in the series',
ADD COLUMN IF NOT EXISTS parent_amount DECIMAL(15,2) DEFAULT NULL COMMENT 'Original total amount before splitting into installments';
