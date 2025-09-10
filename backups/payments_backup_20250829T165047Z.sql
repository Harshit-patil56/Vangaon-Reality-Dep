-- Backup of table: payments
CREATE TABLE "payments" (
  "id" int NOT NULL AUTO_INCREMENT,
  "deal_id" int NOT NULL,
  "party_type" enum('owner','buyer','investor','other') DEFAULT 'other',
  "party_id" int DEFAULT NULL,
  "amount" decimal(15,2) NOT NULL,
  "currency" varchar(10) DEFAULT 'INR',
  "payment_date" date NOT NULL,
  "payment_mode" varchar(50) DEFAULT NULL,
  "reference" varchar(255) DEFAULT NULL,
  "notes" text,
  "created_by" int DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "category" enum('buy','sell','docs','other') DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "idx_payments_deal_id" ("deal_id"),
  KEY "idx_payments_party" ("party_type","party_id"),
  CONSTRAINT "payments_ibfk_1" FOREIGN KEY ("deal_id") REFERENCES "deals" ("id") ON DELETE CASCADE
);
INSERT INTO `payments` (id, deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, created_at, category) VALUES (9, 50, 'other', NULL, '1000.00', 'INR', '2025-08-27', 'cash', 'test', '', 1, '2025-08-26 20:18:00', 'docs');
INSERT INTO `payments` (id, deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, created_at, category) VALUES (19, 50, 'other', NULL, '100000.00', 'INR', '2025-08-27', 'NEFT', 'test', '', 1, '2025-08-26 22:24:38', 'other');
INSERT INTO `payments` (id, deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, created_at, category) VALUES (24, 50, 'other', NULL, '23123.00', 'INR', '2025-07-29', 'NEFT', 'test', '', 6, '2025-08-29 16:29:44', 'buy');
INSERT INTO `payments` (id, deal_id, party_type, party_id, amount, currency, payment_date, payment_mode, reference, notes, created_by, created_at, category) VALUES (25, 50, 'other', NULL, '100000.00', 'INR', '2025-08-29', 'Cash', 'testTGFTGdawdawdaw', '', 6, '2025-08-29 16:35:36', 'buy');
