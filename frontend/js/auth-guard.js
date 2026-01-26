// frontend/pop_front/js/auth-guard.js
import { apiGet, goLogin } from "./api.js";

export async function requireAuth() {
    try {
        const r = await apiGet("/api/auth/me");

        console.log("[auth-guard] Resposta do /me:", r);

        if (!r || !r.user) {
            console.warn("[auth-guard] Sem usuário, redirecionando...");
            goLogin(location.href);

            // Para tudo e espera o redirect
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log("[auth-guard] ✅ Autenticado:", r.user.email);
        return r.user;

    } catch (e) {
        console.error("[auth-guard] Erro:", e);
        goLogin(location.href);

        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}