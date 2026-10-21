import uuid

from fastapi import APIRouter, Depends, HTTPException

from backend.afirmacoes import _obter_afirmacao_com_posse
from backend.auth import obter_usuario_id_atual
from backend.db import conectar_banco
from backend.gemini_service import GeminiIndisponivelError, pesquisar_fontes

router_investigacoes = APIRouter(prefix="/investigacoes", tags=["fontes"])
router_afirmacoes = APIRouter(prefix="/afirmacoes", tags=["fontes"])


@router_afirmacoes.post("/{afirmacao_id}/fontes/pesquisar")
def pesquisar_fontes_afirmacao(
    afirmacao_id: uuid.UUID,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    conn = conectar_banco()
    cursor = conn.cursor()

    try:
        afirmacao = _obter_afirmacao_com_posse(cursor, afirmacao_id, usuario_id)
    finally:
        cursor.close()
        conn.close()

    try:
        resultados = pesquisar_fontes(afirmacao["texto"])
    except GeminiIndisponivelError:
        raise HTTPException(
            status_code=503,
            detail="Serviço de pesquisa de fontes indisponível no momento",
        )

    if not resultados:
        return {"mensagem": "Nenhuma fonte encontrada", "resultados": []}

    return {"mensagem": None, "resultados": resultados}
