-- Backup of table: payment_proofs
CREATE TABLE "payment_proofs" (
  "id" int NOT NULL AUTO_INCREMENT,
  "payment_id" int NOT NULL,
  "file_path" varchar(1024) NOT NULL,
  "file_name" varchar(255) DEFAULT NULL,
  "doc_type" varchar(128) DEFAULT NULL,
  "uploaded_by" int DEFAULT NULL,
  "uploaded_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "idx_payment_proofs_payment_id" ("payment_id"),
  CONSTRAINT "payment_proofs_fk_payment" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE
);
INSERT INTO `payment_proofs` (id, payment_id, file_path, file_name, doc_type, uploaded_by, uploaded_at) VALUES (8, 9, 'uploads/deal_50/payments/9/1756240259_Screenshot_3.png', '1756240259_Screenshot_3.png', 'bank_transfer', 1, '2025-08-26 20:30:58');
INSERT INTO `payment_proofs` (id, payment_id, file_path, file_name, doc_type, uploaded_by, uploaded_at) VALUES (9, 19, 'uploads/deal_50/payments/19/1756247080_Screenshot_3.png', '1756247080_Screenshot_3.png', NULL, 1, '2025-08-26 22:24:39');
INSERT INTO `payment_proofs` (id, payment_id, file_path, file_name, doc_type, uploaded_by, uploaded_at) VALUES (11, 25, 'uploads/deal_50/payments/25/1756485338_Screenshot_6.png', NULL, NULL, 6, '2025-08-29 16:35:36');
