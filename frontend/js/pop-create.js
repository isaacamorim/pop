// frontend/pop_front/js/pop-create.js
import { apiGet, apiPost, apiPatch, apiPostFile } from "./api.js";
import { requireAuth } from "./auth-guard.js";

// ============================================
// TOAST SYSTEM MELHORADO
// ============================================
function showToast(message, type = "info") {
    const existingToast = document.querySelector(".toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = {
        success: "✓",
        error: "✕",
        info: "ℹ️",
        warning: "⚠️"
    }[type] || "ℹ️";

    toast.innerHTML = `<span style="font-size: 1.2rem; margin-right: 8px;">${icon}</span> ${message}`;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : type === "warning" ? "#f59e0b" : "#3b82f6"};
        color: white;
        padding: 14px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Adiciona animações CSS se não existir
if (!document.getElementById("toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// AUTO-SAVE INDICATOR
// ============================================
function showAutoSaveIndicator() {
    let indicator = document.getElementById("autoSaveIndicator");
    if (!indicator) return;

    indicator.style.display = "block";
    indicator.textContent = "💾 Salvando automaticamente...";

    setTimeout(() => {
        indicator.textContent = "✓ Salvo";
        setTimeout(() => {
            indicator.style.display = "none";
        }, 1000);
    }, 800);
}

// ============================================
// PROGRESS BAR DO WIZARD
// ============================================
function updateWizardProgress(currentStep) {
    document.querySelectorAll(".wizard-step").forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove("active", "completed");

        if (stepNum === currentStep) {
            step.classList.add("active");
        } else if (stepNum < currentStep) {
            step.classList.add("completed");
        }
    });
}

async function main() {
    // AUTH CHECK
    const user = await requireAuth();
    if (!user) {
        console.warn("[pop-create] não autenticado -> redirecionado pelo guard");
        return;
    }

    console.log("[pop-create] Usuário autenticado:", user.nome || user.usuario || user.id);

    // MODO DE OPERAÇÃO
    const mode = detectMode();
    console.log("[pop-create] Modo detectado:", mode);

    // STATE
    const state = {
        mode: mode,
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

    function detectMode() {
        const params = new URLSearchParams(window.location.search);
        const vid = params.get("version_id");

        if (params.get("edit") === "1" && /^\d+$/.test(vid)) {
            return {
                type: "edit",
                templateId: params.get("template_id"),
                versionId: vid
            };
        }

        if (params.get("clone") === "1") {
            return {
                type: "clone",
                templateId: params.get("template_id"),
                versionId: params.get("version_id")
            };
        }

        return { type: "create" };
    }

    async function loadExistingVersion() {
        if (mode.type === "create") return;

        console.log(`[pop-create] Carregando versão (${mode.type})...`);
        let loadedData = null;

        try {
            const data = await apiGet(
                `/api/pops/${mode.templateId}/versions/${mode.versionId}`
            );

            console.log("[pop-create] Metadados carregados:", data);
            loadedData = data;

            const linkTypeEl = document.getElementById("LINK_TYPE");
            if (linkTypeEl) linkTypeEl.disabled = true;

            if (mode.type === "edit" && data.STATUS === "PUBLISHED") {
                showToast("Esta versão já está publicada. Uma nova versão será criada.", "warning");
                mode.type = "clone";
                state.mode.type = "clone";
                console.warn("[pop-create] EDIT → CLONE forçado (versão publicada)");
            }

            const stepsRaw = await apiGet(`/api/steps?version_id=${mode.versionId}`);
            console.log("[pop-create] Passos carregados:", stepsRaw);

            const normalized = {
                TITLE: data.TITLE ?? data.IPT_TITLE ?? data.title ?? "",
                VERSION_NUM: data.VERSION_NUM ?? data.IPV_VERSION_NUM ?? "",
                STATUS: data.STATUS ?? data.IPV_STATUS ?? "",
                LINK_TYPE: data.LINK_TYPE ?? data.IPV_LINK_TYPE ?? "",
                COD_MAQUINA: data.COD_MAQUINA ?? data.IPV_COD_MAQUINA ?? "",
                COD_TAREFA: data.COD_TAREFA ?? data.IPV_COD_TAREFA ?? ""
            };

            loadedData = normalized;

            const steps = (stepsRaw || []).map((s) => ({
                ID: s.ID || null,
                TITLE: s.TITLE || "",
                INSTRUCTION: s.INSTRUCTION || "",
                REQUIRES_PHOTO: !!s.REQ_PHOTO,
                STEP_TIME: s.STEP_TIME || "",
                IMAGE: s.IMAGE_URL || null,
                HAS_TIME: !!s.STEP_TIME,
            }));

            state.form = {
                LINK_TYPE: normalized.LINK_TYPE,
                COD_MAQUINA: normalized.COD_MAQUINA,
                COD_TAREFA: normalized.COD_TAREFA,
                NP_CODIGO: data.NP_CODIGO || "",
                SEQ_COD: data.SEQ_COD || "",
                PRODUCT_CODE: data.PRODUCT_CODE || "",
                TITLE: normalized.TITLE || "",
                DESCRIPTION: data.DESCRIPTION || "",
                STEPS: steps,
            };

            if (mode.type === "edit") {
                state.draft.TEMPLATE_ID = mode.templateId;
                state.draft.VERSION_ID = mode.versionId;
                state.draft.LINK_ID = data.LINK_ID || null;
            }

            if (mode.type === "clone") {
                state.draft.TEMPLATE_ID = null;
                state.draft.VERSION_ID = null;
                state.draft.LINK_ID = null;
            }

            console.log("[pop-create] Carregando lookups...");

            if (state.form.LINK_TYPE === "MAQUINA") {
                await loadMachines();
            }

            if (state.form.LINK_TYPE === "TAREFA") {
                await loadTasks();
            }

            setLinkBlocksVisibility();
            renderSteps();

            showToast(`${mode.type === "edit" ? "Rascunho" : "Versão"} carregado com sucesso`, "success");

        } catch (err) {
            console.error("[pop-create] Falha ao carregar versão:", err);
            showToast(`Erro ao carregar versão: ${err.message}`, "error");

            setTimeout(() => {
                window.location.href = "./pop-create.html";
            }, 2000);

            return;
        }

        const ctx = document.getElementById("popContext");

        if (ctx && loadedData) {
            const labels = {
                create: "NOVO POP",
                edit: "EDIÇÃO DE RASCUNHO",
                clone: "NOVA VERSÃO (CLONE)",
            };

            ctx.innerHTML = `
                <div class="context-banner">
                    <div class="context-banner-title">
                        ${labels[mode.type]}
                    </div>
                    <div class="context-banner-content">
                        📄 <b>${loadedData.TITLE}</b>
                    </div>
                    <div class="context-banner-meta">
                        Versão base: <b>v${loadedData.VERSION_NUM}</b>
                        • Status: <b>${loadedData.STATUS}</b>
                    </div>
                </div>
            `;
        }
    }

    function populateFormFields() {
        const byId = (id) => document.getElementById(id);

        const linkType = byId("LINK_TYPE");
        if (linkType) linkType.value = state.form.LINK_TYPE;

        const codMaq = byId("COD_MAQUINA");
        if (codMaq) codMaq.value = state.form.COD_MAQUINA;

        const codTar = byId("COD_TAREFA");
        if (codTar) codTar.value = state.form.COD_TAREFA;

        const npCod = byId("NP_CODIGO");
        if (npCod) npCod.value = state.form.NP_CODIGO;

        const seqCod = byId("SEQ_COD");
        if (seqCod) seqCod.value = state.form.SEQ_COD;

        const prodCode = byId("PRODUCT_CODE");
        if (prodCode) prodCode.value = state.form.PRODUCT_CODE;

        const title = byId("TITLE");
        if (title) title.value = state.form.TITLE;

        const desc = byId("DESCRIPTION");
        if (desc) desc.value = state.form.DESCRIPTION;

        console.log("[pop-create] Campos populados ✅");
    }

    function toast(msg, isErr = false) {
        showToast(msg, isErr ? "error" : "success");

        // Fallback para status message
        const el = document.getElementById("statusMsg");
        if (el) {
            el.textContent = msg;
            el.className = `status-message ${isErr ? "error" : "success"}`;
            setTimeout(() => {
                el.textContent = "";
                el.className = "status-message";
            }, 3000);
        }
    }

    function showStep(n) {
        state.step = n;
        console.log("[wizard] Mostrando step:", n);

        // Atualiza progress bar
        updateWizardProgress(n);

        document.querySelectorAll(".wstep").forEach((sec) => {
            sec.style.display = Number(sec.dataset.step) === n ? "" : "none";
        });

        const btnBack = document.getElementById("btnBack");
        const btnNext = document.getElementById("btnNext");

        if (btnBack) btnBack.disabled = n === 1;
        if (btnNext) btnNext.style.display = n === 4 ? "none" : "";

        // Scroll suave para o topo
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validateStep(n) {
        const lt = (state.form.LINK_TYPE || "").toUpperCase();

        if (n === 1) {
            if (!lt) return "Selecione onde esse POP vai aparecer.";
        }

        if (n === 2) {
            if (lt === "MAQUINA" && !state.form.COD_MAQUINA) {
                return "Selecione a máquina.";
            }

            if (lt === "TAREFA" && !state.form.COD_TAREFA) {
                return "Selecione a tarefa.";
            }

            if (lt === "NP") {
                if (!state.form.NP_CODIGO) {
                    return "Selecione a NP (busque e clique).";
                }
            }

            if (lt === "PECA") {
                if (!state.form.PRODUCT_CODE) {
                    return "Selecione o produto (busque e clique).";
                }
            }

            if (lt === "PECA_OP") {
                if (!state.form.PRODUCT_CODE) {
                    return "Selecione o produto (busque e clique).";
                }
                if (!/^[PM]/i.test(state.form.PRODUCT_CODE || "")) {
                    return "Para Peça + Operação, o produto deve começar com P ou M.";
                }
                if (!state.form.NP_CODIGO && !state.form.SEQ_COD) {
                    return "Informe NP ou Sequência.";
                }
            }
        }

        if (n === 3) {
            if (!state.form.TITLE || state.form.TITLE.trim().length < 3) {
                return "Preencha um título válido (mínimo 3 caracteres).";
            }

            for (let i = 0; i < state.form.STEPS.length; i++) {
                const s = state.form.STEPS[i];
                if (s.REQUIRES_PHOTO && !s.IMAGE) {
                    return `O Passo ${i + 1} exige foto.`;
                }
            }
        }

        return null;
    }

    async function ensureDraftCreated() {
        if (state.draft.TEMPLATE_ID) return;

        if (mode.type === "clone") {
            console.log("🧬 Criando nova versão (clone)...");

            const res = await apiPost(
                `/api/pops/${mode.templateId}/new-version`,
                { base_version_id: mode.versionId }
            );

            state.draft.TEMPLATE_ID = res.template_id;
            state.draft.VERSION_ID = res.new_version_id;
            state.draft.LINK_ID = null;

            const params = new URLSearchParams(window.location.search);
            params.set("edit", "1");
            params.set("template_id", state.draft.TEMPLATE_ID);
            params.set("version_id", state.draft.VERSION_ID);

            history.replaceState(null, "", "pop-create.html?" + params.toString());

            mode.type = "edit";
            state.mode.type = "edit";

            console.log("✅ NOVA VERSÃO CRIADA");
            console.log("➡️ TEMPLATE:", state.draft.TEMPLATE_ID);
            console.log("➡️ VERSION:", state.draft.VERSION_ID);

            return;
        }

        if (mode.type === "create") {
            if (mode.templateId) {
                const existing = await getExistingDraft(mode.templateId);

                if (existing) {
                    state.draft.TEMPLATE_ID = mode.templateId;
                    state.draft.VERSION_ID = existing;

                    console.log("♻️ Reusando DRAFT existente");

                    const params = new URLSearchParams(window.location.search);
                    params.set("edit", "1");
                    params.set("template_id", mode.templateId);
                    params.set("version_id", existing);

                    history.replaceState(null, "", "pop-create.html?" + params.toString());

                    mode.type = "edit";
                    state.mode.type = "edit";

                    return;
                }
            }

            const res = await apiPost("/api/pops/draft", {
                LINK_TYPE: state.form.LINK_TYPE || "SERVICO",
                TITLE: state.form.TITLE || "Rascunho",
                DESCRIPTION: state.form.DESCRIPTION || "",
                CODE: `POP-${Date.now()}`,
            });

            state.draft.TEMPLATE_ID = res.template_id;
            state.draft.VERSION_ID = res.version_id;
            state.draft.LINK_ID = res.link_id;

            const params = new URLSearchParams(window.location.search);
            params.set("edit", "1");
            params.set("template_id", res.template_id);
            params.set("version_id", res.version_id);

            history.replaceState(null, "", "pop-create.html?" + params.toString());

            mode.type = "edit";
            state.mode.type = "edit";
        }
    }

    async function saveDraftPartial() {
        await ensureDraftCreated();

        if (!state.draft.TEMPLATE_ID) {
            throw new Error("Draft não inicializado.");
        }

        console.log("[draft] Salvando parcial...");
        showAutoSaveIndicator();

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

        const res = await apiPatch(
            `/api/pops/draft/${state.draft.TEMPLATE_ID}`,
            payload
        );

        if (res.steps) {
            state.form.STEPS = state.form.STEPS.map((s, i) => ({
                ...s,
                ID: res.steps[i]?.ID || s.ID,
                IMAGE: res.steps[i]?.IMAGE_URL || s.IMAGE
            }));
        }

        toast("Rascunho salvo ✅");
    }

    function setLinkBlocksVisibility() {
        const lt = (state.form.LINK_TYPE || "").toUpperCase();

        const blocks = {
            blkMachine: lt === "MAQUINA",
            blkTask: lt === "TAREFA",
            blkNp: lt === "NP" || lt === "PECA_OP",
            blkProduct: lt === "PECA" || lt === "PECA_OP",
        };

        Object.entries(blocks).forEach(([id, show]) => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? "" : "none";
        });
    }

    async function loadMachines() {
        const sel = document.getElementById("COD_MAQUINA");
        if (!sel) return;

        try {
            sel.innerHTML = `<option value="">Carregando...</option>`;
            const rows = await apiGet("/api/lookups/machines");

            sel.innerHTML =
                `<option value="">Selecione uma máquina...</option>` +
                rows.map((r) => `<option value="${r.COD}">${r.COD} - ${r.DESCR}</option>`).join("");

            if (state.form.COD_MAQUINA) {
                sel.value = state.form.COD_MAQUINA;
            }
        } catch (err) {
            console.error("[loadMachines] erro:", err);
            sel.innerHTML = `<option value="">Erro ao carregar</option>`;
            throw err;
        }
    }

    async function loadTasks() {
        const sel = document.getElementById("COD_TAREFA");
        if (!sel) return;

        try {
            sel.innerHTML = `<option value="">Carregando...</option>`;
            const rows = await apiGet("/api/lookups/tasks");

            sel.innerHTML =
                `<option value="">Selecione uma tarefa...</option>` +
                rows.map((r) => `<option value="${r.COD}">${r.COD} - ${r.DESCR}</option>`).join("");

            if (state.form.COD_TAREFA) {
                sel.value = state.form.COD_TAREFA;
            }
        } catch (err) {
            console.error("[loadTasks] erro:", err);
            sel.innerHTML = `<option value="">Erro ao carregar</option>`;
            throw err;
        }
    }

    let productTimer = null;

    async function searchProducts() {
        const q = (document.getElementById("PRODUCT_Q")?.value || "").trim();
        const box = document.getElementById("productResults");
        if (!box) return;

        if (q.length < 2) {
            box.style.display = "none";
            box.innerHTML = "";
            return;
        }

        const lt = (state.form.LINK_TYPE || "").toUpperCase();
        const pmOnly = lt === "PECA_OP" ? "1" : "0";

        const rows = await apiGet(`/api/lookups/products?q=${encodeURIComponent(q)}&pm_only=${pmOnly}`);

        if (!rows.length) {
            box.style.display = "block";
            box.innerHTML = `<div class="search-result-item" style="opacity: 0.6; cursor: default;">Nenhum produto encontrado.</div>`;
            return;
        }

        box.style.display = "block";
        box.innerHTML = rows.map(r => `
            <div class="search-result-item" data-cod="${r.COD}">
                <div class="search-result-title">${r.COD} <span style="font-weight: 400; color: var(--muted);">(${r.STATUS})</span></div>
                <div class="search-result-subtitle">${r.DESCR || ""}</div>
            </div>
        `).join("");

        box.querySelectorAll("[data-cod]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();

                const cod = el.getAttribute("data-cod");
                state.form.PRODUCT_CODE = cod;

                const inp = document.getElementById("PRODUCT_CODE");
                if (inp) inp.value = cod;

                box.style.display = "none";
                box.innerHTML = "";
                toast("Produto selecionado ✅");
            });
        });
    }

    function wireProductSearch() {
        const inp = document.getElementById("PRODUCT_Q");
        if (!inp) return;

        inp.addEventListener("input", () => {
            clearTimeout(productTimer);
            productTimer = setTimeout(() => searchProducts().catch(e => toast(e.message, true)), 250);
        });
    }

    let npTimer = null;

    async function searchNps(query = "") {
        const lt = (state.form.LINK_TYPE || "").toUpperCase();
        if (lt !== "NP" && lt !== "PECA_OP") return;

        const box = document.getElementById("npResults");
        if (!box) return;

        try {
            const q = query.trim();
            const url = q
                ? `/api/lookups/nps?q=${encodeURIComponent(q)}&limit=30`
                : `/api/lookups/nps?limit=30`;

            const rows = await apiGet(url);

            if (!rows.length) {
                box.style.display = "block";
                box.innerHTML = `<div class="search-result-item" style="opacity: 0.6; cursor: default;">Nenhuma NP encontrada.</div>`;
                return;
            }

            box.style.display = "block";
            box.innerHTML = rows.map(r => {
                const cod = r.COD || "";
                const descr = r.DESCR || "";
                const prod = r.PRODUTO || "";
                const label = `${cod}${prod ? " • " + prod : ""}`;
                const subtitle = descr || "";

                return `
                    <div class="search-result-item" data-cod="${cod}" data-prod="${prod}">
                        <div class="search-result-title">${label}</div>
                        ${subtitle ? `<div class="search-result-subtitle">${subtitle}</div>` : ""}
                    </div>
                `;
            }).join("");

            box.querySelectorAll("[data-cod]").forEach(el => {
                el.addEventListener("click", (e) => {
                    e.stopPropagation();

                    const cod = el.getAttribute("data-cod") || "";
                    const prod = el.getAttribute("data-prod") || "";

                    state.form.NP_CODIGO = cod;

                    const inpCod = document.getElementById("NP_CODIGO");
                    if (inpCod) inpCod.value = cod;

                    const inpProd = document.getElementById("NP_PRODUTO");
                    if (inpProd) inpProd.value = prod;

                    if (state.form.LINK_TYPE === "PECA_OP" && prod) {
                        state.form.PRODUCT_CODE = prod;
                        const inpProduct = document.getElementById("PRODUCT_CODE");
                        if (inpProduct) inpProduct.value = prod;
                    }

                    box.style.display = "none";
                    box.innerHTML = "";
                    toast("NP selecionada ✅");
                });
            });

        } catch (err) {
            toast(err.message, true);
        }
    }

    function wireNpSearch() {
        const inp = document.getElementById("NP_Q");
        const btnListar = document.getElementById("btnNpListar");
        const btnLimpar = document.getElementById("btnNpLimpar");
        const box = document.getElementById("npResults");

        if (!inp) return;

        inp.addEventListener("input", () => {
            clearTimeout(npTimer);
            const q = inp.value.trim();

            if (q.length < 2) {
                if (box) {
                    box.style.display = "none";
                    box.innerHTML = "";
                }
                return;
            }

            npTimer = setTimeout(() => {
                searchNps(q).catch(e => toast(e.message, true));
            }, 250);
        });

        if (btnListar) {
            btnListar.onclick = () => {
                searchNps("").catch(e => toast(e.message, true));
            };
        }

        if (btnLimpar) {
            btnLimpar.onclick = () => {
                inp.value = "";
                state.form.NP_CODIGO = "";
                state.form.SEQ_COD = "";

                const inpCod = document.getElementById("NP_CODIGO");
                if (inpCod) inpCod.value = "";

                const inpProd = document.getElementById("NP_PRODUTO");
                if (inpProd) inpProd.value = "";

                const inpSeq = document.getElementById("SEQ_COD");
                if (inpSeq) inpSeq.value = "";

                if (box) {
                    box.style.display = "none";
                    box.innerHTML = "";
                }

                toast("Campos de NP limpos");
            };
        }
    }

    async function getExistingDraft(templateId) {
        try {
            const res = await apiGet(`/api/pops/${templateId}/draft`);

            if (res.exists) {
                console.log("📌 Draft existente encontrado:", res.version_id);
                return res.version_id;
            }

            return null;

        } catch (e) {
            console.warn("Falha ao verificar draft:", e);
            return null;
        }
    }

    function renderSteps() {
        const wrap = document.getElementById("stepsList");
        const emptyState = document.getElementById("emptySteps");

        if (!wrap) return;

        wrap.innerHTML = "";

        if (state.form.STEPS.length === 0) {
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        state.form.STEPS.forEach((s, idx) => {
            const div = document.createElement("div");
            div.className = "step-item";

            div.innerHTML = `
                <div class="step-item-header">
                    <div class="step-item-number">${idx + 1}</div>
                    <div style="flex: 1;"></div>
                    <div class="step-item-actions">
                        <button class="btn-remove-step" data-i="${idx}" type="button">
                            🗑️ Remover
                        </button>
                    </div>
                </div>

                <div class="step-item-body">
                    <div class="form-group">
                        <label class="form-label">Título do Passo</label>
                        <input class="form-input"
                            data-k="TITLE"
                            data-i="${idx}"
                            placeholder="Ex: Preparar equipamento"
                            value="${s.TITLE || ""}"
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Instruções Detalhadas</label>
                        <textarea class="form-textarea"
                            data-k="INSTRUCTION"
                            data-i="${idx}"
                            placeholder="Descreva detalhadamente o que deve ser feito neste passo..."
                            rows="3"
                        >${s.INSTRUCTION || ""}</textarea>
                    </div>

                    <div class="toggle-group">
                        <label class="switch">
                            <input type="checkbox" 
                                data-k="REQUIRES_PHOTO" 
                                data-i="${idx}"
                                ${s.REQUIRES_PHOTO ? "checked" : ""}
                            >
                            <span class="slider"></span>
                        </label>
                        <span class="toggle-label">📷 Exigir foto neste passo</span>
                    </div>

                    <div class="toggle-group">
                        <label class="switch">
                            <input type="checkbox" 
                                data-k="HAS_TIME" 
                                data-i="${idx}"
                                ${s.HAS_TIME ? "checked" : ""}
                            >
                            <span class="slider"></span>
                        </label>
                        <span class="toggle-label">⏱ Informar tempo estimado</span>
                    </div>

                    ${s.HAS_TIME ? `
                        <div class="form-group">
                            <label class="form-label">⏱ Tempo Estimado (minutos)</label>
                            <input type="number" 
                                class="form-input"
                                min="1" 
                                data-k="STEP_TIME" 
                                data-i="${idx}"
                                value="${s.STEP_TIME || ""}"
                                placeholder="Ex: 10"
                            />
                        </div>
                    ` : ""}

                    <div class="form-group">
                        ${s.IMAGE
                    ? `
                                <div class="photo-preview-box">
                                    <img src="${s.IMAGE}" class="photo-preview-img" alt="Foto do passo ${idx + 1}" />
                                </div>
                                <button type="button" class="btn photo-remove" data-i="${idx}">
                                    🗑️ Remover foto
                                </button>
                            `
                    : `
                                <div class="photo-upload-area" data-i="${idx}" style="cursor: pointer;">
                                    <div style="font-size: 2rem; margin-bottom: 8px;">📷</div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">Adicionar foto do passo</div>
                                    <div style="font-size: 0.85rem; color: var(--muted);">
                                        Clique para fazer upload (máx 5MB)
                                    </div>
                                </div>
                            `
                }
                    </div>
                </div>
            `;

            wrap.appendChild(div);
        });

        // Event listeners para inputs
        wrap.querySelectorAll("[data-k]").forEach(el => {
            el.addEventListener("input", e => {
                const i = Number(e.target.dataset.i);
                const k = e.target.dataset.k;

                if (k === "REQUIRES_PHOTO") {
                    state.form.STEPS[i].REQUIRES_PHOTO = e.target.checked;
                    renderSteps();
                    return;
                }

                if (k === "HAS_TIME") {
                    state.form.STEPS[i].HAS_TIME = e.target.checked;
                    if (!e.target.checked) {
                        state.form.STEPS[i].STEP_TIME = "";
                    }
                    renderSteps();
                    return;
                }

                state.form.STEPS[i][k] = e.target.value;
            });
        });

        // Remover passo
        wrap.querySelectorAll(".btn-remove-step").forEach(btn => {
            btn.addEventListener("click", () => {
                const i = Number(btn.dataset.i);
                if (confirm(`Deseja remover o Passo ${i + 1}?`)) {
                    state.form.STEPS.splice(i, 1);
                    renderSteps();
                    showToast(`Passo ${i + 1} removido`, "info");
                }
            });
        });

        // Upload de foto
        wrap.querySelectorAll(".photo-upload-area").forEach(area => {
            area.addEventListener("click", async () => {
                const i = Number(area.dataset.i);

                if (!state.form.STEPS[i].ID) {
                    showToast("Salvando rascunho antes de enviar foto...", "info");

                    try {
                        await saveDraftPartial();
                    } catch (e) {
                        toast("Erro ao salvar antes da foto", true);
                        return;
                    }

                    if (!state.form.STEPS[i].ID) {
                        toast("Falha ao gerar ID do passo", true);
                        return;
                    }
                }

                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";

                input.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;

                    if (file.size > 5 * 1024 * 1024) {
                        toast("Imagem muito grande (máx 5MB)", true);
                        return;
                    }

                    const form = new FormData();
                    form.append("file", file);

                    showToast("Enviando foto...", "info");

                    apiPostFile(`/api/steps/${state.form.STEPS[i].ID}/image`, form)
                        .then(res => {
                            state.form.STEPS[i].IMAGE = res.image_url;
                            renderSteps();
                            toast("Foto salva ✅");
                        })
                        .catch(err => {
                            console.error("Erro ao fazer upload:", err);
                            toast(err.message || "Erro ao salvar foto", true);
                        });
                };

                input.click();
            });
        });

        // Remover foto
        wrap.querySelectorAll(".photo-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const i = Number(btn.dataset.i);
                if (confirm("Deseja remover esta foto?")) {
                    state.form.STEPS[i].IMAGE = null;
                    renderSteps();
                    showToast("Foto removida", "info");
                }
            });
        });
    }

    function renderReview() {
        const el = document.getElementById("review");
        if (!el) return;

        const summary = {
            MODE: mode.type.toUpperCase(),
            TEMPLATE_ID: state.draft.TEMPLATE_ID,
            VERSION_ID: state.draft.VERSION_ID,
            LINK_TYPE: state.form.LINK_TYPE,
            COD_MAQUINA: state.form.COD_MAQUINA || "-",
            COD_TAREFA: state.form.COD_TAREFA || "-",
            NP_CODIGO: state.form.NP_CODIGO || "-",
            SEQ_COD: state.form.SEQ_COD || "-",
            PRODUCT_CODE: state.form.PRODUCT_CODE || "-",
            TITLE: state.form.TITLE,
            DESCRIPTION: state.form.DESCRIPTION || "-",
            TOTAL_STEPS: state.form.STEPS.length,
            STEPS: state.form.STEPS,
        };

        el.textContent = JSON.stringify(summary, null, 2);
    }

    function bindInputs() {
        const byId = (id) => document.getElementById(id);

        const linkType = byId("LINK_TYPE");
        const hintLink = byId("hintLink");

        if (linkType) {
            linkType.addEventListener("change", async (e) => {
                state.form.LINK_TYPE = (e.target.value || "").toUpperCase();
                console.log("[wizard] LINK_TYPE mudou para:", state.form.LINK_TYPE);

                setLinkBlocksVisibility();

                if (hintLink) {
                    const hints = {
                        MAQUINA: "💡 Aparece na tela de máquinas (manutenção/rotina).",
                        TAREFA: "💡 Aparece por operação/tarefa do ERP.",
                        NP: "💡 POP geral por NP (pode ter sequência).",
                        PECA: "💡 POP por produto/código.",
                        PECA_OP: "💡 POP específico por produto + NP/Seq.",
                        SERVICO: "💡 POP genérico (não vincula no ERP).",
                    };
                    hintLink.textContent = hints[state.form.LINK_TYPE] || "";
                }

                if (!state.form.TITLE) {
                    const titleSuggestions = {
                        MAQUINA: "Ligar máquina",
                        SERVICO: "Procedimento de serviço",
                        TAREFA: "Procedimento de tarefa",
                        NP: "Procedimento NP",
                        PECA: "Procedimento de peça",
                        PECA_OP: "Procedimento de peça/OP",
                    };
                    state.form.TITLE = titleSuggestions[state.form.LINK_TYPE] || "";
                    const titleEl = byId("TITLE");
                    if (titleEl) titleEl.value = state.form.TITLE;
                }

                const lt = state.form.LINK_TYPE;
                if (lt !== "NP" && lt !== "PECA_OP") {
                    state.form.NP_CODIGO = "";
                    state.form.SEQ_COD = "";

                    const q = byId("NP_Q");
                    if (q) q.value = "";

                    const c = byId("NP_CODIGO");
                    if (c) c.value = "";

                    const p = byId("NP_PRODUTO");
                    if (p) p.value = "";

                    const box = byId("npResults");
                    if (box) {
                        box.style.display = "none";
                        box.innerHTML = "";
                    }
                }

                if (!["PECA", "PECA_OP"].includes(lt)) {
                    state.form.PRODUCT_CODE = "";

                    const pq = byId("PRODUCT_Q");
                    if (pq) pq.value = "";

                    const pc = byId("PRODUCT_CODE");
                    if (pc) pc.value = "";

                    const pr = byId("productResults");
                    if (pr) {
                        pr.style.display = "none";
                        pr.innerHTML = "";
                    }
                }

                if (lt === "PECA_OP") {
                    state.form.PRODUCT_CODE = "";
                    const pc = byId("PRODUCT_CODE");
                    if (pc) pc.value = "";
                }

                try {
                    if (state.form.LINK_TYPE === "MAQUINA") await loadMachines();
                    if (state.form.LINK_TYPE === "TAREFA") await loadTasks();
                } catch (err) {
                    toast(`Erro ao carregar dados: ${err.message}`, true);
                }
            });
        }

        const codMaq = byId("COD_MAQUINA");
        if (codMaq) {
            codMaq.addEventListener("change", (e) => {
                state.form.COD_MAQUINA = e.target.value;
                console.log("[wizard] COD_MAQUINA:", state.form.COD_MAQUINA);
            });
        }

        const codTar = byId("COD_TAREFA");
        if (codTar) {
            codTar.addEventListener("change", (e) => {
                state.form.COD_TAREFA = e.target.value;
                console.log("[wizard] COD_TAREFA:", state.form.COD_TAREFA);
            });
        }

        const seq = byId("SEQ_COD");
        if (seq) {
            seq.addEventListener("input", (e) => {
                state.form.SEQ_COD = e.target.value.trim();
            });
        }

        const prod = byId("PRODUCT_CODE");
        if (prod) {
            prod.addEventListener("input", (e) => {
                state.form.PRODUCT_CODE = e.target.value.trim();
            });
        }

        const title = byId("TITLE");
        if (title) {
            title.addEventListener("input", (e) => {
                state.form.TITLE = e.target.value;
            });
        }

        const desc = byId("DESCRIPTION");
        if (desc) {
            desc.addEventListener("input", (e) => {
                state.form.DESCRIPTION = e.target.value;
            });
        }

        const btnAddStep = byId("btnAddStep");
        if (btnAddStep) {
            btnAddStep.addEventListener("click", () => {
                state.form.STEPS.push({
                    TITLE: `Passo ${state.form.STEPS.length + 1}`,
                    INSTRUCTION: "",
                    REQUIRES_PHOTO: false,
                    STEP_TIME: "",
                    IMAGE: null,
                    HAS_TIME: false
                });
                renderSteps();
                showToast("Passo adicionado", "success");
            });
        }

        const btnBack = byId("btnBack");
        if (btnBack) {
            btnBack.addEventListener("click", () => {
                if (state.step > 1) {
                    showStep(state.step - 1);
                }
            });
        }

        const btnNext = byId("btnNext");
        if (btnNext) {
            btnNext.addEventListener("click", async () => {
                const err = validateStep(state.step);
                if (err) return toast(err, true);

                try {
                    if (state.form.LINK_TYPE) {
                        await saveDraftPartial();
                    }

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

        console.log("🚀 PUBLICANDO");
        console.log("➡️ TEMPLATE_ID:", state.draft.TEMPLATE_ID);
        console.log("➡️ VERSION_ID:", state.draft.VERSION_ID);
        console.log("➡️ MODE:", mode.type);

        const btnPublish = byId("btnPublish");
        if (btnPublish) {
            btnPublish.addEventListener("click", async () => {
                const confirmMsg = mode.type === "clone"
                    ? "Deseja publicar esta NOVA VERSÃO? A versão anterior será desativada."
                    : "Deseja publicar este POP? Ele ficará disponível para todos.";

                if (!confirm(confirmMsg)) {
                    return;
                }

                btnPublish.disabled = true;
                btnPublish.innerHTML = `<span style="animation: pulse 1s infinite;">⏳</span> Publicando...`;

                try {
                    const err = validateStep(3);
                    if (err) {
                        toast(err, true);
                        btnPublish.disabled = false;
                        btnPublish.innerHTML = `🚀 Publicar POP`;
                        return;
                    }

                    await saveDraftPartial();

                    if (!state.draft.TEMPLATE_ID) {
                        throw new Error("Template inválido para publicação");
                    }

                    console.log("🚀 Publicando TEMPLATE:", state.draft.TEMPLATE_ID);

                    await apiPost(`/api/pops/${state.draft.TEMPLATE_ID}/publish`);

                    showToast("POP publicado com sucesso! Redirecionando...", "success");

                    setTimeout(() => {
                        window.location.href = "./pop-list.html";
                    }, 1500);
                } catch (e) {
                    console.error("[wizard] Erro ao publicar:", e);
                    toast(`Erro ao publicar: ${e.message}`, true);
                    btnPublish.disabled = false;
                    btnPublish.innerHTML = `🚀 Publicar POP`;
                }
            });
        }

        console.log("[wizard] Event listeners registrados ✅");
    }

    async function init() {
        console.log("[pop-create] Inicializando wizard...");

        bindInputs();
        wireNpSearch();
        wireProductSearch();

        await loadExistingVersion();

        setLinkBlocksVisibility();

        if (mode.type === "create" && !state.draft.TEMPLATE_ID) {
            showStep(1);
            renderSteps();
        } else {
            showStep(3);
            populateFormFields();
        }

        if (mode.type !== "create") {
            const btnBack = document.getElementById("btnBack");
            if (btnBack && state.step === 3) {
                btnBack.disabled = true;
                btnBack.title = "Não é possível voltar para configuração de vínculo em modo edição/clone";
            }
        }

        // Click outside para fechar search boxes
        document.addEventListener("click", (e) => {
            const npBox = document.getElementById("npResults");
            const npQ = document.getElementById("NP_Q");
            const npBtnListar = document.getElementById("btnNpListar");
            const npBtnLimpar = document.getElementById("btnNpLimpar");

            if (npBox && npBox.style.display !== "none") {
                const clickedInside = npBox.contains(e.target) ||
                    npQ?.contains(e.target) ||
                    npBtnListar?.contains(e.target) ||
                    npBtnLimpar?.contains(e.target);
                if (!clickedInside) {
                    npBox.style.display = "none";
                    npBox.innerHTML = "";
                }
            }

            const prBox = document.getElementById("productResults");
            const prQ = document.getElementById("PRODUCT_Q");

            if (prBox && prBox.style.display !== "none") {
                const clickedInside = prBox.contains(e.target) || prQ?.contains(e.target);
                if (!clickedInside) {
                    prBox.style.display = "none";
                    prBox.innerHTML = "";
                }
            }
        });

        console.log("[pop-create] Wizard pronto! ✅");
    }

    init();
}

main();