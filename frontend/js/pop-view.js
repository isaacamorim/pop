// frontend/pop_front/js/pop-view.js
import { apiGet } from "./api.js";

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

    qs("#title").textContent = pop.title || "POP";
    qs("#subtitle").textContent = `${pop.code || "-"} • STATUS: ${(pop.status || "DRAFT").toUpperCase()}`;

    const steps = pop.steps || [];
    
    qs("#status").innerHTML = `
        <div class="badge">TEMPLATE_ID: <b>${escapeHtml(TEMPLATE_ID)}</b></div>
        <div class="badge">VERSION_ID: <b>${escapeHtml(VERSION_ID)}</b></div>
        <div class="badge">VERSÃO: <b>${escapeHtml(VERSION_NUM)}</b></div>
        ${DESCRIPTION ? `<div style="margin-top:10px;">${escapeHtml(DESCRIPTION)}</div>` : ""}
        `;


    qs("#link").innerHTML = `
    <div class="row cols-3">
        <div class="badge">LINK_TYPE: <b>${escapeHtml(LINK_TYPE)}</b></div>
        <div class="badge">MAQUINA: <b>${escapeHtml(COD_MAQUINA)}</b></div>
        <div class="badge">TAREFA: <b>${escapeHtml(COD_TAREFA)}</b></div>
        <div class="badge">NP: <b>${escapeHtml(NP_CODIGO)}</b></div>
        <div class="badge">SEQ: <b>${escapeHtml(SEQ_COD)}</b></div>
        <div class="badge">PROD: <b>${escapeHtml(PRODUCT_CODE)}</b></div>
    </div>
    ${NOTES ? `<div style="margin-top:10px;"><b>Obs:</b> ${escapeHtml(NOTES)}</div>` : ""}
    `;

    const stepsEl = qs("#steps");
    stepsEl.innerHTML = "";

    if (!STEPS.length) {
        stepsEl.innerHTML = `<div class="alert">Nenhum passo cadastrado.</div>`;
        return;
    }

    for (const s of STEPS) {
        const SEQ = pick(s, "SEQ", "seq") || "";
        const ST = pick(s, "TITLE", "title") || "(sem título)";
        const INS = pick(s, "INSTRUCTION", "instruction") || "";
        const PHOTO = !!pick(s, "REQUIRES_PHOTO", "requires_photo");
        const SIGN = !!pick(s, "REQUIRES_SIGNATURE", "requires_signature");

        const div = document.createElement("div");
        div.className = "card item";
        div.innerHTML = `
      <div class="title">${escapeHtml(SEQ)}. ${escapeHtml(ST)}</div>
      <div class="small" style="margin-top:6px;">${escapeHtml(INS)}</div>
      <div class="small" style="margin-top:8px;">
        <span class="badge">Foto: <b>${PHOTO ? "SIM" : "NÃO"}</b></span>
        <span class="badge">Assinatura: <b>${SIGN ? "SIM" : "NÃO"}</b></span>
      </div>
    `;
        stepsEl.appendChild(div);
    }
}

async function init() {
    const templateId = getParam("template_id");
    if (!templateId) {
        qs("#status").innerHTML = `<div class="alert">Faltou template_id na URL.</div>`;
        return;
    }

    try {
        const pop = await apiGet(`/api/pops/${encodeURIComponent(templateId)}`);

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
}

init();
