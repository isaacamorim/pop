// frontend/pop_front/pop-list.html

import { apiGet, apiPost, qs } from "./api.js";
qs("#apiBase").textContent = API_BASE;

function fmtDate(iso) {
    if (!iso) return "-";
    try { return new Date(iso).toLocaleString(); }
    catch { return iso; }
}

function normalize(v) {
    return (v ?? "").toString().trim();
}

function buildQuery() {
    const linkType = normalize(qs("#linkType").value);
    const codMaquina = normalize(qs("#codMaquina").value);

    const params = new URLSearchParams();
    if (linkType) params.set("link_type", linkType);
    if (codMaquina) params.set("cod_maquina", codMaquina);

    const qsStr = params.toString();
    return `/api/services${qsStr ? `?${qsStr}` : ""}`;
}

function render(items) {
    const list = qs("#list");
    list.innerHTML = "";

    if (!items.length) {
        qs("#status").innerHTML = `<div class="alert">Nenhum POP encontrado com os filtros atuais.</div>`;
        return;
    }

    qs("#status").textContent = `${items.length} POP(s) encontrado(s).`;

    for (const v of items) {
        const el = document.createElement("div");
        el.className = "card item";

        const title = v.TEMPLATE_TITLE || v.SUMMARY || "(sem título)";
        const codMaq = v.COD_MAQUINA || "-";
        const codTar = v.COD_TAREFA || "-";

        el.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(title)}</div>
        <div class="small">
          <span class="badge">VERSION_ID: <b>${v.ID}</b></span>
          <span class="badge">VERSÃO: <b>${v.VERSION_NUM}</b></span>
        </div>
        <div class="small">
          <span class="badge">COD_MAQUINA: <b>${escapeHtml(codMaq)}</b></span>
          <span class="badge">COD_TAREFA: <b>${escapeHtml(codTar)}</b></span>
        </div>
        <div class="small">Criado em: ${escapeHtml(fmtDate(v.CREATED_AT))}</div>
      </div>

      <div class="actions">
        <button class="btn primary" data-view="${v.ID}">Ver</button>
      </div>
    `;

        list.appendChild(el);
    }

    list.querySelectorAll("button[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-view");
            window.location.href = `./pop-view.html?id=${encodeURIComponent(id)}`;
        });
    });
}

function escapeHtml(s) {
    return (s ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function load() {
    qs("#status").textContent = "Buscando POPs...";
    const path = buildQuery();
    try {
        const items = await apiGet(path);
        render(items);
    } catch (err) {
        qs("#status").innerHTML = `<div class="alert">Erro ao buscar: ${escapeHtml(err.message)}</div>`;
    }
}

qs("#btnBuscar").addEventListener("click", load);
qs("#btnLimpar").addEventListener("click", () => {
    qs("#linkType").value = "";
    qs("#codMaquina").value = "";
    load();
});

load();
