type RequestBody = Record<string, unknown>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
console.log(API_BASE_URL)
async function post(url: string, body: RequestBody) {
    const abortController = new AbortController();
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    signal: abortController.signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response;
}
export const api = { post };
export default api;