import { dominio } from "../../utils/investigacao";
import "./etapas.css";

// Fontes escolhidas pelo investigador (RN07). Elas valem para toda a investigação.
function FontesSelecionadas({ fontes, carregando, erro }) {
	if (carregando) {
		return <div className="etapa-vazio">Carregando fontes...</div>;
	}

	if (erro) {
		return <div className="etapa-erro">{erro}</div>;
	}

	if (fontes.length === 0) {
		return (
			<div className="etapa-vazio">
				<strong>Nenhuma fonte selecionada</strong>
				<span>
					Pesquise acima e escolha as fontes que você considera relevantes.
				</span>
			</div>
		);
	}

	return (
		<div className="etapa-lista">
			{fontes.map((fonte) => (
				<article className="etapa-card etapa-fonte" key={fonte.id}>
					<span className="etapa-inicial">
						{(fonte.titulo || dominio(fonte.url)).charAt(0).toUpperCase()}
					</span>

					<div className="etapa-resultado-info">
						<a
							href={fonte.url}
							target="_blank"
							rel="noreferrer"
							className="etapa-link"
						>
							{fonte.titulo || dominio(fonte.url)}
						</a>
						<span className="etapa-dominio">{dominio(fonte.url)}</span>
					</div>

					{fonte.tipo === "manual" && <span className="etapa-tag">Manual</span>}
				</article>
			))}
		</div>
	);
}

export default FontesSelecionadas;
