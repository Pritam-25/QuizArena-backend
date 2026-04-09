import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.string().default("3000"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: z.url(),
    SERVICE_NAME: z.string().default("quiz-arena-api"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
