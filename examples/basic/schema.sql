DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL
);

INSERT INTO users (id, email, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '2024-01-01T00:00:00Z'),
  ('22222222-2222-2222-2222-222222222222', 'linus@example.com', '2024-01-02T00:00:00Z');
