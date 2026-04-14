export type ErrorContract = {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
};
