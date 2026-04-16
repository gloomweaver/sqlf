import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";
import { UsersApiLive } from "./httpApi.ts";

const port = Number(process.env.PORT ?? 3000);

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(UsersApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port })),
);

Layer.launch(ServerLive).pipe(Effect.orDie, NodeRuntime.runMain);
