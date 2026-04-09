import { asyncLocalStorage } from './requestContext.js';

export const getRequestId = (): string | undefined => {
  return asyncLocalStorage.getStore()?.requestId;
};

export default getRequestId;
