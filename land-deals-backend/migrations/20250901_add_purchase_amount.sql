-- Migration to add purchase_amount column to deals table
-- This migration adds support for storing purchase amount per deal

ALTER TABLE deals ADD COLUMN IF NOT EXISTS purchase_amount DECIMAL(15,2) DEFAULT NULL COMMENT 'Purchase amount for the land deal';

-- Add index for better performance on purchase_amount queries
CREATE INDEX IF NOT EXISTS idx_deals_purchase_amount ON deals(purchase_amount);
