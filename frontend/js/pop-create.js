// frontend/pop_front/js/pop-create.js
import { apiGet, apiPost, apiPatch } from "./api.js";

/**
 * WIZARD DRAFT -> PUBLISH
 * Etapas:
 * 1) LINK_TYPE
 * 2) Detalhes do vínculo
 * 3) Conteúdo + Steps
 * 4) Revisão + Publicar
 */

const state = {
    step: 1,
    draft: {
        TEMPLATE_ID: null,
        VERSION_ID: null,
        LINK_ID: null,
    },
    form: {
        LINK_TYPE: "",
        COD_MAQUINA: "",
        COD_TAREFA: "",
        NP_CODIGO: "",
        SEQ_COD: "",
        PRODUCT_CODE: "",
        TITLE: "",
        DESCRIPTION: "",
        STEPS: [],
    },
};

function toast(msg, isErr = false) {
    const el = document.getElementById("statusMsg");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.style.color = isErr ? "crimson" : "green";
    setTimeout(() => {
        el.textContent = "";
    }, 3000);
}

function showStep(n) {
    state.step = n;
    document.querySelectorAll(".wstep").forEach((sec) => {
        sec.style.display = Number(sec.dataset.step) === n ? "" : "none";
    });

    const btnBack = document.getElementById("btnBack");
    const btnNext = document.getElementById("btnNext");

    if (btnBack) btnBack.disabled = n === 1;
    if (btnNext) btnNext.style.display = n === 4 ? "none" : "";
}

function validateStep(n) {
    const lt = (state.form.LINK_TYPE || "").toUpperCase();

    if (n === 1) {
        if (!lt) return "Selecione onde esse POP vai aparecer.";
    }

    if (n === 2) {
        if (lt === "MAQUINA" && !state.form.COD_MAQUINA) return "Selecione a máquina.";
        if (lt === "TAREFA" && !state.form.COD_TAREFA) return "Selecione a tarefa.";
        if (lt === "NP" && !state.form.NP_CODIGO) return "Informe a NP.";
        if (lt === "PECA" && !state.form.PRODUCT_CODE) return "Informe o produto.";
        if (lt === "PECA_OP") {
            if (!state.form.PRODUCT_CODE) return "Informe o produto.";
            if (!state.form.NP_CODIGO && !state.form.SEQ_COD) return "Informe NP ou Sequência.";
        }
        // SERVICO não exige nada além do título na etapa 3
    }

    if (n === 3) {
        if (!state.form.TITLE || state.form.TITLE.trim().length < 3) return "Preencha um título.";
    }

    return null;
}

async function ensureDraftCreated() {
    if (state.draft.TEMPLATE_ID) return;

    const payload = {
        LINK_TYPE: state.form.LINK_TYPE || "SERVICO",
        TITLE: state.form.TITLE || "Rascunho",
        DESCRIPTION: state.form.DESCRIPTION || "",
        CODE: `POP-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`
    };


    const r = await apiPost("/api/pops/draft", payload);
    state.draft = r;
}

async function saveDraftPartial() {
    await ensureDraftCreated();

    const payload = {
        LINK_TYPE: state.form.LINK_TYPE,
        COD_MAQUINA: state.form.COD_MAQUINA,
        COD_TAREFA: state.form.COD_TAREFA,
        NP_CODIGO: state.form.NP_CODIGO,
        SEQ_COD: state.form.SEQ_COD,
        PRODUCT_CODE: state.form.PRODUCT_CODE,
        TITLE: state.form.TITLE,
        DESCRIPTION: state.form.DESCRIPTION,
        STEPS: state.form.STEPS,
    };

    await apiPatch(`/api/pops/draft/${state.draft.TEMPLATE_ID}`, payload);
    toast("Rascunho salvo ✅");
}

function setLinkBlocksVisibility() {
    const lt = (state.form.LINK_TYPE || "").toUpperCase();

    const blkMachine = document.getElementById("blkMachine");
    const blkTask = document.getElementById("blkTask");
    const blkNp = document.getElementById("blkNp");
    const blkProduct = document.getElementById("blkProduct");

    if (blkMachine) blkMachine.style.display = lt === "MAQUINA" ? "" : "none";
    if (blkTask) blkTask.style.display = lt === "TAREFA" ? "" : "none";
    if (blkNp) blkNp.style.display = lt === "NP" || lt === "PECA_OP" ? "" : "none";
    if (blkProduct) blkProduct.style.display = lt === "PECA" || lt === "PECA_OP" ? "" : "none";
}

async function loadMachines() {
    const sel = document.getElementById("COD_MAQUINA");
    if (!sel) return;

    sel.innerHTML = `<option value="">Carregando...</option>`;
    const rows = await apiGet("/api/lookups/machines");
    sel.innerHTML =
        `<option value="">Selecione...</option>` +
        rows.map((r) => `<option value="${r.COD}">${r.COD} - ${r.DESCR}</option>`).join("");
}

async function loadTasks() {
    const sel = document.getElementById("COD_TAREFA");
    if (!sel) return;

    sel.innerHTML = `<option value="">Carregando...</option>`;
    const rows = await apiGet("/api/lookups/tasks");
    sel.innerHTML =
        `<option value="">Selecione...</option>` +
        rows.map((r) => `<option value="${r.COD}">${r.COD} - ${r.DESCR}</option>`).join("");
}

function renderSteps() {
    const wrap = document.getElementById("stepsList");
    if (!wrap) return;

    wrap.innerHTML = "";

    state.form.STEPS.forEach((s, idx) => {
        const div = document.createElement("div");
        div.style.border = "1px solid #ddd";
        div.style.padding = "8px";
        div.style.marginBottom = "8px";

        div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <b>Passo ${idx + 1}</b>
        <button type="button" data-del="${idx}">Remover</button>
      </div>

      <input data-k="TITLE" data-i="${idx}" value="${s.TITLE || ""}" placeholder="Título do passo" style="width:100%; margin:6px 0;" />
      <textarea data-k="INSTRUCTION" data-i="${idx}" placeholder="Instrução" style="width:100%; min-height:70px;">${s.INSTRUCTION || ""}</textarea>

      <label style="margin-right:12px;">
        <input type="checkbox" data-k="REQUIRES_PHOTO" data-i="${idx}" ${s.REQUIRES_PHOTO ? "checked" : ""}/>
        Exigir foto
      </label>

      <label>
        <input type="checkbox" data-k="REQUIRES_SIGNATURE" data-i="${idx}" ${s.REQUIRES_SIGNATURE ? "checked" : ""}/>
        Exigir assinatura
      </label>
    `;

        wrap.appendChild(div);
    });

    // bind inputs
    wrap.querySelectorAll("[data-k]").forEach((el) => {
        const handler = (e) => {
            const i = Number(e.target.dataset.i);
            const k = e.target.dataset.k;

            if (e.target.type === "checkbox") state.form.STEPS[i][k] = e.target.checked;
            else state.form.STEPS[i][k] = e.target.value;
        };

        el.addEventListener("input", handler);
        el.addEventListener("change", handler);
    });

    // delete
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const i = Number(btn.dataset.del);
            state.form.STEPS.splice(i, 1);
            renderSteps();
        });
    });
}

function renderReview() {
    const el = document.getElementById("review");
    if (!el) return;

    const summary = {
        TEMPLATE_ID: state.draft.TEMPLATE_ID,
        LINK_TYPE: state.form.LINK_TYPE,
        COD_MAQUINA: state.form.COD_MAQUINA,
        COD_TAREFA: state.form.COD_TAREFA,
        NP_CODIGO: state.form.NP_CODIGO,
        SEQ_COD: state.form.SEQ_COD,
        PRODUCT_CODE: state.form.PRODUCT_CODE,
        TITLE: state.form.TITLE,
        DESCRIPTION: state.form.DESCRIPTION,
        STEPS_QTD: state.form.STEPS.length,
    };

    el.textContent = JSON.stringify(summary, null, 2);
}

function bindInputs() {
    const byId = (id) => document.getElementById(id);

    // etapa 1
    const linkType = byId("LINK_TYPE");
    if (linkType) {
        linkType.addEventListener("change", async (e) => {
            state.form.LINK_TYPE = (e.target.value || "").toUpperCase();
            setLinkBlocksVisibility();

            // sugestão de título
            if (!state.form.TITLE) {
                if (state.form.LINK_TYPE === "MAQUINA") state.form.TITLE = "Ligar máquina";
                if (state.form.LINK_TYPE === "SERVICO") state.form.TITLE = "Serviço";
                const titleEl = byId("TITLE");
                if (titleEl) titleEl.value = state.form.TITLE;
            }

            try {
                if (state.form.LINK_TYPE === "MAQUINA") await loadMachines();
                if (state.form.LINK_TYPE === "TAREFA") await loadTasks();
            } catch (err) {
                toast(err.message, true);
            }
        });
    }

    // etapa 2
    const codMaq = byId("COD_MAQUINA");
    if (codMaq) codMaq.addEventListener("change", (e) => (state.form.COD_MAQUINA = e.target.value));

    const codTar = byId("COD_TAREFA");
    if (codTar) codTar.addEventListener("change", (e) => (state.form.COD_TAREFA = e.target.value));

    const np = byId("NP_CODIGO");
    if (np) np.addEventListener("input", (e) => (state.form.NP_CODIGO = e.target.value));

    const seq = byId("SEQ_COD");
    if (seq) seq.addEventListener("input", (e) => (state.form.SEQ_COD = e.target.value));

    const prod = byId("PRODUCT_CODE");
    if (prod) prod.addEventListener("input", (e) => (state.form.PRODUCT_CODE = e.target.value));

    // etapa 3
    const title = byId("TITLE");
    if (title) title.addEventListener("input", (e) => (state.form.TITLE = e.target.value));

    const desc = byId("DESCRIPTION");
    if (desc) desc.addEventListener("input", (e) => (state.form.DESCRIPTION = e.target.value));

    const addStep = byId("btnAddStep");
    if (addStep) {
        addStep.addEventListener("click", () => {
            state.form.STEPS.push({
                TITLE: `Passo ${state.form.STEPS.length + 1}`,
                INSTRUCTION: "",
                REQUIRES_PHOTO: false,
                REQUIRES_SIGNATURE: false,
            });
            renderSteps();
        });
    }

    // navegação
    const btnBack = byId("btnBack");
    if (btnBack) {
        btnBack.addEventListener("click", () => {
            if (state.step > 1) showStep(state.step - 1);
        });
    }

    const btnNext = byId("btnNext");
    if (btnNext) {
        btnNext.addEventListener("click", async () => {
            const err = validateStep(state.step);
            if (err) return toast(err, true);

            try {
                await saveDraftPartial();

                if (state.step === 3) {
                    renderReview();
                    showStep(4);
                } else {
                    showStep(state.step + 1);
                }
            } catch (e) {
                toast(e.message, true);
            }
        });
    }

    const btnPublish = byId("btnPublish");
    if (btnPublish) {
        btnPublish.addEventListener("click", async () => {
            try {
                // valida antes
                const err = validateStep(3);
                if (err) return toast(err, true);

                await saveDraftPartial();
                await apiPost(`/api/pops/${state.draft.TEMPLATE_ID}/publish`, {});
                toast("Publicado com sucesso ✅");
            } catch (e) {
                toast(e.message, true);
            }
        });
    }
}

function init() {
    bindInputs();
    setLinkBlocksVisibility();
    showStep(1);
    renderSteps();
}

init();
