// frontend/pop_front/js/api.js

// Ajuste aqui se sua API estiver em outro host/porta
const API_BASE = "http://localhost:8000";

async function apiRequest(method, path, body) {
    const url = `${API_BASE}${path}`;
    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

        if (!res.ok) {
            console.error("API ERROR", { method, url, status: res.status, text, data });
            throw new Error(`HTTP ${res.status}: ${text || "sem body"}`);
        }

        return data;
    } catch (err) {
        console.error("FETCH FAIL", { method, url, err });
        throw err;
    }
}

export function apiGet(path) { return apiRequest("GET", path); }
export function apiPost(path, body) { return apiRequest("POST", path, body); }
export const API = { API_BASE };
export { API_BASE };
export function qs(sel) { return document.querySelector(sel); }

