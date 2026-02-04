// frontend/pop_front/js/api.js
export const API_BASE = "http://10.42.92.78:8000";

// helpers DOM
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function buildNextUrl() {
    return encodeURIComponent(location.href);
}

function isLoginPage() {
    return location.pathname.toLowerCase().endsWith("/login.html");
}

export function goLogin(nextUrl = location.href) {
    const next = encodeURIComponent(nextUrl);
    location.href = `./login.html?next=${next}`;
}

export async function apiRequest(method, path, body) {
    const url = `${API_BASE}${path}`;

    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ OBRIGATÓRIO p/ sessão
    };

    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    // 401: se não estiver no login, manda pro login
    if (res.status === 401) {
        if (!isLoginPage()) goLogin(location.href);
        const txt401 = await res.text().catch(() => "");
        throw new Error(txt401 || "Não autenticado.");
    }

    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }

    if (!res.ok) {
        const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

export async function apiPostFile(url, formData) {
    const res = await fetch(API_BASE + url, {
        method: "POST",
        body: formData,
        credentials: "include"
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao enviar arquivo");
    }

    return res.json();
}

export const apiGet = (path) => apiRequest("GET", path);
export const apiPost = (path, body) => apiRequest("POST", path, body ?? {});
export const apiPatch = (path, body) => apiRequest("PATCH", path, body ?? {});
export const apiDelete = (path) => apiRequest("DELETE", path);
