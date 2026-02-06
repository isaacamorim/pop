# Arquitetura — Sistema POP

Este documento descreve a arquitetura técnica do sistema de POP
(Procedimentos Operacionais Padrão).

---

## 📐 Visão Geral

O sistema segue uma arquitetura em camadas:

# Arquitetura — Sistema POP

Este documento descreve a arquitetura técnica do sistema de POP
(Procedimentos Operacionais Padrão).

---

## 📐 Visão Geral

O sistema segue uma arquitetura em camadas:

Frontend (Browser)
↓
REST API (Flask)
↓
ORM (SQLAlchemy)
↓
Oracle Database (ERP)

---

## 🧩 Componentes

### Frontend

- SPA-like em Vanilla JS
- ES Modules
- Gerenciamento manual de estado
- Comunicação via Fetch API

Responsável por:

- UI
- Validações básicas
- Wizard
- Uploads
- Visualização

---

### Backend

Responsável por:

- Autenticação
- Regras de negócio
- Versionamento
- Auditoria
- Validações
- Integração ERP

Tecnologias:

- Flask
- SQLAlchemy
- Oracle Driver

---

### Banco de Dados

Banco corporativo Oracle integrado ao ERP.

Principais tabelas:

| Tabela | Função |
|--------|---------|
| I_POP_TEMPLATE | Template do POP |
| I_POP_VERSION | Versões |
| I_POP_LINK | Vínculo |
| I_POP_STEP | Passos |
| J_LOG | Auditoria |

---

## 🔄 Fluxo de Dados

### Criação

UI → /draft → Template → Version → Link → Steps → Commit

### Publicação

UI → /publish → Validação → Arquivamento → Ativação → Log

### Nova Versão

UI → /new-version → Clone → Novo Draft

---

## 🧠 Controle de Estado (Frontend)

Cada tela mantém um objeto central:

```js
const state = {
  templateId,
  versionId,
  steps,
  link,
  status
}

Evita inconsistência entre telas.

📝 Logs

Todos os eventos são registrados via procedure:
GRAVAR_LOG(...)
Campos:

Chave

Tela

Função

Usuário

Empresa

Data

🔐 Segurança

Sessão via cookie

Autenticação ERP

Proteção por decorator

Validação backend

📈 Escalabilidade

Queries paginadas

Busca lazy

Cache natural do Oracle

Sem sobrecarga frontend

⚠️ Pontos Críticos

Integridade de versões

Controle de draft ativo

Performance em buscas

Uploads

📌 Evoluções Futuras

Microserviços

Cache Redis

API Gateway

Observabilidade

---
