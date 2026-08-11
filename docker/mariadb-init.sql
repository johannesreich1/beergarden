-- Zweite Datenbank für die Testsuite. Das MariaDB-Image legt über
-- MARIADB_DATABASE nur eine an, und Tests gegen SQLite laufen zu lassen,
-- während die Anwendung auf MariaDB läuft, ist genau die Drift, die man
-- später beim ersten ST_Distance_Sphere bemerkt.
CREATE DATABASE IF NOT EXISTS beergarden_test;
GRANT ALL PRIVILEGES ON beergarden_test.* TO 'beergarden'@'%';
