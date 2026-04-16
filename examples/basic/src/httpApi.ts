import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "@effect/platform";
import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, Redacted, Schema } from "effect";
import { randomUUID } from "node:crypto";
import {
  CreateUserResultSchema,
  GetUserResultSchema,
  ListUsersResultSchema,
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "../generated/index.ts";

const UserIdParam = HttpApiSchema.param("id", Schema.UUID);

const CreateUserPayloadSchema = Schema.Struct({
  email: Schema.String,
});

const UpdateUserPayloadSchema = Schema.Struct({
  email: Schema.String,
});

export const UsersApi = HttpApi.make("effql-example").add(
  HttpApiGroup.make("users")
    .add(
      HttpApiEndpoint.post("createUser", "/users")
        .setPayload(CreateUserPayloadSchema)
        .addSuccess(CreateUserResultSchema),
    )
    .add(HttpApiEndpoint.get("listUsers", "/users").addSuccess(Schema.Array(ListUsersResultSchema)))
    .add(HttpApiEndpoint.get("getUser")`/users/${UserIdParam}`.addSuccess(GetUserResultSchema))
    .add(
      HttpApiEndpoint.put("updateUser")`/users/${UserIdParam}`
        .setPayload(UpdateUserPayloadSchema)
        .addSuccess(GetUserResultSchema),
    )
    .add(
      HttpApiEndpoint.del("deleteUser")`/users/${UserIdParam}`.addSuccess(Schema.Void, {
        status: 204,
      }),
    ),
);

export const UsersApiLive = HttpApiBuilder.api(UsersApi).pipe(
  Layer.provide(
    HttpApiBuilder.group(UsersApi, "users", (handlers) =>
      handlers
        .handle("createUser", ({ payload }) =>
          Effect.orDie(
            Effect.flatMap(Effect.sync(randomUUID), (id) =>
              createUser({ id, email: payload.email }),
            ),
          ),
        )
        .handle("listUsers", () => Effect.orDie(listUsers({})))
        .handle("getUser", ({ path: { id } }) => Effect.orDie(getUser({ id })))
        .handle("updateUser", ({ path: { id }, payload }) =>
          Effect.orDie(updateUser({ id, email: payload.email })),
        )
        .handle("deleteUser", ({ path: { id } }) =>
          Effect.orDie(Effect.asVoid(deleteUser({ id }))),
        ),
    ),
  ),
  Layer.provide(
    PgClient.layer({
      url: Redacted.make(
        process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres",
      ),
    }),
  ),
);
