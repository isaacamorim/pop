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

  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);

  let qq = q;
  if (q) params.set("q", q);
  if (linkType) params.set("link_type", linkType);

  const qsStr = params.toString();
  return `/api/pops${qsStr ? `?${qsStr}` : ""}`;
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

function getLinkHighlight(LINK_TYPE, COD_MAQUINA, COD_TAREFA, NP_CODIGO, PRODUCT_CODE) {
  if (LINK_TYPE === "MAQUINA") {
    return { label: "MÁQUINA", code: COD_MAQUINA };
  }
  if (LINK_TYPE === "TAREFA") {
    return { label: "TAREFA", code: COD_TAREFA };
  }
  if (LINK_TYPE === "NP") {
    return { label: "NP", code: NP_CODIGO };
  }
  if (LINK_TYPE === "PECA" || LINK_TYPE === "PECA_OP") {
    return { label: "PRODUTO", code: PRODUCT_CODE };
  }
  return { label: "SERVIÇO", code: "GERAL" };
}

function renderActiveFilters() {
  const status = normalize(qs("#statusFilter")?.value || "ALL");
  const q = normalize(qs("#q")?.value || "");
  const linkType = normalize(qs("#linkType")?.value || "");
  const codMaquina = normalize(qs("#codMaquina")?.value || "");

  const parts = [];

  if (status && status !== "ALL") {
    parts.push(`Status: <b>${escapeHtml(status)}</b>`);
  }

  if (linkType) {
    parts.push(`Tipo: <b>${escapeHtml(linkType)}</b>`);
  }

  if (q) {
    parts.push(`Texto: <b>${escapeHtml(q)}</b>`);
  }

  if (!parts.length) {
    return "Mostrando todos os POPs.";
  }

  return `Filtrando por: ${parts.join(" • ")}`;
}

function render(items) {
  const list = qs("#list");
  list.innerHTML = "";

  if (!items || !items.length) {
    qs("#status").innerHTML = `<div class="alert">Nenhum POP encontrado com os filtros atuais.</div>`;
    return;
  }

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
    const VERSION_ID = p.version_id ?? p.VERSION_ID ?? "";
    const VERSION_NUM = p.version_num ?? p.VERSION_NUM ?? "-";
    const CREATED_AT = p.created_at ?? p.CREATED_AT ?? null;
    const linkInfo = getLinkHighlight(
      LINK_TYPE,
      COD_MAQUINA,
      COD_TAREFA,
      NP_CODIGO,
      PRODUCT_CODE
    );

    el.innerHTML = `
      <div class="meta">

        <div class="badge" style="margin-bottom:6px;">
          ${escapeHtml(linkInfo.label)}
        </div>

        <div style="font-size:1.2rem; font-weight:800; margin-bottom:4px;">
          ${escapeHtml(linkInfo.code)}
        </div>

        <div class="title">
          ${escapeHtml(TITLE)}
        </div>

        <div class="small" style="margin-top:6px;">
          ${escapeHtml(CODE)} • 
          <b style="color:${STATUS === "PUBLISHED" ? "var(--ok)" : "var(--warn)"}">
            ${escapeHtml(STATUS)}
          </b> • 
          v${escapeHtml(VERSION_NUM)}
        </div>
      </div>

      <div class="actions">

      <button class="btn"
        data-view="${escapeHtml(TEMPLATE_ID)}"
        data-version="${escapeHtml(VERSION_ID || "")}">
        Ver
      </button>

      ${STATUS === "DRAFT" ? `
        <button
          class="btn"
          data-view="${escapeHtml(TEMPLATE_ID)}"
          data-version="${escapeHtml(VERSION_ID)}"
        >
          ✏️ Editar
        </button>
      ` : ""}

      ${STATUS === "PUBLISHED" ? `
        <button class="btn primary"
          data-clone-template="${escapeHtml(TEMPLATE_ID)}"
          data-clone-version="${escapeHtml(VERSION_ID)}">
          Nova versão
        </button>
      ` : ""}

    </div>
    `;

    list.appendChild(el);
  }

  list.querySelectorAll("button[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {

      const templateId = btn.getAttribute("data-view");
      const versionId = btn.getAttribute("data-version");

      if (!versionId || versionId === "null" || versionId === "") {
        // fallback → abre versão ativa
        window.location.href =
          `./pop-view.html?template_id=${encodeURIComponent(templateId)}`;
        return;
      }

      window.location.href =
        `./pop-view.html?template_id=${encodeURIComponent(templateId)}&version_id=${encodeURIComponent(versionId)}`;
    });
  });

  // ======================================
  // ✏️ EDITAR DRAFT
  // ======================================
  list.querySelectorAll("button[data-edit-template]").forEach(btn => {

    btn.addEventListener("click", () => {

      const templateId = btn.getAttribute("data-edit-template");
      const versionId = btn.getAttribute("data-edit-version");

      window.location.href =
        `./pop-create.html?edit=1&template_id=${encodeURIComponent(templateId)}&version_id=${encodeURIComponent(versionId)}`;

    });

  });

  list.querySelectorAll("button[data-clone-template]").forEach(btn => {
    btn.addEventListener("click", () => {
      const templateId = btn.getAttribute("data-clone-template");
      const versionId = btn.getAttribute("data-clone-version");

      window.location.href =
        `./pop-create.html?clone=1&template_id=${encodeURIComponent(templateId)}&version_id=${encodeURIComponent(versionId)}`;
    });
  });

}

async function load() {
  const statusEl = qs("#status");
  statusEl.innerHTML = renderActiveFilters();

  const path = buildQuery();
  try {
    const items = await apiGet(path);
    render(items);

    statusEl.innerHTML += `
      <div class="muted" style="margin-top:4px;">
        ${items.length} POP(s) encontrado(s).
      </div>
    `;
  } catch (err) {
    statusEl.innerHTML = `<div class="alert">Erro ao buscar: ${escapeHtml(err.message)}</div>`;
  }
}

function wireEvents() {
  qs("#btnBuscar")?.addEventListener("click", load);

  qs("#q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      load();
    }
  });

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
