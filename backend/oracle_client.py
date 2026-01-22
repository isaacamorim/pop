# backend/oracle_client.py

import os
import logging
import oracledb


def init_oracle_thick():
    """
    Tenta ativar THICK mode.
    Se o Instant Client estiver instalado e visível no PATH, funciona.
    Se não, cai no THIN (mas aí pode dar DPY-3015 dependendo do Oracle).
    """
    try:
        # Opcional: permitir informar caminho fixo via .env
        lib_dir = os.getenv("ORACLE_CLIENT_LIB")
        if lib_dir:
            oracledb.init_oracle_client(lib_dir=lib_dir)
        else:
            # tenta automático (usa PATH / configurações do sistema)
            oracledb.init_oracle_client()

        logging.info("Oracle Client encontrado (THICK mode).")
        return True
    except Exception as e:
        logging.warning(f"Oracle Client não encontrado, usando THIN mode. Motivo: {e}")
        return False
