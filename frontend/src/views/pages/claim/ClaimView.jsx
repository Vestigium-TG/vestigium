import { SparkIcon } from "../../components/Icon";
import InvestigationShell from "../../components/InvestigationShell/InvestigationShell";
import StageSection from "../../components/StageSection/StageSection";
import useClaimController from "../../../controllers/useClaimController";
import useInvestigationsController from "../../../controllers/useInvestigationsController";
import useSourcesController from "../../../controllers/useSourcesController";
import GuidingQuestions from "./GuidingQuestions";
import SelectedSources from "./SelectedSources";
import SourceSearch from "./SourceSearch";
import "./claim.css";

// Stages of a claim investigation. Feeds the sections and the side index.
// When implementing each use case, pass its content as SecaoEtapa `children`.
const STAGES = [
	{
		id: "questions",
		title: "Perguntas orientadoras",
		badge: "Geradas por IA",
		ai: true,
		useCase: "UC08",
		description: "Perguntas para guiar a sua análise desta afirmação.",
	},
	{
		id: "search",
		title: "Pesquisar fontes",
		useCase: "UC09",
		description:
			"Sugestões de pesquisa e resultados para você escolher.",
	},
	{
		id: "sources",
		title: "Fontes selecionadas",
		useCase: "UC09",
		description: "As fontes que você escolher aparecerão aqui.",
	},
	{
		id: "evidences",
		title: "Evidências",
		useCase: "UC10",
		description:
			"Registre trechos das fontes que apoiam ou contradizem a afirmação.",
	},
	{
		id: "reflection",
		title: "Sua reflexão",
		useCase: "UC11",
		description:
			"Escreva sua análise a partir das evidências reunidas.",
	},
];

// UC07 — Investigate Claim
// Step 1: presents the claim, its context and navigation between claims.
function ClaimView() {
	const {
		investigationId,
		investigation,
		claim,
		claims,
		index,
		previous,
		next,
		evidenceCount,
		loading,
		error,
		goToClaim,
		goBack,
		goToInvestigation,
		goToNewInvestigation,
	} = useClaimController();

	const { investigations, loading: investigationsLoading } =
		useInvestigationsController();

	const {
		sources,
		loading: sourcesLoading,
		error: sourcesError,
		register: registerSource,
	} = useSourcesController(investigationId);

	// UC08: GuidingQuestions uses claimModel questions endpoints.
	// UC09: SourceSearch uses claimModel search endpoints; useSourcesController loads/registers sources.
	// Content for each stage. A stage without content (undefined) shows the "Em breve" card.
	function contentForStage(stageId) {
		if (!claim) {
			return undefined;
		}

		switch (stageId) {
			case "questions":
				return <GuidingQuestions key={claim.id} claimId={claim.id} />;
			case "search":
				return (
					<SourceSearch
						key={claim.id}
						claimId={claim.id}
						sources={sources}
						onSelect={registerSource}
					/>
				);
			case "sources":
				return (
					<SelectedSources
						sources={sources}
						loading={sourcesLoading}
						error={sourcesError}
					/>
				);
			default:
				return undefined;
		}
	}

	function stageTitle(stage) {
		if (stage.id === "evidences") {
			return `${stage.title} (${evidenceCount})`;
		}
		if (stage.id === "sources") {
			return `${stage.title} (${sources.length})`;
		}
		return stage.title;
	}

	return (
		<InvestigationShell
			title={investigation?.title || "Investigação"}
			investigations={investigations}
			selectedId={investigationId}
			loading={investigationsLoading}
			onSelect={goToInvestigation}
			onNew={goToNewInvestigation}
			footer={
				<>
					<button
						type="button"
						className="investigation-secondary-button"
						onClick={goBack}
					>
						← Voltar à investigação
					</button>

					{next && (
						<button
							type="button"
							className="investigation-primary-button"
							onClick={() => goToClaim(next)}
						>
							Próxima afirmação →
						</button>
					)}
				</>
			}
		>
			<div className="claim-main">
				{/* Navigation: always visible at the top of the page */}
				<nav className="claim-nav" aria-label="Navegação da afirmação">
					<button
						type="button"
						className="claim-back"
						onClick={goBack}
					>
						← Voltar à investigação
					</button>

					{index >= 0 && (
						<div className="claim-pagination">
							<button
								type="button"
								onClick={() => goToClaim(previous)}
								disabled={!previous}
								aria-label="Afirmação anterior"
							>
								‹ Anterior
							</button>
							<span>
								{index + 1} de {claims.length}
							</span>
							<button
								type="button"
								onClick={() => goToClaim(next)}
								disabled={!next}
								aria-label="Próxima afirmação"
							>
								Próxima ›
							</button>
						</div>
					)}
				</nav>

				{loading ? (
					<div className="claim-state">
						<div className="claim-spinner" />
						<strong>Carregando afirmação...</strong>
					</div>
				) : error ? (
					<div className="claim-alert claim-alert-error">
						<span>{error}</span>
						<button type="button" onClick={goBack}>
							Voltar à investigação
						</button>
					</div>
				) : (
					<div className="claim-layout">
						<div className="claim-column">
							<article className="claim-card">
								<div className="claim-card-top">
									<span className="claim-kicker">
										AFIRMAÇÃO{" "}
										{String(index + 1).padStart(2, "0")}
									</span>
									<span className="claim-ai-badge">
										<SparkIcon size={12} />
										Identificada por IA
									</span>
								</div>

								<h1>“{claim.text}”</h1>

								<div className="claim-meta">
									<span
										className={`claim-status ${
											evidenceCount > 0
												? "claim-status-active"
												: ""
										}`}
									>
										{evidenceCount > 0
											? "Em investigação"
											: "Não iniciada"}
									</span>
									<span>
										{evidenceCount}{" "}
										{evidenceCount === 1
											? "evidência"
											: "evidências"}
									</span>

									{investigation.input_type === "url" &&
										investigation.original_content && (
											<a
												href={
													investigation.original_content
												}
												target="_blank"
												rel="noreferrer"
											>
												Abrir conteúdo original ↗
											</a>
										)}
								</div>

								{investigation.input_type === "text" &&
									investigation.original_content && (
										<details className="claim-original">
											<summary>Ver texto original</summary>
											<p>
												{investigation.original_content}
											</p>
										</details>
									)}

								<p className="claim-notice">
									A análise é sua: o sistema apoia, mas não
									determina se a afirmação é verdadeira ou
									falsa.
								</p>
							</article>

							{STAGES.map((stage) => (
								<StageSection
									key={stage.id}
									id={`stage-${stage.id}`}
									title={stageTitle(stage)}
									badge={stage.badge}
									ai={stage.ai}
									useCase={stage.useCase}
									description={stage.description}
								>
									{contentForStage(stage.id)}
								</StageSection>
							))}
						</div>

						{/* Stage index: shortcuts to the page sections */}
						<aside className="claim-sidebar">
							<h2 className="claim-sidebar-title">ETAPAS</h2>
							<ol className="claim-stages">
								{STAGES.map((stage, stageIndex) => (
									<li key={stage.id}>
										<a href={`#stage-${stage.id}`}>
											<span className="claim-stage-number">
												{stageIndex + 1}
											</span>
											{stage.title}
										</a>
									</li>
								))}
							</ol>
						</aside>
					</div>
				)}
			</div>
		</InvestigationShell>
	);
}

export default ClaimView;
