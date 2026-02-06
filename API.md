```md
# API — Sistema POP

Documentação da API REST do sistema POP.

Base URL:

http://<host>:<porta>/api

---

## 🔐 Autenticação

### Login

`POST /auth/login`

```json
{
  "username": "user",
  "password": "senha"
}
Resposta:
{
  "ok": true,
  "user": {...}
}
Usuário Atual

GET /auth/me

📂 POPs
Criar Draft

POST /pops/draft

Body:
{
  "TITLE": "Procedimento X"
}
Atualizar Draft
PATCH /pops/draft/{template_id}

Publicar
POST /pops/{template_id}/publish

Criar Nova Versão
POST /pops/{template_id}/new-version

Listar POPs
GET /pops

Query Params:

| Param     | Descrição         |
| --------- | ----------------- |
| status    | DRAFT / PUBLISHED |
| q         | Busca             |
| link_type | Tipo              |

Buscar POP

GET /pops/{template_id}

Buscar Versão

GET /pops/{template_id}/versions/{version_id}

Draft Ativo

GET /pops/{template_id}/draft

📑 Steps
Listar Steps

GET /steps?version_id={id}

Upload Imagem

POST /steps/{id}/image

⚠️ Códigos de Retorno

| Código | Significado     |
| ------ | --------------- |
| 200    | OK              |
| 201    | Criado          |
| 400    | Erro validação  |
| 401    | Não autenticado |
| 404    | Não encontrado  |
| 500    | Erro interno    |

🧪 Padrões

JSON UTF-8

CamelCase no frontend

Uppercase no banco

---

# 📁 3️⃣ `DEPLOY.md`

```md
# Deploy — Sistema POP

Guia de instalação e publicação do sistema.

---

## 🖥️ Requisitos

- Python 3.10+
- Oracle Client
- Acesso ERP
- Linux ou Windows Server

---

## 📦 Backend

### Instalação

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
Variáveis de Ambiente

DB_USER=
DB_PASS=
DB_DSN=
FLASK_SECRET=
Execução

flask run --host=0.0.0.0 --port=8000

🌐 Frontend

Hospedagem estática:

Nginx

Apache

IIS

Ou:

python -m http.server 5500
🔁 Produção
Recomendado:

Gunicorn

Nginx

HTTPS

Proxy reverso

📋 Backup
Dump Oracle

Versionamento Git

Backup semanal

🔄 Atualizações


git pull
pip install -r requirements.txt
systemctl restart pop
🧯 Troubleshooting

| Problema     | Solução         |
| ------------ | --------------- |
| Erro DB      | Validar DSN     |
| 401          | Sessão expirada |
| Lento        | Indexar tabelas |
| Upload falha | Permissões      |

---