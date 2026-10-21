import json
import os

from google import genai
from google.genai import errors as genai_errors

_MODELO = "gemini-2.5-flash"

_cliente: genai.Client | None = None


class GeminiIndisponivelError(Exception):
    pass


class GeminiRespostaVaziaError(Exception):
    pass


def _obter_cliente() -> genai.Client:
    global _cliente

    if _cliente is None:
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise GeminiIndisponivelError("GEMINI_API_KEY não configurada")

        _cliente = genai.Client(api_key=api_key)

    return _cliente


def _gerar_lista_json(prompt: str) -> list[str]:
    cliente = _obter_cliente()

    try:
        resposta = cliente.models.generate_content(
            model=_MODELO,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                },
            },
        )
    except (genai_errors.ServerError, genai_errors.APIError) as erro:
        raise GeminiIndisponivelError(str(erro)) from erro
    except Exception as erro:
        raise GeminiIndisponivelError(str(erro)) from erro

    texto = (resposta.text or "").strip()

    if not texto:
        raise GeminiRespostaVaziaError("Gemini retornou resposta vazia")

    try:
        itens = json.loads(texto)
    except json.JSONDecodeError as erro:
        raise GeminiRespostaVaziaError("Gemini retornou resposta em formato inválido") from erro

    itens = [item.strip() for item in itens if isinstance(item, str) and item.strip()]

    if not itens:
        raise GeminiRespostaVaziaError("Gemini não retornou nenhum item")

    return itens


def identificar_afirmacoes(conteudo: str) -> list[str]:
    prompt = (
        "Você é um assistente de checagem de fatos. Leia o conteúdo abaixo e "
        "identifique as afirmações factuais que podem ser verificadas "
        "(potencialmente verificáveis). Retorne APENAS um array JSON de "
        "strings, uma string por afirmação, sem comentários adicionais.\n\n"
        f"Conteúdo:\n{conteudo}"
    )

    return _gerar_lista_json(prompt)


def gerar_perguntas(texto_afirmacao: str) -> list[str]:
    prompt = (
        "Você é um assistente de checagem de fatos. Para a afirmação abaixo, "
        "gere perguntas orientadoras que ajudem uma pessoa a investigar e "
        "analisar criticamente essa afirmação. Retorne APENAS um array JSON "
        "de strings, uma string por pergunta, sem comentários adicionais.\n\n"
        f"Afirmação:\n{texto_afirmacao}"
    )

    return _gerar_lista_json(prompt)


def gerar_consultas(texto_afirmacao: str) -> list[str]:
    prompt = (
        "Você é um assistente de checagem de fatos. Para a afirmação abaixo, "
        "sugira termos de busca (consultas para um mecanismo de pesquisa na "
        "web) que ajudem a encontrar fontes para verificá-la. Retorne APENAS "
        "um array JSON de strings, uma string por consulta, sem comentários "
        "adicionais.\n\n"
        f"Afirmação:\n{texto_afirmacao}"
    )

    return _gerar_lista_json(prompt)


def pesquisar_fontes(texto_afirmacao: str, consulta: str | None = None) -> list[dict]:
    cliente = _obter_cliente()

    prompt = (
        "Você é um assistente de checagem de fatos. Pesquise na web fontes "
        "confiáveis que ajudem a verificar a afirmação abaixo, tanto fontes "
        "que a confirmem quanto fontes que a contestem. Resuma brevemente o "
        "que cada fonte diz sobre a afirmação.\n\n"
        f"Afirmação:\n{texto_afirmacao}"
    )

    if consulta:
        prompt += f"\n\nUse como termo de busca:\n{consulta}"

    try:
        resposta = cliente.models.generate_content(
            model=_MODELO,
            contents=prompt,
            config={"tools": [{"google_search": {}}]},
        )
    except Exception as erro:
        raise GeminiIndisponivelError(str(erro)) from erro

    candidatos = resposta.candidates or []
    metadados = candidatos[0].grounding_metadata if candidatos else None

    if metadados is None or not metadados.grounding_chunks:
        return []

    trechos_por_chunk: dict[int, list[str]] = {}

    for suporte in metadados.grounding_supports or []:
        texto = (suporte.segment.text or "").strip() if suporte.segment else ""

        if not texto:
            continue

        for indice in suporte.grounding_chunk_indices or []:
            trechos_por_chunk.setdefault(indice, []).append(texto)

    resultados = []
    urls_vistas = set()

    for indice, chunk in enumerate(metadados.grounding_chunks):
        web = chunk.web

        if web is None or not web.uri or web.uri in urls_vistas:
            continue

        urls_vistas.add(web.uri)

        resultados.append(
            {
                "titulo": web.title or web.domain or web.uri,
                "url": web.uri,
                "trecho": " ".join(trechos_por_chunk.get(indice, [])) or None,
            }
        )

    return resultados
