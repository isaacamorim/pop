// frontend/pop_front/js/pop-create.js
import { apiGet, apiPost, apiPatch } from "./api.js";
import { requireAuth } from "./auth-guard.js";

async function main() {
    // ========================================
    // AUTH CHECK
    // ========================================
    const user = await requireAuth();
    if (!user) {
        console.warn("[pop-create] não autenticado -> redirecionado pelo guard");
        return; // ✅ aqui PODE (está dentro de função)
    }

    console.log("[pop-create] Usuário autenticado:", user.nome || user.usuario || user.id);

    // ========================================
    // STATE
    // ========================================
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

    // ========================================
    // UTILS
    // ========================================
    function toast(msg, isErr = false) {
        const el = document.getElementById("statusMsg");
        if (!el) {
            alert(msg);
            return;
        }
        el.textContent = msg;
        el.style.color = isErr ? "crimson" : "green";
        el.style.fontWeight = "bold";
        setTimeout(() => {
            el.textContent = "";
        }, 3000);
    }

    function showStep(n) {
        state.step = n;
        console.log("[wizard] Mostrando step:", n);

        document.querySelectorAll(".wstep").forEach((sec) => {
            sec.style.display = Number(sec.dataset.step) === n ? "" : "none";
        });

        const btnBack = document.getElementById("btnBack");
        const btnNext = document.getElementById("btnNext");

        if (btnBack) btnBack.disabled = n === 1;
        if (btnNext) btnNext.style.display = n === 4 ? "none" : "";
    }

    // ========================================
    // VALIDATION
    // ========================================
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

            if (lt === "NP" && !state.form.NP_CODIGO) {
                return "Selecione a NP.";
            }

            if (lt === "PECA" && !state.form.PRODUCT_CODE) {
                return "Informe o código do produto.";
            }

            if (lt === "PECA_OP") {
                if (!state.form.PRODUCT_CODE) {
                    return "Informe o código do produto.";
                }

                // regra P/M
                if (!/^[PM]/i.test(state.form.PRODUCT_CODE || "")) {
                    return "Para Peça + Operação, o produto deve começar com P ou M.";
                }

                // precisa NP ou SEQ
                if (!state.form.NP_CODIGO && !state.form.SEQ_COD) {
                    return "Informe NP ou Sequência.";
                }
            }

            // SERVICO: não exige nada na etapa 2
        }

        if (n === 3) {
            if (!state.form.TITLE || state.form.TITLE.trim().length < 3) {
                return "Preencha um título válido (mínimo 3 caracteres).";
            }
        }

        return null;
    }

    // ========================================
    // DRAFT API
    // ========================================
    async function ensureDraftCreated() {
        if (state.draft.TEMPLATE_ID) {
            console.log("[draft] Já existe draft:", state.draft.TEMPLATE_ID);
            return;
        }

        console.log("[draft] Criando novo draft...");

        const payload = {
            LINK_TYPE: state.form.LINK_TYPE || "SERVICO",
            TITLE: state.form.TITLE || "Rascunho",
            DESCRIPTION: state.form.DESCRIPTION || "",
            CODE: `POP-${Date.now()}`,
        };

        const response = await apiPost("/api/pops/draft", payload);

        const templateId = response.TEMPLATE_ID ?? response.template_id ?? response.templateId;
        const versionId = response.VERSION_ID ?? response.version_id ?? response.versionId;
        const linkId = response.LINK_ID ?? response.link_id ?? response.linkId;

        if (!templateId) {
            console.error("[draft] resposta do /draft sem TEMPLATE_ID:", response);
            throw new Error("API /pops/draft não retornou TEMPLATE_ID.");
        }

        state.draft.TEMPLATE_ID = templateId;
        state.draft.VERSION_ID = versionId ?? null;
        state.draft.LINK_ID = linkId ?? null;

        console.log("[draft] Criado:", state.draft);
    }

    async function saveDraftPartial() {
        await ensureDraftCreated();

        console.log("[draft] Salvando parcial...");

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
        console.log("[draft] Salvo com sucesso");
        toast("Rascunho salvo ✅");
    }

    // ========================================
    // UI UPDATES
    // ========================================
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

    // ========================================
    // LOOKUPS
    // ========================================
    async function loadMachines() {
        const sel = document.getElementById("COD_MAQUINA");
        if (!sel) return;

        try {
            sel.innerHTML = `<option value="">Carregando...</option>`;
            const rows = await apiGet("/api/lookups/machines");

            sel.innerHTML =
                `<option value="">Selecione uma máquina...</option>` +
                rows.map((r) => `<option value="${r.COD}">${r.COD} - ${r.DESCR}</option>`).join("");
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
        } catch (err) {
            console.error("[loadTasks] erro:", err);
            sel.innerHTML = `<option value="">Erro ao carregar</option>`;
            throw err;
        }
    }

    async function loadNps() {
        const sel = document.getElementById("NP_CODIGO");
        if (!sel) return;

        sel.innerHTML = `<option value="">Carregando...</option>`;
        const rows = await apiGet("/api/lookups/nps");

        sel.innerHTML =
            `<option value="">Selecione...</option>` +
            rows.map(r => {
                const cod = r.COD ?? "";
                const descr = r.DESCR ?? "";
                const prod = r.PRODUTO ?? "";
                const label = `${cod}${prod ? " • " + prod : ""}${descr ? " — " + descr : ""}`;
                return `<option value="${cod}" data-produto="${prod}">${label}</option>`;
            }).join("");
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
            box.innerHTML = `<div class="muted">Nenhum produto encontrado.</div>`;
            return;
        }

        box.style.display = "block";
        box.innerHTML = rows.map(r => `
            <div class="item" style="padding:8px; border-bottom:1px solid var(--border); cursor:pointer;" data-cod="${r.COD}">
            <div class="meta">
                <div class="title">${r.COD} <span class="muted" style="font-weight:500;">(${r.STATUS})</span></div>
                <div class="small">${r.DESCR || ""}</div>
            </div>
            </div>
        `).join("");

        box.querySelectorAll("[data-cod]").forEach(el => {
            el.onclick = () => {
                const cod = el.getAttribute("data-cod");
                state.form.PRODUCT_CODE = cod;

                const inp = document.getElementById("PRODUCT_CODE");
                if (inp) inp.value = cod;

                box.style.display = "none";
                box.innerHTML = "";
                toast("Produto selecionado ✅");
            };
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

    // ========================================
    // STEPS RENDERING
    // ========================================
    function renderSteps() {
        const wrap = document.getElementById("stepsList");
        if (!wrap) return;

        wrap.innerHTML = "";

        if (state.form.STEPS.length === 0) {
            wrap.innerHTML = '<p style="color:#999;">Nenhum passo adicionado ainda.</p>';
            return;
        }

        state.form.STEPS.forEach((s, idx) => {
            const div = document.createElement("div");
            div.className = "step-item";
            div.style.cssText = "border:1px solid #ddd; padding:12px; margin-bottom:10px; border-radius:4px;";

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <b>Passo ${idx + 1}</b>
                    <button type="button" class="btn-remove" data-del="${idx}" style="background:crimson; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                        Remover
                    </button>
                </div>

                <input 
                    type="text"
                    data-k="TITLE" 
                    data-i="${idx}" 
                    value="${s.TITLE || ""}" 
                    placeholder="Título do passo" 
                    style="width:100%; margin:6px 0; padding:8px; border:1px solid #ccc; border-radius:3px;" 
                />
                
                <textarea 
                    data-k="INSTRUCTION" 
                    data-i="${idx}" 
                    placeholder="Instrução detalhada" 
                    style="width:100%; min-height:80px; margin:6px 0; padding:8px; border:1px solid #ccc; border-radius:3px; resize:vertical;"
                >${s.INSTRUCTION || ""}</textarea>

                <div style="margin-top:8px;">
                    <label style="margin-right:16px; cursor:pointer;">
                        <input type="checkbox" data-k="REQUIRES_PHOTO" data-i="${idx}" ${s.REQUIRES_PHOTO ? "checked" : ""}/>
                        Exigir foto
                    </label>

                    <label style="cursor:pointer;">
                        <input type="checkbox" data-k="REQUIRES_SIGNATURE" data-i="${idx}" ${s.REQUIRES_SIGNATURE ? "checked" : ""}/>
                        Exigir assinatura
                    </label>
                </div>
            `;

            wrap.appendChild(div);
        });

        // Bind inputs
        wrap.querySelectorAll("[data-k]").forEach((el) => {
            const handler = (e) => {
                const i = Number(e.target.dataset.i);
                const k = e.target.dataset.k;

                if (e.target.type === "checkbox") {
                    state.form.STEPS[i][k] = e.target.checked;
                } else {
                    state.form.STEPS[i][k] = e.target.value;
                }
            };

            el.addEventListener("input", handler);
            el.addEventListener("change", handler);
        });

        // Bind delete buttons
        wrap.querySelectorAll("[data-del]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const i = Number(btn.dataset.del);
                if (confirm(`Remover o Passo ${i + 1}?`)) {
                    state.form.STEPS.splice(i, 1);
                    renderSteps();
                    toast("Passo removido");
                }
            });
        });
    }

    // ========================================
    // REVIEW
    // ========================================
    function renderReview() {
        const el = document.getElementById("review");
        if (!el) return;

        const summary = {
            TEMPLATE_ID: state.draft.TEMPLATE_ID,
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

    // ========================================
    // EVENT BINDING
    // ========================================
    function bindInputs() {
        const byId = (id) => document.getElementById(id);

        // ========== ETAPA 1: LINK_TYPE ==========
        const linkType = byId("LINK_TYPE");
        const hintLink = byId("hintLink");

        if (linkType) {
            linkType.addEventListener("change", async (e) => {
                state.form.LINK_TYPE = (e.target.value || "").toUpperCase();
                console.log("[wizard] LINK_TYPE mudou para:", state.form.LINK_TYPE);

                setLinkBlocksVisibility();

                // Update hint
                if (hintLink) {
                    const hints = {
                        MAQUINA: "Aparece na tela de máquinas (manutenção/rotina).",
                        TAREFA: "Aparece por operação/tarefa do ERP.",
                        NP: "POP geral por NP (pode ter sequência).",
                        PECA: "POP por produto/código.",
                        PECA_OP: "POP específico por produto + NP/Seq.",
                        SERVICO: "POP genérico (não vincula no ERP).",
                    };
                    hintLink.textContent = hints[state.form.LINK_TYPE] || "";
                }

                // Auto-suggest title
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

                // Load lookups
                try {
                    if (state.form.LINK_TYPE === "MAQUINA") await loadMachines();
                    if (state.form.LINK_TYPE === "TAREFA") await loadTasks();
                    if (state.form.LINK_TYPE === "NP" || state.form.LINK_TYPE === "PECA_OP") await loadNps();
                } catch (err) {
                    toast(`Erro ao carregar dados: ${err.message}`, true);
                }
            });
        }

        // ========== ETAPA 2: DETALHES ==========
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

        const np = byId("NP_CODIGO");
        if (np) {
            np.addEventListener("change", (e) => {
                const cod = (e.target.value || "").trim();
                state.form.NP_CODIGO = cod;

                // pega o produto da option selecionada e salva também (opcional, mas útil)
                const opt = e.target.selectedOptions?.[0];
                const prod = opt?.getAttribute("data-produto") || "";
                state.form.NP_PRODUTO = prod;
                if (prod) state.form.PRODUCT_CODE = prod;

                console.log("[wizard] NP_CODIGO:", state.form.NP_CODIGO, "PROD:", state.form.PRODUCT_CODE);
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

        // ========== ETAPA 3: CONTEÚDO ==========
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
                    REQUIRES_SIGNATURE: false,
                });
                renderSteps();
                toast("Passo adicionado");
            });
        }

        // ========== NAVEGAÇÃO ==========
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
                // dentro do btnNext click
                const err = validateStep(state.step);
                if (err) return toast(err, true);

                try {
                    // só salva se já tiver LINK_TYPE escolhido
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

        // ========== PUBLICAR ==========
        const btnPublish = byId("btnPublish");
        if (btnPublish) {
            btnPublish.addEventListener("click", async () => {
                if (!confirm("Deseja publicar este POP? Ele ficará disponível para todos.")) {
                    return;
                }

                try {
                    const err = validateStep(3);
                    if (err) {
                        toast(err, true);
                        return;
                    }

                    await saveDraftPartial();
                    await apiPost(`/api/pops/${state.draft.TEMPLATE_ID}/publish`, {});

                    toast("POP publicado com sucesso! ✅");
                    setTimeout(() => {
                        window.location.href = "./pop-list.html";
                    }, 1000);
                } catch (e) {
                    console.error("[wizard] Erro ao publicar:", e);
                    toast(`Erro ao publicar: ${e.message}`, true);
                }
            });
        }

        console.log("[wizard] Event listeners registrados ✅");
    }

    // ========================================
    // INIT
    // ========================================
    function init() {
        console.log("[pop-create] Inicializando wizard...");

        bindInputs();
        wireProductSearch();
        setLinkBlocksVisibility();
        showStep(1);
        renderSteps();

        console.log("[pop-create] Wizard pronto! ✅");
    }

    // Start
    init();
}

// ========================================
// RUN
// ========================================
main();