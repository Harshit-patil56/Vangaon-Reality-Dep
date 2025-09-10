-- Add is_starred column to investors table
ALTER TABLE investors ADD COLUMN is_starred BOOLEAN DEFAULT FALSE;

-- Update index for better performance
CREATE INDEX IF NOT EXISTS idx_investors_starred ON investors(is_starred);
