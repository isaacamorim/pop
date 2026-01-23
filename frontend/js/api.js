// frontend/pop_front/js/api.js

// Ajuste aqui se sua API estiver em outro host/porta
export const API_BASE = "http://localhost:8000";

export async function apiRequest(method, path, body) {
    const url = `${API_BASE}${path}`;
    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }

    if (!res.ok) {
        const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

export const apiGet = (path) => apiRequest("GET", path);
export const apiPost = (path, body) => apiRequest("POST", path, body);
export const apiPatch = (path, body) => apiRequest("PATCH", path, body);
