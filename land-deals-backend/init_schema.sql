-- Complete database schema for Land Deals Manager
-- This script creates all necessary tables for the application

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Normalized location tables
-- States (one row per state/UT)
CREATE TABLE IF NOT EXISTS states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Districts belong to a state
CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE KEY uk_state_district (state_id, name)
);

-- Deals table (main table)
CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    -- Legacy textual state/district kept for backward compatibility
    state VARCHAR(100),
    district VARCHAR(100),
    -- Normalized references (preferred)
    state_id INT,
    district_id INT,
    area DECIMAL(10,2),
    price DECIMAL(15,2),
    deal_type ENUM('buy', 'sell', 'lease') DEFAULT 'buy',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
);

-- Owners table
CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Buyers table  
CREATE TABLE IF NOT EXISTS buyers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Investors table
CREATE TABLE IF NOT EXISTS investors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    investor_name VARCHAR(100) NOT NULL,
    investment_amount DECIMAL(15,2),
    investment_percentage DECIMAL(5,2),
    mobile VARCHAR(15),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, password_hash, email) 
VALUES ('admin', 'scrypt:32768:8:1$gOAX2lNKA8HLaKht$6a5e7c3d4f2b1e8c9a0b3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4', 'admin@example.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_owners_deal_id ON owners(deal_id);
CREATE INDEX IF NOT EXISTS idx_buyers_deal_id ON buyers(deal_id);
CREATE INDEX IF NOT EXISTS idx_investors_deal_id ON investors(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal_id ON documents(deal_id);
