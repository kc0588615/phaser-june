// GET a JSON endpoint once per page load and share the answer between callers.
// A failed request is forgotten, so the next call tries again.
const responses = new Map<string, Promise<unknown>>();

export function getJson<T>(url: string): Promise<T> {
  let pending = responses.get(url);
  if (!pending) {
    pending = fetch(url).then(response => {
      if (!response.ok) throw new Error(`GET ${url} failed (${response.status})`);
      return response.json();
    });
    pending.catch(() => responses.delete(url));
    responses.set(url, pending);
  }
  return pending as Promise<T>;
}
