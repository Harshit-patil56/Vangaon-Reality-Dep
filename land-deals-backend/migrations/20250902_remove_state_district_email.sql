-- Migration to remove state, district columns from deals table and email columns from owners, buyers, investors tables
-- Run this migration AFTER updating your application code

-- Remove state and district columns from deals table
ALTER TABLE deals DROP COLUMN state;
ALTER TABLE deals DROP COLUMN district;
ALTER TABLE deals DROP COLUMN state_id;
ALTER TABLE deals DROP COLUMN district_id;

-- Remove email columns from owners table
ALTER TABLE owners DROP COLUMN email;

-- Remove email columns from buyers table  
ALTER TABLE buyers DROP COLUMN email;

-- Remove email columns from investors table
ALTER TABLE investors DROP COLUMN email;

-- Drop the states and districts tables if they exist (since we're not using them anymore)
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS states;
