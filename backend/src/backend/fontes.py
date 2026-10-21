import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.afirmacoes import _obter_afirmacao_com_posse
from backend.auth import obter_usuario_id_atual
from backend.db import conectar_banco
from backend.gemini_service import (
    GeminiIndisponivelError,
    GeminiRespostaVaziaError,
    gerar_consultas,
    pesquisar_fontes,
)

router_investigacoes = APIRouter(prefix="/investigacoes", tags=["fontes"])
router_afirmacoes = APIRouter(prefix="/afirmacoes", tags=["fontes"])


class FonteCreate(BaseModel):
    url: str
    titulo: str
    conteudo: str | None = None
    tipo: str | None = None
    data_acesso: datetime | None = None


class FontesCreate(BaseModel):
    fontes: list[FonteCreate] = Field(min_length=1)


class PesquisaRequest(BaseModel):
    consulta: str | None = None


@router_afirmacoes.post("/{afirmacao_id}/consultas")
def gerar_consultas_afirmacao(
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
        consultas = gerar_consultas(afirmacao["texto"])
    except GeminiRespostaVaziaError:
        raise HTTPException(
            status_code=422, detail="Nenhuma sugestão de consulta gerada"
        )
    except GeminiIndisponivelError:
        raise HTTPException(
            status_code=503, detail="Serviço de IA indisponível no momento"
        )

    return {"afirmacao_id": afirmacao["id"], "consultas": consultas}


@router_afirmacoes.post("/{afirmacao_id}/pesquisar")
def pesquisar_fontes_afirmacao(
    afirmacao_id: uuid.UUID,
    dados: PesquisaRequest | None = None,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    conn = conectar_banco()
    cursor = conn.cursor()

    try:
        afirmacao = _obter_afirmacao_com_posse(cursor, afirmacao_id, usuario_id)
    finally:
        cursor.close()
        conn.close()

    consulta = dados.consulta.strip() if dados and dados.consulta else None

    try:
        resultados = pesquisar_fontes(afirmacao["texto"], consulta or None)
    except GeminiIndisponivelError:
        raise HTTPException(
            status_code=503,
            detail="Serviço de pesquisa de fontes indisponível no momento",
        )

    if not resultados:
        return {"mensagem": "Nenhuma fonte encontrada", "resultados": []}

    return {"mensagem": None, "resultados": resultados}


@router_investigacoes.post("/{investigacao_id}/fontes")
def registrar_fontes(
    investigacao_id: uuid.UUID,
    dados: FontesCreate,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    for fonte in dados.fontes:
        if not fonte.url.strip() or not fonte.titulo.strip():
            raise HTTPException(
                status_code=422,
                detail="url e titulo de cada fonte não podem estar vazios",
            )

    conn = conectar_banco()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT usuario_id FROM INVESTIGACAO WHERE id = %s",
        (str(investigacao_id),),
    )

    resultado = cursor.fetchone()

    if resultado is None:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Investigação não encontrada")

    if str(resultado[0]) != usuario_id:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Acesso negado")

    fontes_criadas = []

    for fonte in dados.fontes:
        fonte_id = uuid.uuid4()
        data_acesso = fonte.data_acesso

        cursor.execute(
            """
            INSERT INTO FONTE
            (id, investigacao_id, url, titulo, conteudo, tipo, data_acesso)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                str(fonte_id),
                str(investigacao_id),
                fonte.url,
                fonte.titulo,
                fonte.conteudo,
                fonte.tipo,
                data_acesso,
            ),
        )

        fontes_criadas.append(
            {
                "id": str(fonte_id),
                "investigacao_id": str(investigacao_id),
                "url": fonte.url,
                "titulo": fonte.titulo,
                "conteudo": fonte.conteudo,
                "tipo": fonte.tipo,
                "data_acesso": data_acesso,
            }
        )

    conn.commit()

    cursor.close()
    conn.close()

    return fontes_criadas


@router_investigacoes.get("/{investigacao_id}/fontes")
def listar_fontes(
    investigacao_id: uuid.UUID,
    usuario_id: str = Depends(obter_usuario_id_atual),
):
    conn = conectar_banco()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT usuario_id FROM INVESTIGACAO WHERE id = %s",
        (str(investigacao_id),),
    )

    resultado = cursor.fetchone()

    if resultado is None:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Investigação não encontrada")

    if str(resultado[0]) != usuario_id:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Acesso negado")

    cursor.execute(
        """
        SELECT id, investigacao_id, url, titulo, conteudo, tipo, data_acesso
        FROM FONTE
        WHERE investigacao_id = %s
        """,
        (str(investigacao_id),),
    )

    resultados = cursor.fetchall()

    cursor.close()
    conn.close()

    return [
        {
            "id": str(item[0]),
            "investigacao_id": str(item[1]),
            "url": item[2],
            "titulo": item[3],
            "conteudo": item[4],
            "tipo": item[5],
            "data_acesso": item[6],
        }
        for item in resultados
    ]
