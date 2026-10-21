import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.afirmacoes import _obter_afirmacao_com_posse
from backend.auth import obter_usuario_id_atual
from backend.db import conectar_banco

router = APIRouter(prefix="/afirmacoes", tags=["reflexoes"])


class ReflexaoCreate(BaseModel):
    texto: str


@router.post("/{afirmacao_id}/reflexao")
def registrar_reflexao(
    afirmacao_id: uuid.UUID,
    dados: ReflexaoCreate,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    if not dados.texto.strip():
        raise HTTPException(status_code=422, detail="texto não pode estar vazio")

    conn = conectar_banco()
    cursor = conn.cursor()

    try:
        afirmacao = _obter_afirmacao_com_posse(cursor, afirmacao_id, usuario_id)
    except HTTPException:
        cursor.close()
        conn.close()
        raise

    agora = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    reflexao_id = uuid.uuid4()

    cursor.execute(
        """
        INSERT INTO REFLEXAO (id, afirmacao_id, texto, data_criacao)
        VALUES (%s, %s, %s, %s)
        """,
        (str(reflexao_id), afirmacao["id"], dados.texto, agora),
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "id": str(reflexao_id),
        "afirmacao_id": afirmacao["id"],
        "texto": dados.texto,
        "data_criacao": agora,
    }
