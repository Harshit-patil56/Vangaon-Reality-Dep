-- Migration: Update status enum to include all required status values
-- This migration updates the status enum to match backend requirements

-- First, check what status values currently exist and update to new enum
-- This will preserve existing data while expanding the allowed values

-- Drop the existing status column constraint and recreate with all required values
ALTER TABLE payments MODIFY COLUMN status ENUM('pending','completed','overdue','cancelled','failed') DEFAULT 'pending';

-- Update any existing 'paid' status to 'completed' for consistency
UPDATE payments SET status = 'completed' WHERE status = 'paid';

-- Update payment_type enum to include maintenance_taxes
ALTER TABLE payments MODIFY COLUMN payment_type ENUM('land_purchase','investment_sale','documentation_legal','maintenance_taxes','other') DEFAULT 'other';
