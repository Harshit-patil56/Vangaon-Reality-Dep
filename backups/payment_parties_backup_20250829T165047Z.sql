-- Backup of table: payment_parties
CREATE TABLE "payment_parties" (
  "id" int NOT NULL AUTO_INCREMENT,
  "payment_id" int NOT NULL,
  "party_type" varchar(64) NOT NULL,
  "party_id" int DEFAULT NULL,
  "amount" decimal(15,2) DEFAULT NULL,
  "percentage" decimal(5,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "payment_id" ("payment_id"),
  CONSTRAINT "fk_payment_parties_payment" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE
);
INSERT INTO `payment_parties` (id, payment_id, party_type, party_id, amount, percentage) VALUES (1, 9, 'owner', NULL, '1000.00', NULL);
INSERT INTO `payment_parties` (id, payment_id, party_type, party_id, amount, percentage) VALUES (2, 19, 'buyer', 50, '100000.00', '100.00');
INSERT INTO `payment_parties` (id, payment_id, party_type, party_id, amount, percentage) VALUES (8, 24, 'owner', 62, NULL, NULL);
INSERT INTO `payment_parties` (id, payment_id, party_type, party_id, amount, percentage) VALUES (9, 25, 'owner', 62, NULL, NULL);
