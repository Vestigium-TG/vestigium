import { useState } from "react";
import { SparkIcon } from "../../components/Icon";
import afirmacaoService from "../../services/afirmacaoService";
import { dominio } from "../../utils/investigacao";
import "./etapas.css";

function mensagemDeErro(error, padrao) {
	const detalhe = error.response?.data?.detail;

	if (error.response?.status === 503) {
		return detalhe || "O serviço está indisponível no momento.";
	}
	return detalhe || padrao;
}

// O backend pode nomear os campos de formas diferentes; normaliza aqui.
function normalizarResultado(item) {
	return {
		url: item.url ?? item.link ?? "",
		titulo: item.titulo ?? item.title ?? "",
		trecho: item.trecho ?? item.snippet ?? item.resumo ?? item.conteudo ?? "",
	};
}

function textoDaConsulta(item) {
	return typeof item === "string" ? item : (item.texto ?? item.consulta ?? "");
}

// UC09 – Pesquisar Fontes
// Props: afirmacaoId, fontes (já registradas), onSelecionar(dadosDaFonte) -> Promise
// Use `key={afirmacaoId}` no pai para reiniciar o estado ao trocar de afirmação.
function PesquisaFontes({ afirmacaoId, fontes, onSelecionar }) {
	const [consultas, setConsultas] = useState([]);
	const [gerandoConsultas, setGerandoConsultas] = useState(false);
	const [consultaAtiva, setConsultaAtiva] = useState("");

	const [resultados, setResultados] = useState([]);
	const [buscaFeita, setBuscaFeita] = useState(false);
	const [pesquisando, setPesquisando] = useState(false);

	const [urlManual, setUrlManual] = useState("");
	const [tituloManual, setTituloManual] = useState("");
	const [salvando, setSalvando] = useState(false);

	const [erro, setErro] = useState("");

	function jaSelecionada(url) {
		return fontes.some((fonte) => fonte.url === url);
	}

	async function sugerirConsultas() {
		try {
			setGerandoConsultas(true);
			setErro("");
			const lista = await afirmacaoService.gerarConsultas(afirmacaoId);
			setConsultas((lista ?? []).map(textoDaConsulta).filter(Boolean));
		} catch (error) {
			console.error("Erro ao gerar sugestões de pesquisa:", error);
			setErro(
				mensagemDeErro(error, "Não foi possível gerar sugestões de pesquisa."),
			);
		} finally {
			setGerandoConsultas(false);
		}
	}

	async function pesquisar(consulta) {
		try {
			setPesquisando(true);
			setErro("");
			setConsultaAtiva(consulta ?? "");

			const lista = await afirmacaoService.pesquisarFontes(
				afirmacaoId,
				consulta,
			);
			setResultados((lista ?? []).map(normalizarResultado).filter((r) => r.url));
			setBuscaFeita(true);
		} catch (error) {
			console.error("Erro ao pesquisar fontes:", error);
			setResultados([]);
			setBuscaFeita(false);
			setErro(
				mensagemDeErro(
					error,
					"Não foi possível pesquisar fontes. Tente novamente.",
				),
			);
		} finally {
			setPesquisando(false);
		}
	}

	async function selecionar(dados) {
		try {
			setSalvando(true);
			setErro("");
			await onSelecionar(dados);
			return true;
		} catch (error) {
			console.error("Erro ao registrar fonte:", error);
			setErro(mensagemDeErro(error, "Não foi possível registrar a fonte."));
			return false;
		} finally {
			setSalvando(false);
		}
	}

	function selecionarResultado(resultado) {
		return selecionar({
			url: resultado.url,
			titulo: resultado.titulo || dominio(resultado.url),
			conteudo: resultado.trecho,
			tipo: "pesquisa",
		});
	}

	async function adicionarManual(event) {
		event.preventDefault();

		const url = urlManual.trim();
		if (!/^https?:\/\/\S+/i.test(url)) {
			setErro("Informe uma URL válida, começando com http:// ou https://.");
			return;
		}

		const ok = await selecionar({
			url,
			titulo: tituloManual.trim() || dominio(url),
			tipo: "manual",
		});

		if (ok) {
			setUrlManual("");
			setTituloManual("");
		}
	}

	return (
		<div className="etapa-bloco">
			{erro && <div className="etapa-erro">{erro}</div>}

			{/* Sugestões de pesquisa (RF12) */}
			<div className="etapa-card">
				<div className="etapa-card-topo">
					<span className="etapa-ia">
						<SparkIcon size={14} />
						Sugestões da IA
					</span>

					<button
						type="button"
						className="etapa-botao-texto"
						onClick={sugerirConsultas}
						disabled={gerandoConsultas}
					>
						{gerandoConsultas
							? "Gerando..."
							: consultas.length
								? "Gerar outras"
								: "Sugerir pesquisas"}
					</button>
				</div>

				{consultas.length > 0 ? (
					<ul className="etapa-chips">
						{consultas.map((consulta) => (
							<li key={consulta}>
								<button
									type="button"
									className={`etapa-chip ${
										consulta === consultaAtiva ? "etapa-chip-ativo" : ""
									}`}
									onClick={() => pesquisar(consulta)}
									disabled={pesquisando}
								>
									{consulta}
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="etapa-dica">
						Peça sugestões de termos de busca ou pesquise direto pela afirmação.
					</p>
				)}

				<div className="etapa-acoes">
					<button
						type="button"
						className="etapa-botao etapa-botao-primario"
						onClick={() => pesquisar()}
						disabled={pesquisando}
					>
						{pesquisando ? "Pesquisando..." : "Pesquisar fontes"}
					</button>
				</div>
			</div>

			{/* Resultados (passo 4) */}
			{pesquisando ? (
				<div className="etapa-vazio">
					<div className="etapa-spinner" />
					<strong>Buscando fontes relacionadas...</strong>
				</div>
			) : buscaFeita && resultados.length === 0 ? (
				<div className="etapa-vazio">
					<strong>Nenhuma fonte relevante encontrada</strong>
					<span>
						A pesquisa não retornou resultados satisfatórios. Tente outra
						sugestão ou adicione uma fonte manualmente.
					</span>
				</div>
			) : resultados.length > 0 ? (
				<div className="etapa-resultados">
					<h3 className="etapa-subtitulo">
						Resultados encontrados
						{consultaAtiva && <span> · “{consultaAtiva}”</span>}
					</h3>

					{resultados.map((resultado) => {
						const selecionada = jaSelecionada(resultado.url);

						return (
							<article
								key={resultado.url}
								className={`etapa-card etapa-resultado ${
									selecionada ? "etapa-card-ativo" : ""
								}`}
							>
								<div className="etapa-resultado-topo">
									<div className="etapa-resultado-info">
										<a
											href={resultado.url}
											target="_blank"
											rel="noreferrer"
											className="etapa-link"
										>
											{resultado.titulo || dominio(resultado.url)}
										</a>
										<span className="etapa-dominio">{dominio(resultado.url)}</span>
									</div>

									{selecionada ? (
										<span className="etapa-selecionada">✓ Selecionada</span>
									) : (
										<button
											type="button"
											className="etapa-botao"
											onClick={() => selecionarResultado(resultado)}
											disabled={salvando}
										>
											Selecionar como fonte
										</button>
									)}
								</div>

								{resultado.trecho && (
									<p className="etapa-trecho">{resultado.trecho}</p>
								)}
							</article>
						);
					})}
				</div>
			) : null}

			{/* Adicionar fonte manualmente */}
			<form className="etapa-card etapa-manual" onSubmit={adicionarManual}>
				<strong>Adicionar fonte manualmente</strong>
				<div className="etapa-manual-campos">
					<input
						type="url"
						className="etapa-input etapa-input-url"
						placeholder="Cole a URL da fonte..."
						value={urlManual}
						onChange={(e) => setUrlManual(e.target.value)}
						disabled={salvando}
					/>
					<input
						type="text"
						className="etapa-input"
						placeholder="Título (opcional)"
						value={tituloManual}
						onChange={(e) => setTituloManual(e.target.value)}
						disabled={salvando}
					/>
					<button
						type="submit"
						className="etapa-botao etapa-botao-primario"
						disabled={salvando || !urlManual.trim()}
					>
						+ Adicionar
					</button>
				</div>
			</form>
		</div>
	);
}

export default PesquisaFontes;
