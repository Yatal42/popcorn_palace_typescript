\c postgres;

-- Drop existing databases if they exist
DROP DATABASE IF EXISTS popcorn_palace_test;
DROP DATABASE IF EXISTS popcorn_palace;

-- Create user with superuser privileges (if not exists)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'popcorn_palace'
   ) THEN
      CREATE USER popcorn_palace WITH SUPERUSER PASSWORD 'popcorn_palace';
   END IF;
END
$do$;

-- Create databases
CREATE DATABASE popcorn_palace WITH OWNER = popcorn_palace;
CREATE DATABASE popcorn_palace_test WITH OWNER = popcorn_palace;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE popcorn_palace TO popcorn_palace;
GRANT ALL PRIVILEGES ON DATABASE popcorn_palace_test TO popcorn_palace;

-- Connect to each database and grant schema privileges
\c popcorn_palace
GRANT ALL ON SCHEMA public TO popcorn_palace;

\c popcorn_palace_test
GRANT ALL ON SCHEMA public TO popcorn_palace; 