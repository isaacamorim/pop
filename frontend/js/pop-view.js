// frontend/pop_front/js/pop-view.js
import { apiGet, apiPost } from "./api.js";

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => root.querySelectorAll(sel);

function escapeHtml(s) {
    return (s ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function pick(obj, ...keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

function renderLinkSummary(LINK_TYPE, COD_MAQUINA, COD_TAREFA, NP_CODIGO, SEQ_COD, PRODUCT_CODE) {
    if (LINK_TYPE === "MAQUINA") return `Máquina ${COD_MAQUINA}`;
    if (LINK_TYPE === "TAREFA") return `Tarefa ${COD_TAREFA}`;
    if (LINK_TYPE === "NP") return `NP ${NP_CODIGO}`;
    if (LINK_TYPE === "PECA") return `Produto ${PRODUCT_CODE}`;
    if (LINK_TYPE === "PECA_OP") {
        const parts = [`Produto ${PRODUCT_CODE}`];
        if (NP_CODIGO && NP_CODIGO !== "-") parts.push(`NP ${NP_CODIGO}`);
        if (SEQ_COD && SEQ_COD !== "-") parts.push(`Seq ${SEQ_COD}`);
        return parts.join(" • ");
    }
    return "Procedimento geral";
}

function showToast(message, type = "info") {
    // Remove toast anterior se existir
    const existingToast = qs(".toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#3b82f6"};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adiciona animações CSS
if (!document.getElementById("toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

function renderFooterActions({ STATUS, TEMPLATE_ID, VERSION_ID }) {
    const footer = document.querySelector(".footer-bar");
    if (!footer) return;

    let actions = `
        <button id="btnBackFooter" class="btn">
            <span>←</span> Voltar
        </button>
    `;

    // DRAFT
    if (STATUS === "DRAFT" && VERSION_ID) {
        actions += `
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btnEditDraft" class="btn primary">
                    <span>✏️</span> Continuar edição
                </button>
                <button id="btnPublish" class="btn success">
                    <span>🚀</span> Publicar
                </button>
            </div>
        `;
    }

    // PUBLISHED
    if (STATUS === "PUBLISHED") {
        actions += `
            <button id="btnNewVersion" class="btn primary">
                <span>✏️</span> Criar nova versão
            </button>
        `;
    }

    footer.innerHTML = actions;

    // Event listeners
    qs("#btnBackFooter")?.addEventListener("click", () => {
        history.length > 1 ? history.back() : (location.href = "./pop-list.html");
    });

    qs("#btnEditDraft")?.addEventListener("click", () => {
        location.href =
            `./pop-create.html?edit=1&template_id=${encodeURIComponent(TEMPLATE_ID)}&version_id=${encodeURIComponent(VERSION_ID)}`;
    });

    qs("#btnPublish")?.addEventListener("click", async () => {
        if (!confirm("Deseja publicar este POP agora?\n\nEle ficará disponível para uso operacional.")) return;

        const btn = qs("#btnPublish");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="loading">⏳</span> Publicando...`;

        try {
            await apiPost(`/api/pops/${TEMPLATE_ID}/publish`);
            showToast("POP publicado com sucesso!", "success");
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            showToast("Erro ao publicar: " + e.message, "error");
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    qs("#btnNewVersion")?.addEventListener("click", () => {
        location.href =
            `./pop-create.html?clone=1&template_id=${encodeURIComponent(TEMPLATE_ID)}&version_id=${encodeURIComponent(VERSION_ID)}`;
    });
}

function render(pop) {
    // Normaliza campos
    const TITLE = pick(pop, "TITLE", "title") || "POP";
    const CODE = pick(pop, "CODE", "code") || "-";
    const STATUS = (pick(pop, "STATUS", "status") || "DRAFT").toUpperCase();

    const TEMPLATE_ID = pick(pop, "TEMPLATE_ID", "template_id") || "-";
    const VERSION_ID = pick(pop, "VERSION_ID", "version_id") || "-";
    const VERSION_NUM = pick(pop, "VERSION_NUM", "version_num") || "-";
    const DESCRIPTION = pick(pop, "DESCRIPTION", "description") || "";

    const LINK_TYPE = pick(pop, "LINK_TYPE", "link_type") || "-";
    const COD_MAQUINA = pick(pop, "COD_MAQUINA", "cod_maquina") || "-";
    const COD_TAREFA = pick(pop, "COD_TAREFA", "cod_tarefa") || "-";
    const NP_CODIGO = pick(pop, "NP_CODIGO", "np_codigo") || "-";
    const SEQ_COD = pick(pop, "SEQ_COD", "seq_cod") || "-";
    const PRODUCT_CODE = pick(pop, "PRODUCT_CODE", "product_code") || "-";
    const NOTES = pick(pop, "NOTES", "notes");

    const STEPS = pick(pop, "STEPS", "steps") || [];

    // Header
    qs("#title").textContent = TITLE;

    const linkLabelMap = {
        MAQUINA: "Máquina",
        TAREFA: "Tarefa",
        NP: "NP",
        PECA: "Produto",
        PECA_OP: "Produto + Operação",
        SERVICO: "Serviço"
    };

    qs("#subtitle").textContent =
        `${CODE} • ${linkLabelMap[LINK_TYPE] || LINK_TYPE} • versão ${VERSION_NUM}`;

    // Status
    let statusHtml = `
        <div class="pop-status">
            <div class="badge">Versão ${escapeHtml(VERSION_NUM)}</div>
            <div class="badge" style="background: ${STATUS === "PUBLISHED" ? "rgba(22, 163, 74, 0.12)" : "rgba(245, 158, 11, 0.12)"}; 
                color: ${STATUS === "PUBLISHED" ? "#15803d" : "#92400e"}; 
                border-color: ${STATUS === "PUBLISHED" ? "rgba(22, 163, 74, 0.2)" : "rgba(245, 158, 11, 0.2)"};">
                ${STATUS === "PUBLISHED" ? "✓" : "⚠️"} ${STATUS === "PUBLISHED" ? "Publicado" : "Rascunho"}
            </div>
        </div>
    `;

    if (STATUS === "DRAFT") {
        statusHtml += `
        <div class="alert" style="margin-top: 14px;">
            ⚠️ <b>Rascunho em edição</b><br>
            Este POP ainda não foi publicado e não está disponível para uso operacional.
        </div>
        `;
    }

    if (DESCRIPTION) {
        statusHtml += `
        <div style="margin-top: 14px; font-size: 0.95rem; line-height: 1.6; color: var(--text);">
            ${escapeHtml(DESCRIPTION)}
        </div>
        `;
    }

    qs("#status").innerHTML = statusHtml;

    // Vínculo
    const linkSummary = renderLinkSummary(LINK_TYPE, COD_MAQUINA, COD_TAREFA, NP_CODIGO, SEQ_COD, PRODUCT_CODE);
    qs("#link").innerHTML = `
        <div class="badge primary">
            🔗 ${escapeHtml(linkSummary)}
        </div>
        ${NOTES ? `
            <div style="margin-top: 10px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 0.9rem; line-height: 1.5;">
                <b style="color: var(--primary-color);">💡 Observações:</b><br>
                ${escapeHtml(NOTES)}
            </div>
        ` : ""}
    `;

    // Passos
    const stepsEl = qs("#steps");
    stepsEl.innerHTML = "";

    if (!STEPS.length) {
        stepsEl.innerHTML = `
            <div class="alert">
                ℹ️ Nenhum passo cadastrado neste POP.
            </div>
        `;
        renderFooterActions({ STATUS, TEMPLATE_ID, VERSION_ID });
        return;
    }

    STEPS.forEach((s, idx) => {
        const title = pick(s, "TITLE", "title") || `Passo ${idx + 1}`;
        const ins = pick(s, "INSTRUCTION", "instruction");
        const photo = !!pick(s, "REQUIRES_PHOTO", "requires_photo");
        const hasTime = !!pick(s, "HAS_TIME", "has_time");
        const time = pick(s, "STEP_TIME", "step_time");
        const img = pick(s, "IMAGE", "image", "IMAGE_URL", "image_url");

        const div = document.createElement("div");
        div.className = "step";
        div.dataset.stepIndex = idx;

        div.innerHTML = `
            <div class="step-header">
                <div class="step-num">${idx + 1}</div>
                <div class="step-title">${escapeHtml(title)}</div>
            </div>

            <div class="step-body">
                ${ins ? `
                    <div class="step-text">${escapeHtml(ins)}</div>
                ` : `
                    <div class="step-text muted">
                        💭 Sem instruções detalhadas
                    </div>
                `}

                ${img ? `
                    <div class="step-img-box">
                        <img 
                            src="${escapeHtml(img)}" 
                            class="step-img" 
                            alt="Imagem do passo ${idx + 1}"
                            loading="lazy"
                        />
                        <div class="step-img-caption">
                            📷 Figura ${idx + 1} – Registro visual do procedimento
                        </div>
                    </div>
                ` : ""}

                ${photo || hasTime ? `
                    <div class="step-flags">
                        ${photo ? `<span class="flag">📷 Foto obrigatória</span>` : ""}
                        ${hasTime ? `<span class="flag">⏱ Tempo: ${escapeHtml(time || "-")} min</span>` : ""}
                    </div>
                ` : ""}
            </div>
        `;

        stepsEl.appendChild(div);
    });

    renderFooterActions({ STATUS, TEMPLATE_ID, VERSION_ID });

    // Adiciona contador de passos
    const sectionTitle = qs(".section-title");
    if (sectionTitle) {
        sectionTitle.innerHTML = `Passos <span style="color: var(--muted); font-weight: 500; font-size: 0.9rem;">(${STEPS.length} ${STEPS.length === 1 ? 'passo' : 'passos'})</span>`;
    }
}

async function init() {
    const templateId = getParam("template_id");
    const versionId = getParam("version_id");
    const validVersion =
        versionId &&
        versionId !== "null" &&
        versionId !== "undefined" &&
        /^\d+$/.test(versionId);

    if (!templateId) {
        qs("#status").innerHTML = `
            <div class="alert">
                ⚠️ <b>Erro</b><br>
                Faltou o parâmetro <code>template_id</code> na URL.
            </div>
        `;
        return;
    }

    // Loading state
    qs("#status").innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--muted);">
            <div class="loading" style="font-size: 1.2rem;">⏳</div>
            <div style="margin-top: 8px;">Carregando POP...</div>
        </div>
    `;

    try {
        let pop;

        if (validVersion) {
            pop = await apiGet(
                `/api/pops/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`
            );
        } else {
            pop = await apiGet(`/api/pops/${encodeURIComponent(templateId)}`);
        }

        console.log("POP RAW =>", pop);

        const dbg = qs("#debug");
        const DEBUG = false;

        if (dbg) {
            dbg.style.display = DEBUG ? "" : "none";
            dbg.textContent = DEBUG ? JSON.stringify(pop, null, 2) : "";
        }

        render(pop);

        // Smooth scroll para passos quando clicar em âncoras
        document.querySelectorAll('a[href^="#step-"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.animation = 'none';
                    setTimeout(() => target.style.animation = '', 10);
                }
            });
        });

    } catch (e) {
        console.error(e);
        qs("#status").innerHTML = `
            <div class="alert">
                ❌ <b>Erro ao carregar POP</b><br>
                ${escapeHtml(e.message || e)}
            </div>
        `;
    }

    // Botão voltar no topo
    const btnBack = document.getElementById("btnBack");
    if (btnBack) {
        btnBack.addEventListener("click", () => {
            if (document.referrer && document.referrer.includes("pop-")) {
                history.back();
            } else {
                window.location.href = "./pop-list.html";
            }
        });
    }
}

// Zoom melhorado na imagem com modal
document.addEventListener("click", (e) => {
    const img = e.target.closest(".step-img");
    if (!img) return;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: zoom-out;
        animation: fadeIn 0.2s ease;
        padding: 20px;
    `;

    const bigImg = document.createElement("img");
    bigImg.src = img.src;
    bigImg.style.cssText = `
        max-width: 95%;
        max-height: 85vh;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        animation: zoomIn 0.3s ease;
    `;

    const caption = document.createElement("div");
    caption.textContent = img.alt || "Imagem do passo";
    caption.style.cssText = `
        color: white;
        margin-top: 16px;
        font-size: 0.95rem;
        text-align: center;
        opacity: 0.9;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕ Fechar";
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
    `;

    closeBtn.onmouseover = () => {
        closeBtn.style.background = "rgba(255,255,255,0.3)";
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.background = "rgba(255,255,255,0.2)";
    };

    overlay.appendChild(bigImg);
    overlay.appendChild(caption);
    overlay.appendChild(closeBtn);

    overlay.onclick = (e) => {
        if (e.target === overlay || e.target === closeBtn) {
            overlay.style.animation = "fadeOut 0.2s ease";
            setTimeout(() => overlay.remove(), 200);
        }
    };

    closeBtn.onclick = (e) => {
        e.stopPropagation();
        overlay.style.animation = "fadeOut 0.2s ease";
        setTimeout(() => overlay.remove(), 200);
    };

    document.body.appendChild(overlay);

    // Previne scroll quando modal está aberto
    document.body.style.overflow = "hidden";
    overlay.addEventListener("remove", () => {
        document.body.style.overflow = "";
    });
});

// Adiciona animações para o modal
if (!document.getElementById("modal-animations")) {
    const style = document.createElement("style");
    style.id = "modal-animations";
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes zoomIn {
            from { 
                opacity: 0;
                transform: scale(0.8);
            }
            to { 
                opacity: 1;
                transform: scale(1);
            }
        }
    `;
    document.head.appendChild(style);
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    // ESC para voltar
    if (e.key === "Escape") {
        const modal = document.querySelector('[style*="z-index: 9999"]');
        if (modal) {
            modal.click();
        }
    }
});

// Scroll to top button
window.addEventListener("scroll", () => {
    let scrollBtn = qs("#scrollToTop");

    if (window.scrollY > 300) {
        if (!scrollBtn) {
            scrollBtn = document.createElement("button");
            scrollBtn.id = "scrollToTop";
            scrollBtn.innerHTML = "↑";
            scrollBtn.style.cssText = `
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--primary-color);
                color: white;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(213, 32, 41, 0.3);
                z-index: 40;
                transition: all 0.3s ease;
                opacity: 0;
                animation: fadeIn 0.3s ease forwards;
            `;
            scrollBtn.onmouseover = () => {
                scrollBtn.style.transform = "translateY(-2px)";
                scrollBtn.style.boxShadow = "0 6px 16px rgba(213, 32, 41, 0.4)";
            };
            scrollBtn.onmouseout = () => {
                scrollBtn.style.transform = "translateY(0)";
                scrollBtn.style.boxShadow = "0 4px 12px rgba(213, 32, 41, 0.3)";
            };
            scrollBtn.onclick = () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            };
            document.body.appendChild(scrollBtn);
        }
    } else if (scrollBtn) {
        scrollBtn.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => scrollBtn?.remove(), 300);
    }
});

init();