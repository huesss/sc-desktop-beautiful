import { api, ApiError } from './api';

let chain: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 1100;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function enqueueSearchRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    await sleep(MIN_GAP_MS);
    return fn();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function searchApi<T>(path: string): Promise<T> {
  return enqueueSearchRequest(async () => {
    try {
      return await api<T>(path, {}, undefined, { silent: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        await sleep(2800);
        return await api<T>(path, {}, undefined, { silent: true });
      }
      throw err;
    }
  });
}
