-- Add parent_investor_id column to track which investor is the original
-- This helps prevent showing duplicates in the investor management page
ALTER TABLE investors ADD COLUMN parent_investor_id INT DEFAULT NULL;

-- Add foreign key constraint
ALTER TABLE investors ADD CONSTRAINT fk_parent_investor 
FOREIGN KEY (parent_investor_id) REFERENCES investors(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_investors_parent ON investors(parent_investor_id);