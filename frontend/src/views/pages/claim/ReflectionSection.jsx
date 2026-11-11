import { useState } from "react";
import "./stages.css";

function ReflectionSection({
	reflections,
	loading,
	error,
	saving,
	deletingReflectionId,
	onRegister,
	onDelete,
}) {
	const [text, setText] = useState("");
	const [formError, setFormError] = useState("");

	async function handleSubmit(event) {
		event.preventDefault();
		const reflectionText = text.trim();

		if (!reflectionText) {
			setFormError("Escreva sua reflexão antes de adicionar.");
			return;
		}

		setFormError("");
		const created = await onRegister(reflectionText);
		if (created) {
			setText("");
		}
	}

	if (loading) {
		return <div className="stage-empty">Carregando reflexão...</div>;
	}

	return (
		<div className="stage-block">
			{reflections.length > 0 ? (
				<div className="stage-list">
					{reflections.map((reflection) => (
						<article
							className="stage-card stage-result"
							key={reflection.id}
						>
							<div className="stage-result-top">
								<strong>Sua reflexão</strong>
								<button
									type="button"
									className="stage-button"
									onClick={() => onDelete(reflection.id)}
									disabled={
										deletingReflectionId === reflection.id
									}
								>
									{deletingReflectionId === reflection.id
										? "Removendo..."
										: "Remover"}
								</button>
							</div>
							<p className="stage-excerpt">{reflection.text}</p>
						</article>
					))}
				</div>
			) : (
				<form className="stage-card stage-manual" onSubmit={handleSubmit}>
					<strong>Sua reflexão</strong>
					<textarea
						className="stage-input"
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Escreva sua análise a partir das evidências reunidas..."
						aria-label="Texto da reflexão"
						rows={5}
						disabled={saving}
					/>
					<div className="stage-actions">
						<button
							type="submit"
							className="stage-button stage-button-primary"
							disabled={saving || !text.trim()}
						>
							{saving ? "Adicionando..." : "+ Adicionar"}
						</button>
					</div>
				</form>
			)}

			{(formError || error) && (
				<div className="stage-error">{formError || error}</div>
			)}
		</div>
	);
}

export default ReflectionSection;
