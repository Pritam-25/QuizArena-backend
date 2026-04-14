export const customInstance = async <T>(
  config: RequestInit & { url: string }
): Promise<T> => {
  const response = await fetch(config.url, {
    ...config,
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers ?? {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw errorPayload ?? new Error(response.statusText);
  }

  return (await response.json()) as T;
};
