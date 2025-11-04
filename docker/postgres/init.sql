-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if not exists
SELECT
  'CREATE DATABASE ai_service'
WHERE
  NOT EXISTS (
    SELECT
    FROM
      pg_database
    WHERE
      datname = 'ai_service'
  ) \ gexec -- Set timezone
SET
  timezone = 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_service TO ai_service;