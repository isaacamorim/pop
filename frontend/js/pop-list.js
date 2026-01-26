// frontend/pop_front/js/pop-list.js
import { apiGet, apiPost, qs, API_BASE } from "./api.js";

qs("#apiBase").textContent = API_BASE;

function loadHello() {
  const hello = qs("#hello");
  const btnLogout = qs("#btnLogout");

  const raw = localStorage.getItem("pop_user");
  if (!raw) {
    if (hello) hello.textContent = "Olá";
    if (btnLogout) btnLogout.style.display = "none";
    return null;
  }

  let user = null;
  try { user = JSON.parse(raw); } catch { user = null; }

  const firstName = (user?.nome || user?.usuario || "").split(" ")[0];

  if (hello) hello.textContent = firstName ? `Olá, ${firstName}` : "Olá";
  if (btnLogout) btnLogout.style.display = "inline-flex";

  if (btnLogout) {
    btnLogout.onclick = async () => {
      try {
        await apiPost("/api/auth/logout", {});
      } catch { }
      localStorage.removeItem("pop_user");
      location.href = "./login.html?next=" + encodeURIComponent("./pop-list.html");
    };
  }

  return user;
}

function fmtDate(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); }
  catch { return iso; }
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(v) {
  return (v ?? "").toString().trim();
}

function buildQuery() {
  const status = normalize(qs("#statusFilter")?.value || "ALL");
  const q = normalize(qs("#q")?.value || "");
  const linkType = normalize(qs("#linkType")?.value || "");
  const codMaquina = normalize(qs("#codMaquina")?.value || "");

  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);

  let qq = q;
  if (linkType) qq = `${qq ? qq + " " : ""}${linkType}`.trim();
  if (codMaquina) qq = `${qq ? qq + " " : ""}${codMaquina}`.trim();
  if (qq) params.set("q", qq);

  const qsStr = params.toString();
  return `/api/pops${qsStr ? `?${qsStr}` : ""}`;
}

function render(items) {
  const list = qs("#list");
  list.innerHTML = "";

  if (!items || !items.length) {
    qs("#status").innerHTML = `<div class="alert">Nenhum POP encontrado com os filtros atuais.</div>`;
    return;
  }

  qs("#status").textContent = `${items.length} POP(s) encontrado(s).`;

  for (const p of items) {
    const el = document.createElement("div");
    el.className = "card item";

    const TITLE = p.title ?? p.TITLE ?? "(sem título)";
    const CODE = p.code ?? p.CODE ?? "-";
    const STATUS = (p.status ?? p.STATUS ?? "DRAFT").toUpperCase();

    const LINK_TYPE = p.link_type ?? p.LINK_TYPE ?? "-";
    const COD_MAQUINA = p.cod_maquina ?? p.COD_MAQUINA ?? "-";
    const COD_TAREFA = p.cod_tarefa ?? p.COD_TAREFA ?? "-";
    const NP_CODIGO = p.np_codigo ?? p.NP_CODIGO ?? "-";
    const PRODUCT_CODE = p.product_code ?? p.PRODUCT_CODE ?? "-";

    const TEMPLATE_ID = p.template_id ?? p.TEMPLATE_ID;
    const VERSION_ID = p.version_id ?? p.VERSION_ID ?? "-";
    const VERSION_NUM = p.version_num ?? p.VERSION_NUM ?? "-";
    const CREATED_AT = p.created_at ?? p.CREATED_AT ?? null;

    el.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(TITLE)}</div>

        <div class="small" style="margin-top:6px;">
          <span class="badge">CODE: <b>${escapeHtml(CODE)}</b></span>
          <span class="badge">STATUS: <b>${escapeHtml(STATUS)}</b></span>
        </div>

        <div class="small" style="margin-top:6px;">
          <span class="badge">TEMPLATE_ID: <b>${escapeHtml(TEMPLATE_ID)}</b></span>
          <span class="badge">VERSION_ID: <b>${escapeHtml(VERSION_ID)}</b></span>
          <span class="badge">VERSÃO: <b>${escapeHtml(VERSION_NUM)}</b></span>
        </div>

        <div class="small" style="margin-top:6px;">
          <span class="badge">VÍNCULO: <b>${escapeHtml(LINK_TYPE)}</b></span>
          <span class="badge">MAQ: <b>${escapeHtml(COD_MAQUINA)}</b></span>
          <span class="badge">TAR: <b>${escapeHtml(COD_TAREFA)}</b></span>
          <span class="badge">NP: <b>${escapeHtml(NP_CODIGO)}</b></span>
          <span class="badge">PROD: <b>${escapeHtml(PRODUCT_CODE)}</b></span>
        </div>

        <div class="small" style="margin-top:6px;">
          Criado em: ${escapeHtml(fmtDate(CREATED_AT))}
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" data-view="${escapeHtml(TEMPLATE_ID)}">Ver</button>
      </div>
    `;

    list.appendChild(el);
  }

  list.querySelectorAll("button[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      const templateId = btn.getAttribute("data-view");
      window.location.href = `./pop-view.html?template_id=${encodeURIComponent(templateId)}`;
    });
  });
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

function wireEvents() {
  qs("#btnBuscar")?.addEventListener("click", load);

  qs("#btnLimpar")?.addEventListener("click", () => {
    if (qs("#statusFilter")) qs("#statusFilter").value = "ALL";
    if (qs("#q")) qs("#q").value = "";
    if (qs("#linkType")) qs("#linkType").value = "";
    if (qs("#codMaquina")) qs("#codMaquina").value = "";
    load();
  });
}

function init() {
  loadHello();
  wireEvents();
  load();
}

init();
