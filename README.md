# POP — Procedimentos Operacionais Padrão

Sistema web para criação, edição e publicação de Procedimentos Operacionais Padrão (POP), com vínculo direto a entidades do ERP industrial.

---

## 🎯 Objetivo

Centralizar POPs de forma organizada, rastreável e escalável, permitindo vinculação por:
- Máquina
- Tarefa / Operação
- NP
- Produto
- Produto + Operação
- Serviço genérico

---

## 🧱 Stack

### Backend
- Python
- Flask
- SQLAlchemy
- Oracle Database
- REST API

### Frontend
- HTML5
- CSS
- JavaScript (ES Modules)
- Sem frameworks (intencional)

---

## 🧭 Fluxo do Sistema

### Wizard de Criação
1. Seleção do tipo de vínculo
2. Detalhamento do vínculo
3. Conteúdo do POP
4. Revisão e publicação

---

## 🔎 Busca Inteligente (Escalável)

Para entidades com muitos registros (NP e Produto):

- Busca sob demanda
- Debounce
- Dropdown customizado
- Seleção por clique
- Sem carregamento massivo

---

## 💾 Rascunho Automático

- POPs são criados como rascunho
- Salvamento automático a cada etapa
- Publicação apenas na confirmação final

---

## 📂 Estrutura Simplificada

backend/
└── routes/
└── lookups.py
└── pops.py

frontend/
└── pop_front/
├── pop-create.html
└── js/
└── pop-create.js


---

## 🧠 Controle de Estado

Todo o frontend é controlado por um objeto central (`state`), evitando inconsistências e bugs de UI.

---

## 🚀 Boas Práticas Aplicadas

- Performance first
- UX limpa
- Código previsível
- Escalabilidade
- Sem dependências desnecessárias

---

## 📌 Próximos Passos

- Tela de edição de POP
- Versionamento avançado
- Controle de permissões
- Dashboard de POPs
- Auditoria e histórico

---

## ✍️ Autor
Projeto desenvolvido internamente com foco em processos industriais e ERP.
