import pino from "pino";
import { env } from "./env.js";

const isProd = env.NODE_ENV === "production";

const logger = pino({
  level: isProd ? "info" : "debug",
  base: {
    service: env.SERVICE_NAME || "quiz-arena-api",
  },
  timestamp: pino.stdTimeFunctions.isoTime,

  // Only add transport in dev
  ...(!isProd && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});

export default logger;
