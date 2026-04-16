-- name: GetUser :one
SELECT id, email, created_at
FROM users
WHERE id = @id::uuid;

-- name: ListUsers :many
SELECT id, email, created_at
FROM users
ORDER BY created_at DESC;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id::uuid;
