// frontend/pop_front/js/login.js
import { apiPost } from "./api.js";

const qs = (s) => document.querySelector(s);

function showMsg(text, type = "error") {
    const el = qs("#msg");
    if (!el) return;

    if (!text) {
        el.style.display = "none";
        el.textContent = "";
        el.classList.remove("ok");
        return;
    }

    el.style.display = "block";
    el.textContent = text;
    el.classList.toggle("ok", type === "ok");
}

function setLoading(isLoading) {
    const btn = qs("#btnLogin");
    if (!btn) return;

    btn.disabled = isLoading;
    btn.classList.toggle("loading", isLoading);

    const t = btn.querySelector(".btn-text");
    if (t) t.textContent = isLoading ? "Entrando..." : "Entrar";
}

function safeNext() {
    const next = new URLSearchParams(location.search).get("next") || "./pop-list.html";

    // URL completa -> pega só o arquivo final
    if (next.startsWith("http://") || next.startsWith("https://")) {
        try {
            const u = new URL(next);
            const parts = u.pathname.split("/");
            const file = parts[parts.length - 1] || "pop-list.html";
            return `./${file}`;
        } catch {
            return "./pop-list.html";
        }
    }

    // caminho absoluto (/frontend/...) -> pega só o arquivo final
    if (next.startsWith("/")) {
        const parts = next.split("/");
        const file = parts[parts.length - 1] || "pop-list.html";
        return `./${file}`;
    }

    return next;
}

async function doLogin() {
    const username = (qs("#username")?.value || "").trim();
    const password = qs("#password")?.value || "";

    showMsg("");
    if (!username || !password) {
        showMsg("Informe usuário e senha.");
        return;
    }

    setLoading(true);

    try {
        const res = await apiPost("/api/auth/login", { username, password });

        // guarda só o necessário pra UI
        localStorage.setItem("pop_user", JSON.stringify(res.user));

        showMsg(`Bem-vindo, ${res.user?.nome || res.user?.usuario || username}!`, "ok");

        // redireciona UMA vez
        const go = safeNext();
        window.location.assign(go);
    } catch (e) {
        console.error("[login] erro", e);
        showMsg(e.message || "Falha no login.");
    } finally {
        setLoading(false);
    }
}

qs("#btnLogin")?.addEventListener("click", doLogin);

["#username", "#password"].forEach((id) => {
    qs(id)?.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") doLogin();
    });
});

qs("#username")?.focus();
