-- Performance optimization indexes
-- Run these on your database to improve query speed

-- Index for land deals queries (most common lookups)
CREATE INDEX IF NOT EXISTS idx_land_deals_owner ON land_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_land_deals_status ON land_deals(status);
CREATE INDEX IF NOT EXISTS idx_land_deals_created ON land_deals(created_at);

-- Index for payments queries
CREATE INDEX IF NOT EXISTS idx_payments_deal ON payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index for documents queries
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- Index for investors queries
CREATE INDEX IF NOT EXISTS idx_investors_deal ON investors(deal_id);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);

-- Index for users login performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_deals_owner_status ON land_deals(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_deal_date ON payments(deal_id, payment_date);
