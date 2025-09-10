-- Migration: Add percentage_share column to investors table
-- Date: 2025-09-07
-- Purpose: Add percentage_share column to investors table to match owners table structure for share management

-- Add percentage_share column to investors table
ALTER TABLE investors ADD COLUMN percentage_share DECIMAL(5,2) DEFAULT 0.00;

-- Optional: Copy data from investment_percentage to percentage_share if needed
-- UPDATE investors SET percentage_share = investment_percentage WHERE investment_percentage IS NOT NULL;
