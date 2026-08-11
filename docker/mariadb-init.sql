-- A second database for the test suite. The MariaDB image only creates one
-- via MARIADB_DATABASE, and running tests against SQLite while the app runs
-- on MariaDB is exactly the drift you notice later, at the first
-- ST_Distance_Sphere.
CREATE DATABASE IF NOT EXISTS beergarden_test;
GRANT ALL PRIVILEGES ON beergarden_test.* TO 'beergarden'@'%';
