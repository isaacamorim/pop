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
    // Se tiver next, usa. Senão vai pra lista.
    const next = new URLSearchParams(location.search).get("next") || "./pop-list.html";

    // segurança: se vier URL completa (http...), converte pro path/arquivo do front
    if (next.startsWith("http://") || next.startsWith("https://")) {
        try {
            const u = new URL(next);
            // se o next for algo como http://127.0.0.1:5500/frontend/pop_front/pop-list.html
            // pega só o final
            const parts = u.pathname.split("/");
            const file = parts[parts.length - 1] || "pop-list.html";
            return `./${file}`;
        } catch {
            return "./pop-list.html";
        }
    }

    return next;
}

async function doLogin() {
    const username = (qs("#username")?.value || "").trim();
    const password = qs("#password")?.value || "";

    console.log("[login] click", { username });

    showMsg("");
    if (!username || !password) {
        showMsg("Informe usuário e senha.");
        return;
    }

    setLoading(true);

    try {
        const res = await apiPost("/api/auth/login", { username, password });
        console.log("[login] resposta", res);

        showMsg(`Bem-vindo, ${res.user?.nome || res.user?.usuario || username}!`, "ok");

        const go = safeNext();
        console.log("[login] redirect =>", go);

        // redireciona
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
