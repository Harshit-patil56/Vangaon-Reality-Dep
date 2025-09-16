-- Add owner_id and investor_id to users table for linking users to specific owners/investors
-- This allows role-based access control where users can only see their linked data

ALTER TABLE users 
ADD COLUMN owner_id INT NULL,
ADD COLUMN investor_id INT NULL,
ADD FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL,
ADD FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE SET NULL;