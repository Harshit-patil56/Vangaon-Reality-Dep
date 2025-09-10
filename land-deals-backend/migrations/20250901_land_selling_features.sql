-- Migration: Land Selling Features
-- Date: 2025-09-01
-- Description: Add features for land selling, geolocation, audit logs, and payment reminders

-- 1. Update deals table for selling features and geolocation
ALTER TABLE deals 
ADD COLUMN latitude DECIMAL(10, 8) NULL,
ADD COLUMN longitude DECIMAL(11, 8) NULL,
ADD COLUMN asking_price DECIMAL(15, 2) NULL,
ADD COLUMN listing_date DATE NULL,
ADD COLUMN sold_date DATE NULL,
ADD COLUMN sold_price DECIMAL(15, 2) NULL;

-- Update status enum to include selling statuses
ALTER TABLE deals 
MODIFY COLUMN status ENUM('Open', 'In Progress', 'Completed', 'On Hold', 'Cancelled', 'For Sale', 'Sold') DEFAULT 'Open';

-- 2. Create offers table for managing buyer offers
CREATE TABLE offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NULL,
    buyer_phone VARCHAR(20) NULL,
    offer_amount DECIMAL(15, 2) NOT NULL,
    offer_date DATE NOT NULL,
    status ENUM('Pending', 'Accepted', 'Rejected', 'Countered') DEFAULT 'Pending',
    notes TEXT NULL,
    valid_until DATE NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_deal_offers (deal_id),
    INDEX idx_offer_status (status),
    INDEX idx_offer_date (offer_date)
);

-- 3. Create activity_logs table for audit trail
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'deal', 'payment', 'offer', etc.
    entity_id INT NOT NULL,
    entity_name VARCHAR(255) NULL, -- For easy reference
    changes JSON NULL, -- Store the actual changes
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_logs (user_id),
    INDEX idx_entity_logs (entity_type, entity_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
);

-- 4. Create payment_reminders table for tracking reminder notifications
CREATE TABLE payment_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_type ENUM('7_days', '3_days', '1_day', 'overdue') NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    notification_method ENUM('email', 'in_app', 'both') DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_payment_reminders (payment_id),
    INDEX idx_reminder_date (reminder_date),
    INDEX idx_reminder_status (status),
    UNIQUE KEY unique_payment_reminder (payment_id, reminder_type)
);

-- 5. Create notifications table for in-app notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success', 'payment_reminder') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(50) NULL,
    related_entity_id INT NULL,
    action_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notifications (user_id),
    INDEX idx_unread_notifications (user_id, is_read),
    INDEX idx_notification_type (type),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for testing
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, changes) 
VALUES (1, 'MIGRATION', 'system', 0, 'Land Selling Features Migration', '{"description": "Added selling features, geolocation, audit logs, and reminders"}');
