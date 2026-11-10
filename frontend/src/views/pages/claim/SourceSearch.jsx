import { SparkIcon } from "../../components/Icon";
import useSourceSearchController from "../../../controllers/useSourceSearchController";
import { getDomain } from "../../../utils/formatters";
import "./stages.css";

// UC09 — Search sources.
// Props: claimId, sources (already registered), onSelect(source) -> Promise
// `key={claimId}` in the parent resets state when changing claims.
function SourceSearch({ claimId, sources, onSelect }) {
	const {
		queries,
		generatingQueries,
		activeQuery,
		results,
		searchPerformed,
		searching,
		manualUrl,
		setManualUrl,
		manualTitle,
		setManualTitle,
		saving,
		error,
		isSelected,
		suggestQueries,
		search,
		selectResult,
		addManual,
	} = useSourceSearchController({ claimId, sources, onSelect });

	return (
		<div className="stage-block">
			{error && <div className="stage-error">{error}</div>}

			{/* Search suggestions (RF12) */}
			<div className="stage-card">
				<div className="stage-card-top">
					<span className="stage-ai">
						<SparkIcon size={14} />
						Sugestões da IA
					</span>

					<button
						type="button"
						className="stage-button-text"
						onClick={suggestQueries}
						disabled={generatingQueries}
					>
						{generatingQueries
							? "Gerando..."
							: queries.length
								? "Gerar outras"
								: "Sugerir pesquisas"}
					</button>
				</div>

				{queries.length > 0 ? (
					<ul className="stage-chips">
						{queries.map((query) => (
							<li key={query}>
								<button
									type="button"
									className={`stage-chip ${
										query === activeQuery
											? "stage-chip-active"
											: ""
									}`}
									onClick={() => search(query)}
									disabled={searching}
								>
									{query}
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="stage-hint">
						Peça sugestões de termos de busca ou pesquise direto
						pela afirmação.
					</p>
				)}

				<div className="stage-actions">
					<button
						type="button"
						className="stage-button stage-button-primary"
						onClick={() => search()}
						disabled={searching}
					>
						{searching ? "Pesquisando..." : "Pesquisar fontes"}
					</button>
				</div>
			</div>

			{/* Results (step 4) */}
			{searching ? (
				<div className="stage-empty">
					<div className="stage-spinner" />
					<strong>Buscando fontes relacionadas...</strong>
				</div>
			) : searchPerformed && results.length === 0 ? (
				<div className="stage-empty">
					<strong>Nenhuma fonte relevante encontrada</strong>
					<span>
						A pesquisa não retornou resultados satisfatórios. Tente
						outra sugestão ou adicione uma fonte manualmente.
					</span>
				</div>
			) : results.length > 0 ? (
				<div className="stage-results">
					<h3 className="stage-subtitle">
						Resultados encontrados
						{activeQuery && <span> · “{activeQuery}”</span>}
					</h3>

					{results.map((result) => {
						const selected = isSelected(result.url);

						return (
							<article
								key={result.url}
								className={`stage-card stage-result ${
									selected ? "stage-card-active" : ""
								}`}
							>
								<div className="stage-result-top">
									<div className="stage-result-info">
										<a
											href={result.url}
											target="_blank"
											rel="noreferrer"
											className="stage-link"
										>
											{result.title ||
												getDomain(result.url)}
										</a>
										<span className="stage-domain">
											{getDomain(result.url)}
										</span>
									</div>

									{selected ? (
										<span className="stage-selected">
											✓ Selecionada
										</span>
									) : (
										<button
											type="button"
											className="stage-button"
											onClick={() =>
												selectResult(result)
											}
											disabled={saving}
										>
											Selecionar como fonte
										</button>
									)}
								</div>

								{result.excerpt && (
									<p className="stage-excerpt">
										{result.excerpt}
									</p>
								)}
							</article>
						);
					})}
				</div>
			) : null}

			{/* Add a source manually */}
			<form className="stage-card stage-manual" onSubmit={addManual}>
				<strong>Adicionar fonte manualmente</strong>
				<div className="stage-manual-fields">
					<input
						type="url"
						className="stage-input stage-input-url"
						placeholder="Cole a URL da fonte..."
						value={manualUrl}
						onChange={(event) => setManualUrl(event.target.value)}
						disabled={saving}
					/>
					<input
						type="text"
						className="stage-input"
						placeholder="Título (opcional)"
						value={manualTitle}
						onChange={(event) => setManualTitle(event.target.value)}
						disabled={saving}
					/>
					<button
						type="submit"
						className="stage-button stage-button-primary"
						disabled={saving || !manualUrl.trim()}
					>
						+ Adicionar
					</button>
				</div>
			</form>
		</div>
	);
}

export default SourceSearch;
