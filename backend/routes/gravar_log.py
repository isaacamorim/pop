# /routes/gravar_log.py

from flask import session, request


TELA_POP = 1130  # código ERP


def gravar_log(chave, acao, detalhes="", tela=TELA_POP, empresa=1):

    try:

        # ========================
        # USUÁRIO
        # ========================
        usuario = session.get("user", {}).get("usuario") or "SISTEMA"

        # ========================
        # IP
        # ========================
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)

        # ========================
        # AGENTE (NAVEGADOR / APP)
        # ========================
        agent = request.headers.get("User-Agent", "-")

        # ========================
        # TEXTO FINAL DO LOG
        # ========================
        funcao = f"POP | {acao}"

        if detalhes:
            funcao += f" | {detalhes}"

        funcao += f" | IP:{ip}"

        # corta pra não estourar
        funcao = funcao[:2000]

        db.session.execute(
            text(
                """
            BEGIN
                GRAVAR_LOG(
                    p_CHAVE   => :chave,
                    p_TELA    => :tela,
                    p_FUNCAO  => :funcao,
                    p_EMPRESA => :empresa,
                    p_USUARI  => :usuario
                );
            END;
            """
            ),
            {
                "chave": str(chave),
                "tela": int(tela),
                "funcao": funcao,
                "empresa": int(empresa),
                "usuario": usuario[:30],
            },
        )

    except Exception as e:
        print("⚠️ ERRO AO GRAVAR LOG:", e)
