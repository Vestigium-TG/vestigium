import { getDomain } from "../../../utils/formatters";
import "./stages.css";

// Sources chosen by the investigator (RN07). They apply to the whole investigation.
function SelectedSources({ sources, loading, error }) {
	if (loading) {
		return <div className="stage-empty">Carregando fontes...</div>;
	}

	if (error) {
		return <div className="stage-error">{error}</div>;
	}

	if (sources.length === 0) {
		return (
			<div className="stage-empty">
				<strong>Nenhuma fonte selecionada</strong>
				<span>
					Pesquise acima e escolha as fontes que você considera
					relevantes.
				</span>
			</div>
		);
	}

	return (
		<div className="stage-list">
			{sources.map((source) => (
				<article className="stage-card stage-source" key={source.id}>
					<span className="stage-initial">
						{(source.title || getDomain(source.url))
							.charAt(0)
							.toUpperCase()}
					</span>

					<div className="stage-result-info">
						<a
							href={source.url}
							target="_blank"
							rel="noreferrer"
							className="stage-link"
						>
							{source.title || getDomain(source.url)}
						</a>
						<span className="stage-domain">
							{getDomain(source.url)}
						</span>
					</div>

					{source.type === "manual" && (
						<span className="stage-tag">Manual</span>
					)}
				</article>
			))}
		</div>
	);
}

export default SelectedSources;
