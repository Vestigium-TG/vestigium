import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.afirmacoes import _obter_afirmacao_com_posse
from backend.auth import obter_usuario_id_atual
from backend.db import conectar_banco

router = APIRouter(prefix="/afirmacoes", tags=["evidencias"])


class EvidenciaCreate(BaseModel):
    fonte_id: uuid.UUID
    descricao: str
    trecho: str | None = None
    tipo: str | None = None


@router.post("/{afirmacao_id}/evidencias")
def registrar_evidencia(
    afirmacao_id: uuid.UUID,
    dados: EvidenciaCreate,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    if not dados.descricao.strip():
        raise HTTPException(
            status_code=422, detail="descricao não pode estar vazia"
        )

    conn = conectar_banco()
    cursor = conn.cursor()

    try:
        afirmacao = _obter_afirmacao_com_posse(cursor, afirmacao_id, usuario_id)
    except HTTPException:
        cursor.close()
        conn.close()
        raise

    cursor.execute(
        "SELECT id FROM FONTE WHERE id = %s AND investigacao_id = %s",
        (str(dados.fonte_id), afirmacao["investigacao_id"]),
    )

    if cursor.fetchone() is None:
        cursor.close()
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="Fonte não encontrada nesta investigação",
        )

    agora = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    evidencia_id = uuid.uuid4()

    cursor.execute(
        """
        INSERT INTO EVIDENCIA
        (id, afirmacao_id, fonte_id, descricao, trecho, tipo, data_criacao)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(evidencia_id),
            afirmacao["id"],
            str(dados.fonte_id),
            dados.descricao,
            dados.trecho,
            dados.tipo,
            agora,
        ),
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "id": str(evidencia_id),
        "afirmacao_id": afirmacao["id"],
        "fonte_id": str(dados.fonte_id),
        "descricao": dados.descricao,
        "trecho": dados.trecho,
        "tipo": dados.tipo,
        "data_criacao": agora,
    }
