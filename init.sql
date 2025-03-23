\c postgres;

DROP DATABASE IF EXISTS popcorn_palace_test;
DROP DATABASE IF EXISTS popcorn_palace;


CREATE DATABASE popcorn_palace WITH OWNER = postgres;
CREATE DATABASE popcorn_palace_test WITH OWNER = postgres;

GRANT ALL PRIVILEGES ON DATABASE popcorn_palace TO postgres;
GRANT ALL PRIVILEGES ON DATABASE popcorn_palace_test TO postgres;

\c popcorn_palace
GRANT ALL ON SCHEMA public TO postgres;

\c popcorn_palace_test
GRANT ALL ON SCHEMA public TO postgres; 