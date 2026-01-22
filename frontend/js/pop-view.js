// frontend/pop_front/js/pop-view.js

import { apiGet, qs } from "./api.js";

function getId() {
    const url = new URL(window.location.href);
    return url.searchParams.get("id");
}

function escapeHtml(s) {
    return (s ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function kvRow(k, v) {
    const div = document.createElement("div");
    div.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v ?? "-")}</div>`;
    return div;
}

function render(data) {
    qs("#headerStatus").textContent = `Versão ${data.VERSION_NUM} (ID ${data.ID})`;

    const kv = qs("#kv");
    kv.innerHTML = "";
    kv.appendChild(kvRow("TEMPLATE_ID", data.TEMPLATE_ID));
    kv.appendChild(kvRow("COD_MAQUINA", data.COD_MAQUINA));
    kv.appendChild(kvRow("COD_TAREFA", data.COD_TAREFA));
    kv.appendChild(kvRow("ATIVO", data.ACTIVE ? "SIM" : "NÃO"));
    kv.appendChild(kvRow("CRIADO EM", data.CREATED_AT));

    // content
    const content = (data.CONTENT ?? "").trim();
    qs("#content").innerHTML = content ? `<pre style="white-space:pre-wrap; margin:0;">${escapeHtml(content)}</pre>` : `<div class="muted">Sem conteúdo.</div>`;

    // steps
    const stepsEl = qs("#steps");
    stepsEl.innerHTML = "";
    if (data.STEPS?.length) {
        for (const s of data.STEPS) {
            const step = document.createElement("div");
            step.className = "step";
            step.innerHTML = `
        <div class="head">
          <div><span class="num">#${s.SEQ}</span> ${escapeHtml(s.TITLE || "")}</div>
          <div class="req">
            ${s.REQ_PHOTO ? `<span class="pill">📷 Foto</span>` : ``}
            ${s.REQ_SIGN ? `<span class="pill">✍️ Assinatura</span>` : ``}
          </div>
        </div>
        <div class="muted" style="margin-top:8px;">${escapeHtml(s.INSTRUCTION || "")}</div>
      `;
            stepsEl.appendChild(step);
        }
    } else {
        stepsEl.innerHTML = `<div class="muted">Sem checklist.</div>`;
    }

    // attachments
    const attachEl = qs("#attach");
    attachEl.innerHTML = "";
    if (data.ATTACHMENTS?.length) {
        for (const a of data.ATTACHMENTS) {
            const path = a.STORAGE_PATH || "";
            const name = a.FILENAME || path || "Anexo";
            const link = document.createElement("a");
            link.href = path || "#";
            link.textContent = name;
            link.target = "_blank";
            attachEl.appendChild(link);
        }
    } else {
        attachEl.innerHTML = `<div class="muted">Sem anexos.</div>`;
    }
}

async function load() {
    const id = getId();
    if (!id) {
        qs("#headerStatus").innerHTML = `<div class="alert">Faltou o parâmetro <b>?id=</b> na URL.</div>`;
        return;
    }

    try {
        const data = await apiGet(`/api/services/${encodeURIComponent(id)}`);
        render(data);
    } catch (err) {
        qs("#headerStatus").innerHTML = `<div class="alert">Erro ao carregar: ${escapeHtml(err.message)}</div>`;
    }
}

load();
