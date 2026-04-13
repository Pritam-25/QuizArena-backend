type ExtractTokenInput = {
  cookieToken: string | undefined;
  authHeader: string | undefined;
};

/**
 * Extracts auth token with cookie-first priority and Bearer fallback.
 *
 * @param params - Possible token carriers for current transport layer.
 * @returns Best-effort auth token if present.
 */
export const extractToken = ({
  cookieToken,
  authHeader,
}: ExtractTokenInput) => {
  const tokenFromHeader =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  return cookieToken ?? tokenFromHeader;
};
