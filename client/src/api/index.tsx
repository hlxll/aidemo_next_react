type RequestBody = Record<string, unknown>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
async function post(url: string, body: RequestBody, options?:{signal?: AbortSignal}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        signal: options?.signal,
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        console.log(response)
        // 如果含有AbortError类似的错误，是手动停止，不抛出错误，防止调用地方重试
        throw new Error(`Request failed: ${response.status}`);
    }

    return response;
}
async function upload(url: string, body: FormData) {
    const abortController = new AbortController();
    const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        signal: abortController.signal,
        body,
    });
    return response;
}
export const api = { post, upload };