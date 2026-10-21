import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SparkIcon } from "../../components/Icon";
import InvestigacaoShell from "../../components/InvestigacaoShell/InvestigacaoShell";
import SecaoEtapa from "../../components/SecaoEtapa/SecaoEtapa";
import useInvestigacoes from "../../hooks/useInvestigacoes";
import investigacaoService from "../../services/investigacaoService";
import { ROTAS } from "../../utils/investigacao";
import "./afirmacao.css";

// Etapas da investigação de uma afirmação. Alimenta as seções e o índice lateral.
// Ao implementar cada caso de uso, passe o conteúdo como `children` da SecaoEtapa.
const ETAPAS = [
	{
		id: "perguntas",
		titulo: "Perguntas orientadoras",
		selo: "Geradas por IA",
		ia: true,
		caso: "UC08",
		descricao: "Perguntas para guiar a sua análise desta afirmação.",
	},
	{
		id: "pesquisa",
		titulo: "Pesquisar fontes",
		caso: "UC09",
		descricao: "Sugestões de pesquisa e resultados para você escolher.",
	},
	{
		id: "fontes",
		titulo: "Fontes selecionadas",
		caso: "UC09",
		descricao: "As fontes que você escolher aparecerão aqui.",
	},
	{
		id: "evidencias",
		titulo: "Evidências",
		caso: "UC10",
		descricao: "Registre trechos das fontes que apoiam ou contradizem a afirmação.",
	},
	{
		id: "reflexao",
		titulo: "Sua reflexão",
		caso: "UC11",
		descricao: "Escreva sua análise a partir das evidências reunidas.",
	},
];

// UC07 – Investigar Afirmação
// Passo 1: apresenta a afirmação, seu contexto e a navegação entre afirmações.
function Afirmacao() {
	const navigate = useNavigate();
	const { investigacaoId, afirmacaoId } = useParams();

	const { investigacoes, carregando: carregandoLista } = useInvestigacoes();

	const [investigacao, setInvestigacao] = useState(null);
	const [afirmacao, setAfirmacao] = useState(null);
	const [carregando, setCarregando] = useState(true);
	const [erro, setErro] = useState("");

	useEffect(() => {
		carregar();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [investigacaoId, afirmacaoId]);

	async function carregar() {
		try {
			setCarregando(true);
			setErro("");

			const dados = await investigacaoService.buscarPorId(investigacaoId);
			const encontrada = (dados.afirmacoes ?? []).find(
				(a) => String(a.id) === String(afirmacaoId),
			);

			setInvestigacao(dados);

			if (!encontrada) {
				setAfirmacao(null);
				setErro("Afirmação não encontrada.");
				return;
			}

			setAfirmacao(encontrada);
		} catch (error) {
			console.error("Erro ao carregar afirmação:", error);
			setErro(
				error.response?.data?.detail ||
					"Não foi possível carregar a afirmação.",
			);
		} finally {
			setCarregando(false);
		}
	}

	const lista = investigacao?.afirmacoes ?? [];
	const indice = afirmacao
		? lista.findIndex((a) => String(a.id) === String(afirmacao.id))
		: -1;
	const anterior = indice > 0 ? lista[indice - 1] : null;
	const proxima = indice >= 0 && indice < lista.length - 1 ? lista[indice + 1] : null;

	const evidencias =
		afirmacao?.evidencias_count ?? afirmacao?.evidencias?.length ?? 0;

	function irPara(destino) {
		navigate(ROTAS.afirmacao(investigacaoId, destino.id));
	}

	function voltar() {
		navigate(ROTAS.investigacao(investigacaoId));
	}

	return (
		<InvestigacaoShell
			titulo={investigacao?.titulo || "Investigação"}
			investigacoes={investigacoes}
			selecionadaId={investigacaoId}
			carregando={carregandoLista}
			onSelecionar={(id) => navigate(ROTAS.investigacao(id))}
			onNova={() => navigate(ROTAS.novaInvestigacao)}
			rodape={
				<>
					<button
						type="button"
						className="investigacao-secondary-button"
						onClick={voltar}
					>
						← Voltar à investigação
					</button>

					{proxima && (
						<button
							type="button"
							className="investigacao-primary-button"
							onClick={() => irPara(proxima)}
						>
							Próxima afirmação →
						</button>
					)}
				</>
			}
		>
			<div className="afirmacao-main">
				{/* Navegação: sempre visível no topo da página */}
				<nav className="afirmacao-nav" aria-label="Navegação da afirmação">
					<button type="button" className="afirmacao-voltar" onClick={voltar}>
						← Voltar à investigação
					</button>

					{indice >= 0 && (
						<div className="afirmacao-paginacao">
							<button
								type="button"
								onClick={() => irPara(anterior)}
								disabled={!anterior}
								aria-label="Afirmação anterior"
							>
								‹ Anterior
							</button>
							<span>
								{indice + 1} de {lista.length}
							</span>
							<button
								type="button"
								onClick={() => irPara(proxima)}
								disabled={!proxima}
								aria-label="Próxima afirmação"
							>
								Próxima ›
							</button>
						</div>
					)}
				</nav>

				{carregando ? (
					<div className="afirmacao-estado">
						<div className="afirmacao-spinner" />
						<strong>Carregando afirmação...</strong>
					</div>
				) : erro ? (
					<div className="afirmacao-alert afirmacao-alert-error">
						<span>{erro}</span>
						<button type="button" onClick={voltar}>
							Voltar à investigação
						</button>
					</div>
				) : (
					<div className="afirmacao-layout">
						<div className="afirmacao-coluna">
							<article className="afirmacao-claim">
								<div className="afirmacao-claim-topo">
									<span className="afirmacao-kicker">
										AFIRMAÇÃO {String(indice + 1).padStart(2, "0")}
									</span>
									<span className="afirmacao-ai-badge">
										<SparkIcon size={12} />
										Identificada por IA
									</span>
								</div>

								<h1>“{afirmacao.texto}”</h1>

								<div className="afirmacao-meta">
									<span
										className={`afirmacao-status ${
											evidencias > 0 ? "afirmacao-status-ativa" : ""
										}`}
									>
										{evidencias > 0 ? "Em investigação" : "Não iniciada"}
									</span>
									<span>
										{evidencias} {evidencias === 1 ? "evidência" : "evidências"}
									</span>

									{investigacao.tipo_entrada === "url" &&
										investigacao.conteudo_original && (
											<a
												href={investigacao.conteudo_original}
												target="_blank"
												rel="noreferrer"
											>
												Abrir conteúdo original ↗
											</a>
										)}
								</div>

								{investigacao.tipo_entrada === "texto" &&
									investigacao.conteudo_original && (
										<details className="afirmacao-original">
											<summary>Ver texto original</summary>
											<p>{investigacao.conteudo_original}</p>
										</details>
									)}

								<p className="afirmacao-aviso">
									A análise é sua: o sistema apoia, mas não determina se a
									afirmação é verdadeira ou falsa.
								</p>
							</article>

							{ETAPAS.map((etapa) => (
								<SecaoEtapa
									key={etapa.id}
									id={`etapa-${etapa.id}`}
									titulo={
										etapa.id === "evidencias"
											? `${etapa.titulo} (${evidencias})`
											: etapa.titulo
									}
									selo={etapa.selo}
									ia={etapa.ia}
									caso={etapa.caso}
									descricao={etapa.descricao}
								/>
							))}
						</div>

						{/* Índice das etapas: atalhos para as seções da página */}
						<aside className="afirmacao-lateral">
							<h2 className="afirmacao-lateral-titulo">ETAPAS</h2>
							<ol className="afirmacao-etapas">
								{ETAPAS.map((etapa, i) => (
									<li key={etapa.id}>
										<a href={`#etapa-${etapa.id}`}>
											<span className="afirmacao-etapa-numero">{i + 1}</span>
											{etapa.titulo}
										</a>
									</li>
								))}
							</ol>
						</aside>
					</div>
				)}
			</div>
		</InvestigacaoShell>
	);
}

export default Afirmacao;
