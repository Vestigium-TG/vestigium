import { SparkIcon } from "../Icon";
import "./SecaoEtapa.css";

/**
 * Seção de uma etapa da investigação (título + conteúdo).
 *
 * Sem `children`, mostra um cartão reservado ("Em breve") — basta passar
 * `children` quando a etapa for implementada.
 *
 * Props: id? (âncora), titulo, selo?, ia? (ícone de IA), caso? (só informativo),
 * descricao?, children
 */
function SecaoEtapa({ id, titulo, selo, ia = false, caso, descricao, children }) {
	return (
		<section className="secao-etapa" id={id}>
			<div className="secao-etapa-heading">
				{ia && <SparkIcon className="secao-etapa-ia" size={15} />}
				<h2>{titulo}</h2>
				{selo && <span className="secao-etapa-selo">{selo}</span>}
			</div>

			{children ?? (
				<div className="secao-etapa-reservada">
					<span>{descricao}</span>
					<span className="secao-etapa-tag" title={caso}>
						Em breve
					</span>
				</div>
			)}
		</section>
	);
}

export default SecaoEtapa;
