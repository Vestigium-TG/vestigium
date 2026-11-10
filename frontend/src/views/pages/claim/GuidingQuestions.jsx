import useQuestionsController from "../../../controllers/useQuestionsController";
import "./stages.css";

// UC08 — Generate guiding questions.
// `key={claimId}` in the parent resets state when changing claims.
function GuidingQuestions({ claimId }) {
	const { questions, loading, generating, error, generate } =
		useQuestionsController(claimId);

	if (loading) {
		return <div className="stage-empty">Carregando perguntas...</div>;
	}

	if (generating) {
		return (
			<div className="stage-empty">
				<div className="stage-spinner" />
				<strong>Gerando perguntas orientadoras...</strong>
			</div>
		);
	}

	if (questions.length > 0) {
		return (
			<ol className="stage-questions">
				{questions.map((question, index) => (
					<li className="stage-card stage-question" key={question.id}>
						<span className="stage-number">{index + 1}</span>
						<span>{question.text}</span>
					</li>
				))}
			</ol>
		);
	}

	return (
		<div className="stage-empty">
			{error ? (
				<div className="stage-error">{error}</div>
			) : (
				<span>Ainda não há perguntas para esta afirmação.</span>
			)}
			<button type="button" className="stage-button" onClick={generate}>
				{error ? "Tentar novamente" : "Gerar perguntas"}
			</button>
		</div>
	);
}

export default GuidingQuestions;
