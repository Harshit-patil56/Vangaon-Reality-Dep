-- Migration: Add share tracking columns to owners table
-- Date: 2025-09-07
-- Purpose: Add percentage_share and investment_amount columns to owners table for share management feature

-- Add percentage share column to owners table (ignore if exists)
ALTER TABLE owners ADD COLUMN percentage_share DECIMAL(5,2) DEFAULT 0.00;

-- Add investment amount column to owners table (ignore if exists)
ALTER TABLE owners ADD COLUMN investment_amount DECIMAL(15,2) DEFAULT 0.00;
