import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { asyncLocalStorage } from "@shared/utils/context/requestContext.js";

const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.headers["x-request-id"];
  const normalizedIncoming = Array.isArray(incoming)
    ? (incoming[0] ?? "")
    : incoming !== undefined
      ? String(incoming)
      : "";
  const trimmedIncoming = normalizedIncoming.trim();
  const requestId = trimmedIncoming || randomUUID();

  asyncLocalStorage.run({ requestId }, () => {
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });
};

export default requestIdMiddleware;
