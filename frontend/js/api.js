// frontend/pop_front/js/api.js
export const API_BASE = "http://localhost:8000";

// helpers DOM
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function buildNextUrl() {
    return encodeURIComponent(location.href);
}

function isLoginPage() {
    // cobre /login.html e também qualquer variação com querystring
    return location.pathname.toLowerCase().endsWith("/login.html");
}

export async function apiRequest(method, path, body) {
    const url = `${API_BASE}${path}`;

    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    };

    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    // 401: se não estiver no login, manda pro login com ?next=
    if (res.status === 401) {
        if (!isLoginPage()) {
            location.href = `./login.html?next=${buildNextUrl()}`;
        }
        throw new Error("Não autenticado.");
    }

    const txt = await res.text();
    let data = null;
    try {
        data = txt ? JSON.parse(txt) : null;
    } catch {
        data = txt;
    }

    if (!res.ok) {
        const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

export const apiGet = (path) => apiRequest("GET", path);
export const apiPost = (path, body) => apiRequest("POST", path, body ?? {});
export const apiPatch = (path, body) => apiRequest("PATCH", path, body ?? {});
export const apiDelete = (path) => apiRequest("DELETE", path);
