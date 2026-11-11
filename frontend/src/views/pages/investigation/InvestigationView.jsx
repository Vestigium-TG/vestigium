import Icon from "../../components/Icon";
import InvestigationShell from "../../components/InvestigationShell/InvestigationShell";
import useConclusionController from "../../../controllers/useConclusionController";
import useInvestigationController from "../../../controllers/useInvestigationController";
import {
	formatDate,
	formatDateTime,
	formatStatus,
	statusClass,
} from "../../../utils/formatters";
import "./investigation.css";

function claimProgress(claim) {
	const count = claim?.evidence_count ?? claim?.evidence?.length ?? 0;
	if (claim?.has_reflection) {
		return 100;
	}
	return count > 0 ? 50 : 0;
}

function InvestigationView() {
	const {
		investigations,
		selectedInvestigation,
		claims,
		title,
		setTitle,
		inputType,
		setInputType,
		originalContent,
		setOriginalContent,
		status,
		isEditing,
		isCreating,
		displayedTitle,
		claimCount,
		loading,
		analyzing,
		saving,
		deleting,
		error,
		success,
		selectedClaimId,
		startNewInvestigation,
		selectInvestigation,
		startEditing,
		cancelEditing,
		runClaimIdentification,
		handleSubmit,
		handleDelete,
		selectClaim,
		markInvestigationConcluded,
	} = useInvestigationController();
	const {
		conclusion,
		text: conclusionText,
		setText: setConclusionText,
		loading: conclusionLoading,
		saving: conclusionSaving,
		error: conclusionError,
		success: conclusionSuccess,
		save: saveConclusion,
	} = useConclusionController(selectedInvestigation?.id);
	const hasCompletedClaim = claims.some((claim) =>
		claimProgress(claim) === 100,
	);

	async function handleConclusionSubmit(event) {
		event.preventDefault();
		const saved = await saveConclusion(hasCompletedClaim);
		if (saved) {
			markInvestigationConcluded();
		}
	}

	return (
		<InvestigationShell
			title={displayedTitle}
			investigations={investigations}
			selectedId={selectedInvestigation?.id}
			loading={loading}
			onSelect={selectInvestigation}
			onNew={startNewInvestigation}
			menuItems={
				isCreating
					? []
					: [
							{
								label: "Alterar investigação",
								onClick: startEditing,
							},
							{
								label: deleting
									? "Excluindo..."
									: "Excluir investigação",
								onClick: handleDelete,
								danger: true,
								disabled: deleting,
							},
						]
			}
			topActions={
				isEditing ? (
					<button
						type="submit"
						form="investigation-form"
						className="investigation-primary-button"
						disabled={saving || deleting}
					>
						{saving ? "Salvando..." : "Salvar"}
					</button>
				) : null
			}
			footer={
				<>
					<button
						type="button"
						className="investigation-secondary-button"
						onClick={startNewInvestigation}
					>
						← Voltar às investigações
					</button>

					<button
						type="submit"
						form="investigation-conclusion-form"
						className="investigation-primary-button investigation-conclusion-button"
						disabled={
							!selectedInvestigation ||
							!hasCompletedClaim ||
							conclusionLoading ||
							conclusionSaving ||
							!conclusionText.trim()
						}
					>
						{conclusionSaving
							? "Salvando..."
							: conclusion
								? "Atualizar conclusão"
								: "Salvar conclusão"}
					</button>
				</>
			}
		>
			<section className="investigation-main">
				{error && (
					<div className="investigation-alert investigation-alert-error">
						{error}
					</div>
				)}

				{success && (
					<div className="investigation-alert investigation-alert-success">
						{success}
					</div>
				)}

				<div className="investigation-section-heading">
					<div>
						<span className="investigation-section-kicker">
							CONTEÚDO ORIGINAL
						</span>
					</div>

					{!isCreating && (
						<span className="investigation-status-badge">
							<span
								className={`investigation-status-dot investigation-status-${statusClass(
									status,
								)}`}
							/>
							{formatStatus(status)}
						</span>
					)}
				</div>

				<form
					id="investigation-form"
					className="investigation-original-card"
					onSubmit={handleSubmit}
				>
					<div className="investigation-original-header">
						<div className="investigation-original-icon">
							{inputType === "url" ? "N" : "T"}
						</div>

						<div className="investigation-original-meta">
							{isCreating || isEditing ? (
								<>
									<input
										className="investigation-title-input"
										type="text"
										value={title}
										onChange={(event) =>
											setTitle(event.target.value)
										}
										placeholder="Título da investigação"
										maxLength={255}
										disabled={saving}
									/>

									{inputType === "url" ? (
										<input
											className="investigation-content-input"
											type="url"
											value={originalContent}
											onChange={(event) =>
												setOriginalContent(
													event.target.value,
												)
											}
											placeholder="https://exemplo.com/conteudo"
											disabled={saving}
										/>
									) : (
										<textarea
											className="investigation-content-textarea"
											value={originalContent}
											onChange={(event) =>
												setOriginalContent(
													event.target.value,
												)
											}
											placeholder="Cole aqui o conteúdo que será analisado..."
											rows={5}
											disabled={saving}
										/>
									)}
								</>
							) : (
								<>
									<h1>{title}</h1>

									{inputType === "url" ? (
										<a
											href={originalContent}
											className="investigation-original-url"
											target="_blank"
											rel="noreferrer"
										>
											{originalContent}
										</a>
									) : (
										<p className="investigation-original-text">
											{originalContent}
										</p>
									)}
								</>
							)}
						</div>

						<span className="investigation-entry-badge">
							{inputType.toUpperCase()}
						</span>
					</div>

					<div className="investigation-original-footer">
						{!isCreating && selectedInvestigation ? (
							<span className="investigation-created">
								<Icon size={14}>
									<rect
										x="3"
										y="4"
										width="18"
										height="17"
										rx="2"
									/>
									<path d="M16 2v4M8 2v4M3 10h18" />
								</Icon>
								Criado em{" "}
								{formatDate(
									selectedInvestigation.created_at,
								)}
							</span>
						) : (
							<div className="investigation-entry-selector">
								<button
									type="button"
									className={
										inputType === "url"
											? "investigation-entry-selector-active"
											: ""
									}
									onClick={() => {
										setInputType("url");
										setOriginalContent("");
									}}
									disabled={saving}
								>
									URL
								</button>
								<button
									type="button"
									className={
										inputType === "text"
											? "investigation-entry-selector-active"
											: ""
									}
									onClick={() => {
										setInputType("text");
										setOriginalContent("");
									}}
									disabled={saving}
								>
									Texto
								</button>
							</div>
						)}

						{inputType === "url" &&
							!isCreating &&
							!isEditing &&
							originalContent && (
								<a
									href={originalContent}
									target="_blank"
									rel="noreferrer"
									className="investigation-original-link"
								>
									Acessar fonte original
									<Icon size={14}>
										<path d="M14 5h5v5" />
										<path d="M10 14 19 5" />
										<path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
									</Icon>
								</a>
							)}
					</div>
				</form>

				{isEditing && (
					<div className="investigation-edit-actions">
						<button
							type="button"
							className="investigation-secondary-button"
							onClick={cancelEditing}
							disabled={saving || deleting}
						>
							Cancelar
						</button>

						<button
							type="submit"
							form="investigation-form"
							className="investigation-primary-button"
							disabled={saving || deleting}
						>
							{saving ? "Salvando..." : "Salvar alterações"}
						</button>
					</div>
				)}

				{isCreating && (
					<div className="investigation-start-panel">
						<div>
							<strong>Comece a investigação</strong>
							<p>
								Informe uma URL ou cole um texto. Depois de
								criar a investigação, o conteúdo será enviado
								automaticamente à IA para identificar
								afirmações potencialmente verificáveis.
							</p>
						</div>

						<button
							type="submit"
							form="investigation-form"
							className="investigation-primary-button"
							disabled={saving}
						>
							{saving ? "Processando..." : "Criar e analisar"}
						</button>
					</div>
				)}

				{!isCreating && (
					<section className="investigation-claims-section">
						<div className="investigation-section-heading">
							<span className="investigation-section-kicker">
								AFIRMAÇÕES IDENTIFICADAS ({claimCount})
							</span>

							{analyzing ? (
								<span className="investigation-text-button investigation-text-button-static">
									Analisando...
								</span>
							) : claimCount === 0 ? (
								<button
									type="button"
									className="investigation-text-button"
									onClick={() =>
										runClaimIdentification(
											selectedInvestigation.id,
											"Afirmações identificadas com sucesso.",
										)
									}
								>
									Identificar afirmações
								</button>
							) : null}
						</div>

						{analyzing ? (
							<div className="investigation-empty-card">
								<div className="investigation-spinner" />
								<strong>Analisando o conteúdo...</strong>
								<span>
									A IA está identificando afirmações
									potencialmente verificáveis.
								</span>
							</div>
						) : claimCount === 0 ? (
							<div className="investigation-empty-card">
								<div className="investigation-empty-icon">
									<Icon size={20}>
										<path d="M12 3a9 9 0 1 0 9 9" />
										<path d="M12 7v5l3 2" />
									</Icon>
								</div>
								<strong>Nenhuma afirmação disponível</strong>
								<span>
									Execute a identificação por IA para
									continuar a investigação.
								</span>
							</div>
						) : (
							<div className="investigation-claims-list">
								{claims.map((claim, index) => {
									const evidences =
										claim.evidence_count ??
										claim.evidence?.length ??
										0;
									const progress = claimProgress(claim);
									const claimStatus = claim.has_reflection
										? "Concluída"
										: evidences > 0
											? "Em andamento"
											: "Não iniciada";
									const claimStatusClass = claim.has_reflection
										? "investigation-claim-status-completed"
										: evidences > 0
											? "investigation-claim-status-in-progress"
											: "";

									return (
										<article
											key={claim.id}
											className={`investigation-claim-card ${
												selectedClaimId === claim.id
													? "investigation-claim-card-selected"
													: ""
											}`}
										>
											<div className="investigation-claim-main">
												<div className="investigation-claim-index">
													{String(index + 1).padStart(
														2,
														"0",
													)}
												</div>

												<div className="investigation-claim-body">
													<h3>{claim.text}</h3>

													<span className="investigation-ai-badge">
														Identificada por IA
													</span>

													<div className="investigation-claim-progress">
														<span
															className={`investigation-claim-status ${claimStatusClass}`}
														>
															{claimStatus}
														</span>

														<div className="investigation-progress-track">
															<span
																style={{
																	width: `${Math.max(
																		6,
																		progress,
																	)}%`,
																}}
															/>
														</div>

														<span className="investigation-evidence-count">
															{evidences}{" "}
															{evidences === 1
																? "evidência"
																: "evidências"}
														</span>
													</div>
												</div>
											</div>

											<button
												type="button"
												className="investigation-investigate-button"
												onClick={() =>
													selectClaim(claim)
												}
											>
												{selectedClaimId === claim.id
													? "Selecionada"
													: "Investigar"}
												<Icon size={15}>
													<path d="M5 12h14" />
													<path d="m13 6 6 6-6 6" />
												</Icon>
											</button>
										</article>
									);
								})}
							</div>
						)}

						{selectedClaimId && (
							<div className="investigation-selection-note">
								<strong>Afirmação selecionada.</strong>
								<span>
									O próximo passo é iniciar a investigação
									dessa afirmação.
								</span>
							</div>
						)}
					</section>
				)}

				<section className="investigation-conclusion-section">
					<div className="investigation-section-heading">
						<span className="investigation-section-kicker">
							CONCLUSÃO DA INVESTIGAÇÃO
						</span>
					</div>

					<form
						id="investigation-conclusion-form"
						className="investigation-conclusion-card"
						onSubmit={handleConclusionSubmit}
					>
						<div className="investigation-conclusion-header">
							<strong>Conclusão geral</strong>
							<span>Obrigatório</span>
						</div>

						{conclusionLoading ? (
							<div className="investigation-conclusion-placeholder">
								Carregando conclusão...
							</div>
						) : (
							<textarea
								className="investigation-conclusion-input"
								value={conclusionText}
								onChange={(event) =>
									setConclusionText(event.target.value)
								}
								placeholder="Registre a conclusão geral da investigação com base nas afirmações concluídas..."
								aria-label="Texto da conclusão"
								rows={5}
								disabled={!selectedInvestigation || conclusionSaving}
							/>
						)}

						<p>
							{hasCompletedClaim
								? "Você pode salvar ou atualizar sua conclusão usando o botão abaixo."
								: "Conclua ao menos uma afirmação (com reflexão) para habilitar o salvamento."}
						</p>
						{(conclusionError || conclusionSuccess) && (
							<div
								className={`investigation-alert ${
									conclusionError
										? "investigation-alert-error"
										: "investigation-alert-success"
								}`}
							>
								{conclusionError || conclusionSuccess}
							</div>
						)}
					</form>
				</section>

				{!loading && (
					<div className="investigation-footer-spacer">
						<span>
							Última atualização:{" "}
							{formatDateTime(
								selectedInvestigation?.updated_at,
							)}
						</span>
					</div>
				)}
			</section>
		</InvestigationShell>
	);
}

export default InvestigationView;
