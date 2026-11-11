import { SparkIcon } from "../../components/Icon";
import "./stages.css";

const CATEGORIES = [
	{ key: "gaps", title: "Lacunas" },
	{ key: "contradictions", title: "Contradições" },
	{ key: "complements", title: "Complementos" },
];

function citationFor(item, evidences, sources) {
	const citations = [];

	if (item.evidence_id) {
		const evidence = evidences.find(
			(entry) => String(entry.id) === String(item.evidence_id),
		);
		if (evidence) {
			citations.push({
				key: `evidence-${evidence.id}`,
				label: `Evidência: ${evidence.excerpt || evidence.description}`,
			});
		} else {
			citations.push({
				key: `evidence-${item.evidence_id}`,
				label: `Evidência (${item.evidence_id})`,
			});
		}
	}

	if (item.source_id) {
		const source = sources.find(
			(entry) => String(entry.id) === String(item.source_id),
		);
		if (source) {
			citations.push({
				key: `source-${source.id}`,
				label: `Fonte: ${source.title || source.url}`,
				url: source.url,
			});
		} else {
			citations.push({
				key: `source-${item.source_id}`,
				label: `Fonte (${item.source_id})`,
			});
		}
	}

	return citations;
}

function ClaimReviewSection({
	claimId,
	evidences,
	sources,
	review,
	loading,
	error,
	onAnalyze,
}) {
	const hasReview = Boolean(review);
	const hasItems = CATEGORIES.some(
		({ key }) => (review?.[key] ?? []).length > 0,
	);

	return (
		<div className="stage-block">
			<div className="stage-card">
				<div className="stage-card-top">
					<span className="stage-ai">
						<SparkIcon size={14} />
						Análise da IA
					</span>
				</div>
				<p className="stage-hint">
					A IA pode apontar lacunas, contradições e aspectos
					complementares nas fontes e evidências. A análise não
					determina se a afirmação é verdadeira ou falsa.
				</p>
				<div className="stage-actions">
					<button
						type="button"
						className="stage-button stage-button-primary"
						onClick={onAnalyze}
						disabled={loading || !claimId}
					>
						{loading
							? "Analisando..."
							: hasReview
								? "Analisar novamente"
								: "Analisar afirmação"}
					</button>
				</div>
			</div>

			{error && <div className="stage-error">{error}</div>}

			{loading && (
				<div className="stage-empty">
					<div className="stage-spinner" />
					<strong>Analisando fontes e evidências...</strong>
				</div>
			)}

			{hasReview && !loading && !hasItems && (
				<div className="stage-empty">
					<strong>Nenhum apontamento foi gerado</strong>
					<span>
						Não foram identificadas lacunas, contradições ou
						complementos com referências válidas.
					</span>
				</div>
			)}

			{hasReview &&
				!loading &&
				CATEGORIES.map(({ key, title }) => {
					const items = review[key] ?? [];
					if (items.length === 0) return null;

					return (
						<section className="stage-results" key={key}>
							<h3 className="stage-subtitle">{title}</h3>
							{items.map((item, index) => {
								const citations = citationFor(
									item,
									evidences,
									sources,
								);

								return (
									<article
										className="stage-card"
										key={`${key}-${item.evidence_id || ""}-${item.source_id || ""}-${index}`}
									>
										<p className="stage-excerpt">
											{item.text}
										</p>
										{citations.length > 0 && (
											<ul className="stage-review-citations">
												{citations.map((citation) => (
													<li key={citation.key}>
														{citation.url ? (
															<a
																href={citation.url}
																target="_blank"
																rel="noreferrer"
															>
																{citation.label}
															</a>
														) : (
															citation.label
														)}
													</li>
												))}
											</ul>
										)}
									</article>
								);
							})}
						</section>
					);
				})}
		</div>
	);
}

export default ClaimReviewSection;
