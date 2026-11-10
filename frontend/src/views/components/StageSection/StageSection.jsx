import { SparkIcon } from "../Icon";
import "./StageSection.css";

/**
 * Section for one investigation stage (title + content).
 *
 * Without `children`, it shows a reserved card ("Em breve") — just pass
 * `children` when the stage is implemented.
 *
 * Props: id? (anchor), title, badge?, ai? (AI icon), useCase? (informational),
 * description?, children
 */
function StageSection({
	id,
	title,
	badge,
	ai = false,
	useCase,
	description,
	children,
}) {
	return (
		<section className="stage-section" id={id}>
			<div className="stage-section-heading">
				{ai && <SparkIcon className="stage-section-ai" size={15} />}
				<h2>{title}</h2>
				{badge && <span className="stage-section-badge">{badge}</span>}
			</div>

			{children ?? (
				<div className="stage-section-placeholder">
					<span>{description}</span>
					<span className="stage-section-tag" title={useCase}>
						Em breve
					</span>
				</div>
			)}
		</section>
	);
}

export default StageSection;
