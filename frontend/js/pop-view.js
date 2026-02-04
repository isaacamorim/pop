// frontend/pop_front/js/pop-view.js
import { apiGet, apiPost } from "./api.js";

const qs = (sel, root = document) => root.querySelector(sel);

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

function renderFooterActions({ STATUS, TEMPLATE_ID, VERSION_ID }) {

    const footer = document.querySelector(".footer-bar");
    if (!footer) return;

    let actions = `
        <button id="btnBackFooter" class="btn">← Voltar</button>
    `;

    // ======================
    // DRAFT
    // ======================
    if (STATUS === "DRAFT" && VERSION_ID) {

        actions += `
            <button id="btnEditDraft" class="btn primary">
                ✏️ Continuar edição
            </button>

            <button id="btnPublish" class="btn success">
                🚀 Publicar
            </button>
        `;
    }

    // ======================
    // PUBLISHED
    // ======================
    if (STATUS === "PUBLISHED") {

        actions += `
            <button id="btnNewVersion" class="btn primary">
                ✏️ Criar nova versão
            </button>
        `;
    }

    footer.innerHTML = actions;

    // voltar
    qs("#btnBackFooter")?.addEventListener("click", () => {
        history.length > 1 ? history.back() : (location.href = "./pop-list.html");
    });

    // editar draft
    qs("#btnEditDraft")?.addEventListener("click", () => {
        location.href =
            `./pop-create.html?edit=1&template_id=${encodeURIComponent(TEMPLATE_ID)}&version_id=${encodeURIComponent(VERSION_ID)}`;
    });

    // publicar direto
    qs("#btnPublish")?.addEventListener("click", async () => {

        if (!confirm("Deseja publicar este POP agora?")) return;

        try {
            await apiPost(`/api/pops/${TEMPLATE_ID}/publish`);

            alert("POP publicado com sucesso!");

            location.reload();

        } catch (e) {
            alert("Erro ao publicar: " + e.message);
        }
    });

    // nova versão
    qs("#btnNewVersion")?.addEventListener("click", () => {
        location.href =
            `./pop-create.html?clone=1&template_id=${encodeURIComponent(TEMPLATE_ID)}&version_id=${encodeURIComponent(VERSION_ID)}`;
    });
}

function render(pop) {
    // normaliza campos (aceita maiúsculo e minúsculo)
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

    // Header forte com subtitle humanizado
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

    // Resumo discreto (versão/status)
    let statusHtml = `
        <div class="pop-status">
            <div class="badge">Versão ${escapeHtml(VERSION_NUM)}</div>
            <div class="badge">Status: ${escapeHtml(STATUS)}</div>
        </div>
    `;

    if (STATUS === "DRAFT") {
        statusHtml += `
        <div class="alert" style="margin-top:10px;">
            ⚠️ <b>Rascunho em edição</b><br>
            Este POP ainda não foi publicado e não está disponível para uso operacional.
        </div>
    `;
    }

    if (DESCRIPTION) {
        statusHtml += `
        <div style="margin-top:10px; font-size:0.9rem;">
            ${escapeHtml(DESCRIPTION)}
        </div>
    `;
    }

    qs("#status").innerHTML = statusHtml;

    // Vínculo em 1 linha clara
    const linkSummary = renderLinkSummary(LINK_TYPE, COD_MAQUINA, COD_TAREFA, NP_CODIGO, SEQ_COD, PRODUCT_CODE);
    qs("#link").innerHTML = `
        <div class="badge primary">${escapeHtml(linkSummary)}</div>
        ${NOTES ? `<div style="margin-top:10px; font-size:0.9rem;"><b>Obs:</b> ${escapeHtml(NOTES)}</div>` : ""}
    `;

    // Passos com hierarquia visual
    const stepsEl = qs("#steps");
    stepsEl.innerHTML = "";

    if (!STEPS.length) {
        stepsEl.innerHTML = `<div class="alert">Nenhum passo cadastrado.</div>`;
        return;
    }

    STEPS.forEach((s, idx) => {
        const title = pick(s, "TITLE", "title") || `Passo ${idx + 1}`;
        const ins = pick(s, "INSTRUCTION", "instruction");
        const photo = !!pick(s, "REQUIRES_PHOTO", "requires_photo");
        const hasTime = !!pick(s, "HAS_TIME", "has_time");
        const time = pick(s, "STEP_TIME", "step_time");
        const img = pick(
            s,
            "IMAGE",
            "image",
            "IMAGE_URL",
            "image_url"
        );

        const div = document.createElement("div");
        div.className = "step";

        div.innerHTML = `
            <div class="step-header">
                <div class="step-num">${idx + 1}</div>
                <div class="step-title">${escapeHtml(title)}</div>
            </div>

            <div class="step-body">
                ${ins
                                ? `<div class="step-text">${escapeHtml(ins)}</div>`
                                : `<div class="step-text muted">Sem instruções detalhadas.</div>`
                }
                ${ins ? `<div class="step-text">${escapeHtml(ins)}</div>` : ""}

                ${img ? `
                    <div class="step-img-box">
                        <img 
                            src="${escapeHtml(img)}" 
                            class="step-img" 
                            alt="Imagem do passo ${idx + 1}" 
                        />

                        <div class="step-img-caption">
                            Figura ${idx + 1} — Registro visual do procedimento
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

    renderFooterActions({
        STATUS,
        TEMPLATE_ID,
        VERSION_ID
    });

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
        qs("#status").innerHTML = `<div class="alert">Faltou template_id na URL.</div>`;
        return;
    }

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
    } catch (e) {
        console.error(e);
        qs("#status").innerHTML = `<div class="alert">Erro: ${escapeHtml(e.message || e)}</div>`;
    }

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

// Zoom simples na imagem
document.addEventListener("click", (e) => {

    const img = e.target.closest(".step-img");

    if (!img) return;

    const overlay = document.createElement("div");

    overlay.style = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: zoom-out;
    `;

    const bigImg = document.createElement("img");

    bigImg.src = img.src;

    bigImg.style = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    `;

    overlay.appendChild(bigImg);

    overlay.onclick = () => overlay.remove();

    document.body.appendChild(overlay);
});


init();