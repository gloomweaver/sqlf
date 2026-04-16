-- name: CreateUser :one
INSERT INTO users (id, email, created_at)
VALUES (@id::uuid, @email::text, now())
RETURNING id, email, created_at;

-- name: GetUser :one
SELECT id, email, created_at
FROM users
WHERE id = @id::uuid;

-- name: ListUsers :many
SELECT id, email, created_at
FROM users
ORDER BY created_at DESC;

-- name: UpdateUser :one
UPDATE users
SET email = @email::text
WHERE id = @id::uuid
RETURNING id, email, created_at;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id::uuid;
