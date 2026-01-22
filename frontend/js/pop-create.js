// frontend/pop_front/js/pop-create.js

import { apiGet, apiPost, qs } from "./api.js";

let templateId = null;
let versionId = null;

function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    const base = btn.getAttribute("data-label") || btn.textContent;
    btn.textContent = busy ? "Salvando..." : base;
}

function showOk(el, msg) {
    el.innerHTML = `<div class="badge">✅ ${escapeHtml(msg)}</div>`;
}

function showErr(el, msg) {
    el.innerHTML = `<div class="alert">❌ ${escapeHtml(msg)}</div>`;
}

function escapeHtml(s) {
    return (s ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showStep(n) {
    const steps = [qs("#step1"), qs("#step2"), qs("#step3"), qs("#step4")];
    steps.forEach((el, idx) => el.style.display = (idx === (n - 1) ? "" : "none"));
    const names = ["Template", "Versão", "Steps", "Link"];
    qs("#stepNum").textContent = String(n);
    qs("#stepName").textContent = names[n - 1];
}

function currentType() {
    return qs("#t_type").value;
}

function syncTypeRules() {
    const type = currentType();

    // blocos
    qs("#blockMachine").style.display = (type === "MAQUINA") ? "" : "none";
    qs("#blockTask").style.display = (type === "OPERACAO") ? "" : "none";

    // defaults de link
    qs("#l_type").value = (type === "MAQUINA") ? "MAQUINA" : (type === "SERVICO" ? "SERVICO" : qs("#l_type").value);

    // se máquina selecionada, espelha nos campos
    if (type === "MAQUINA") {
        const selected = qs("#machineSelect").value;
        if (selected) {
            qs("#v_cod_maquina").value = selected;
            qs("#l_cod_maquina").value = selected;
        }
    }

    // se tarefa selecionada, espelha
    if (type === "OPERACAO") {
        const t = qs("#taskSelect").value;
        if (t) {
            qs("#v_cod_tarefa").value = t;
            qs("#l_cod_tarefa").value = t;
            qs("#l_type").value = "TAREFA";
        }
    }
}

async function loadMachines() {
    const sel = qs("#machineSelect");
    sel.innerHTML = `<option value="">Carregando...</option>`;
    try {
        const rows = await apiGet("/api/lookups/machines");
        sel.innerHTML = `<option value="">Selecione...</option>` + rows.map(r =>
            `<option value="${escapeHtml(r.COD)}">${escapeHtml(r.COD)} — ${escapeHtml(r.DESCR || "")}</option>`
        ).join("");
    } catch (e) {
        sel.innerHTML = `<option value="">(erro ao carregar)</option>`;
        showErr(qs("#templateResult"), `Falha ao carregar máquinas: ${e.message}`);
    }
}

async function loadTasks() {
    const sel = qs("#taskSelect");
    sel.innerHTML = `<option value="">Carregando...</option>`;
    try {
        const rows = await apiGet("/api/lookups/tasks");
        sel.innerHTML = `<option value="">Selecione...</option>` + rows.map(r =>
            `<option value="${escapeHtml(r.COD)}">${escapeHtml(r.COD)} — ${escapeHtml(r.DESCR || "")}</option>`
        ).join("");
    } catch (e) {
        sel.innerHTML = `<option value="">(erro ao carregar)</option>`;
        showErr(qs("#templateResult"), `Falha ao carregar tarefas: ${e.message}`);
    }
}

async function testApi() {
    const out = qs("#apiTestResult");
    const btn = qs("#btnTestApi");
    try {
        setBusy(btn, true);
        const res = await apiGet("/health");
        showOk(out, `API OK: ${JSON.stringify(res)}`);
    } catch (e) {
        showErr(out, e.message);
    } finally {
        setBusy(btn, false);
    }
}

async function createTemplate() {
    const btn = qs("#btnCreateTemplate");
    const out = qs("#templateResult");

    const type = qs("#t_type").value.trim();
    const title = qs("#t_title").value.trim();
    if (!title) return showErr(out, "TITLE é obrigatório.");

    const body = {
        CODE: qs("#t_code").value.trim() || null,
        TITLE: title,
        TYPE: type,
        DESCRIPTION: qs("#t_desc").value.trim() || null,
        DUR_PADRAO: qs("#t_dur").value ? Number(qs("#t_dur").value) : null,
        ACTIVE: true,
    };

    try {
        setBusy(btn, true);

        // auto: se MAQUINA, e title vazio (não é), mas a gente pode sugerir com base na máquina
        const res = await apiPost("/api/templates", body);
        templateId = res.ID;

        qs("#v_template_id").value = templateId;
        showOk(out, `Template criado (ID ${templateId}).`);

        // espelha regras após criar
        syncTypeRules();
        showStep(2);
    } catch (e) {
        showErr(out, e.message);
    } finally {
        setBusy(btn, false);
    }
}

async function createVersion() {
    const btn = qs("#btnCreateVersion");
    const out = qs("#versionResult");
    if (!templateId) return showErr(out, "Crie o Template primeiro.");

    const body = {
        TEMPLATE_ID: templateId,
        VERSION_NUM: Number(qs("#v_num").value || "1"),
        SUMMARY: qs("#v_summary").value.trim() || null,
        CONTENT: qs("#v_content").value || null,
        COD_MAQUINA: qs("#v_cod_maquina").value.trim() || null,
        COD_TAREFA: qs("#v_cod_tarefa").value.trim() || null,
        IS_STANDARD: true,
        ACTIVE: qs("#v_active").value === "true",
    };

    try {
        setBusy(btn, true);
        const res = await apiPost("/api/versions", body);
        versionId = res.ID;

        qs("#s_version_id").value = versionId;
        qs("#l_version_id").value = versionId;

        showOk(out, `Versão criada (ID ${versionId}).`);
        showStep(3);
    } catch (e) {
        showErr(out, e.message);
    } finally {
        setBusy(btn, false);
    }
}

async function addStep() {
    const btn = qs("#btnAddStep");
    const out = qs("#stepsResult");
    if (!versionId) return showErr(out, "Crie a Versão primeiro.");

    const seq = Number(qs("#s_seq").value || "1");

    const body = {
        VERSION_ID: versionId,
        SEQ: seq,
        TITLE: qs("#s_title").value.trim() || null,
        INSTRUCTION: qs("#s_instruction").value.trim() || null,
        REQ_PHOTO: qs("#s_photo").value === "true",
        REQ_SIGN: qs("#s_sign").value === "true",
    };

    try {
        setBusy(btn, true);
        const res = await apiPost("/api/steps", body);
        showOk(out, `Step adicionado (ID ${res.ID}).`);

        // limpa
        qs("#s_seq").value = String(seq + 1);
        qs("#s_title").value = "";
        qs("#s_instruction").value = "";
        qs("#s_photo").value = "false";
        qs("#s_sign").value = "false";
    } catch (e) {
        showErr(out, e.message);
    } finally {
        setBusy(btn, false);
    }
}

async function createLink() {
    const btn = qs("#btnCreateLink");
    const out = qs("#linkResult");
    if (!versionId) return showErr(out, "Crie a Versão primeiro.");

    const body = {
        VERSION_ID: versionId,
        LINK_TYPE: qs("#l_type").value.trim(),
        COD_MAQUINA: qs("#l_cod_maquina").value.trim() || null,
        COD_TAREFA: qs("#l_cod_tarefa").value.trim() || null,
        COD_NP: qs("#l_cod_np").value.trim() || null,
        COD_PRODUTO: qs("#l_cod_produto").value.trim() || null,
        COD_SEQ: qs("#l_cod_seq").value.trim() || null,
        NOTES: qs("#l_notes").value.trim() || null,
    };

    try {
        setBusy(btn, true);
        const res = await apiPost("/api/links", body);
        showOk(out, `Link criado (ID ${res.ID}). Agora ele deve aparecer na lista.`);

        qs("#finalResume").innerHTML =
            `<div class="badge">Resumo: TEMPLATE_ID <b>${templateId}</b> • VERSION_ID <b>${versionId}</b> • LINK_ID <b>${res.ID}</b></div>`;
    } catch (e) {
        showErr(out, e.message);
    } finally {
        setBusy(btn, false);
    }
}

// eventos
qs("#btnTestApi").addEventListener("click", testApi);
qs("#btnCreateTemplate").addEventListener("click", createTemplate);
qs("#btnCreateVersion").addEventListener("click", createVersion);
qs("#btnAddStep").addEventListener("click", addStep);
qs("#btnNextToLink").addEventListener("click", () => showStep(4));
qs("#btnCreateLink").addEventListener("click", createLink);

qs("#t_type").addEventListener("change", async () => {
    const type = currentType();
    if (type === "MAQUINA") await loadMachines();
    if (type === "OPERACAO") await loadTasks();
    syncTypeRules();
});

qs("#machineSelect").addEventListener("change", () => syncTypeRules());
qs("#taskSelect").addEventListener("change", () => syncTypeRules());

// init
(async function init() {
    showStep(1);

    // carrega conforme default
    if (currentType() === "MAQUINA") await loadMachines();
    if (currentType() === "OPERACAO") await loadTasks();

    syncTypeRules();
})();
