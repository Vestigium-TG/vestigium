import { useState } from "react";
import "./stages.css";

function EvidenceSection({
	sources,
	sourcesLoading,
	sourcesError,
	evidences,
	loading,
	error,
	saving,
	deletingEvidenceId,
	onRegister,
	onDelete,
}) {
	const [selectedSourceId, setSelectedSourceId] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [description, setDescription] = useState("");
	const [formError, setFormError] = useState("");

	async function handleSubmit(event) {
		event.preventDefault();

		if (!selectedSourceId || !excerpt.trim() || !description.trim()) {
			setFormError("Selecione uma fonte e preencha o trecho e a descrição.");
			return;
		}

		setFormError("");
		const created = await onRegister({
			source_id: selectedSourceId,
			excerpt: excerpt.trim(),
			description: description.trim(),
		});

		if (created) {
			setSelectedSourceId("");
			setExcerpt("");
			setDescription("");
		}
	}

	return (
		<div className="stage-block">
			<form className="stage-card stage-manual" onSubmit={handleSubmit}>
				<strong>Adicionar evidência</strong>
				<div className="stage-manual-fields">
					<select
						className="stage-input"
						value={selectedSourceId}
						onChange={(event) =>
							setSelectedSourceId(event.target.value)
						}
						disabled={
							saving || sourcesLoading || sources.length === 0
						}
						aria-label="Fonte da evidência"
					>
						<option value="">Escolha a fonte</option>
						{sources.map((source) => (
							<option key={source.id} value={source.id}>
								{source.title || source.url}
							</option>
						))}
					</select>
					<textarea
						className="stage-input"
						value={excerpt}
						onChange={(event) => setExcerpt(event.target.value)}
						placeholder="Trecho da fonte"
						aria-label="Trecho da fonte"
						rows={3}
						disabled={saving}
					/>
					<textarea
						className="stage-input"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="Descrição da evidência"
						aria-label="Descrição da evidência"
						rows={3}
						disabled={saving}
					/>
					<button
						type="submit"
						className="stage-button stage-button-primary"
						disabled={
							saving ||
							!selectedSourceId ||
							!excerpt.trim() ||
							!description.trim()
						}
					>
						{saving ? "Adicionando..." : "+ Adicionar"}
					</button>
				</div>
				{sources.length === 0 && !sourcesLoading && (
					<p className="stage-hint">
						Selecione uma fonte antes de registrar uma evidência.
					</p>
				)}
			</form>

			{sourcesError && (
				<div className="stage-error">{sourcesError}</div>
			)}
			{(formError || error) && (
				<div className="stage-error">{formError || error}</div>
			)}

			{loading ? (
				<div className="stage-empty">Carregando evidências...</div>
			) : evidences.length === 0 ? (
				<div className="stage-empty">
					<strong>Nenhuma evidência registrada</strong>
					<span>
						Escolha uma fonte e registre um trecho relevante para
						esta afirmação.
					</span>
				</div>
			) : (
				<div className="stage-list">
					{evidences.map((evidence) => {
						const source = sources.find(
							(item) =>
								String(item.id) === String(evidence.source_id),
						);

						return (
							<article
								className="stage-card stage-result"
								key={evidence.id}
							>
								<div className="stage-result-top">
									<div className="stage-result-info">
										<strong>
											{source?.title ||
												"Fonte selecionada"}
										</strong>
										{source?.url && (
											<a
												href={source.url}
												target="_blank"
												rel="noreferrer"
												className="stage-domain"
											>
												{source.url}
											</a>
										)}
									</div>
									<button
										type="button"
										className="stage-button"
										onClick={() => onDelete(evidence.id)}
										disabled={
											deletingEvidenceId === evidence.id
										}
									>
										{deletingEvidenceId === evidence.id
											? "Removendo..."
											: "Remover"}
									</button>
								</div>
								{evidence.excerpt && (
									<p className="stage-excerpt">
										{evidence.excerpt}
									</p>
								)}
								<p className="stage-excerpt">
									{evidence.description}
								</p>
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default EvidenceSection;
