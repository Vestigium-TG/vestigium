import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import investigacaoService from "../../services/investigacaoService";
import "./investigacao.css";

function formatarData(data) {
	if (!data) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "medium",
	}).format(new Date(data));
}

function formatarDataHora(data) {
	if (!data) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(data));
}

function formatarStatus(status) {
	switch (status) {
		case "em_andamento":
			return "Em andamento";
		case "concluida":
			return "Concluída";
		case "cancelada":
			return "Cancelada";
		default:
			return status || "-";
	}
}

function Icon({ children, size = 16, className = "" }) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

function Investigacao() {
	const navigate = useNavigate();

	const [investigacoes, setInvestigacoes] = useState([]);
	const [investigacaoSelecionada, setInvestigacaoSelecionada] =
		useState(null);
	const [afirmacoes, setAfirmacoes] = useState([]);

	const [titulo, setTitulo] = useState("");
	const [tipoEntrada, setTipoEntrada] = useState("url");
	const [conteudoOriginal, setConteudoOriginal] = useState("");
	const [status, setStatus] = useState("em_andamento");

	const [modo, setModo] = useState("nova");
	const [menuAberto, setMenuAberto] = useState(false);

	const [carregando, setCarregando] = useState(true);
	const [analisando, setAnalisando] = useState(false);
	const [salvando, setSalvando] = useState(false);
	const [excluindo, setExcluindo] = useState(false);
	const [erro, setErro] = useState("");
	const [sucesso, setSucesso] = useState("");
	const [afirmacaoSelecionada, setAfirmacaoSelecionada] = useState(null);

	const ehEdicao = modo === "editar";
	const ehNova = modo === "nova";
	const somenteLeitura = modo === "visualizar";

	const tituloExibido = ehNova
		? "Nova investigação"
		: investigacaoSelecionada?.titulo || "Investigação";

	const quantidadeAfirmacoes = afirmacoes.length;

	const progressoAfirmacao = useMemo(() => {
		return (afirmacao) => {
			const quantidade = afirmacao?.evidencias_count ?? afirmacao?.evidencias?.length ?? 0;
			return Math.min(100, quantidade > 0 ? 100 : 0);
		};
	}, []);

	useEffect(() => {
		carregarInvestigacoes();
	}, []);

	async function carregarInvestigacoes() {
		try {
			setCarregando(true);
			setErro("");

			const dados = await investigacaoService.listar();
			setInvestigacoes(dados);

			if (dados.length > 0 && !investigacaoSelecionada && !ehNova) {
				await selecionarInvestigacao(dados[0].id);
			}
		} catch (error) {
			console.error("Erro ao carregar investigações:", error);
			setErro(
				error.response?.data?.detail ||
					"Não foi possível carregar as investigações.",
			);
		} finally {
			setCarregando(false);
		}
	}

	function limparMensagens() {
		setErro("");
		setSucesso("");
	}

	function limparFormulario() {
		setInvestigacaoSelecionada(null);
		setAfirmacoes([]);
		setAfirmacaoSelecionada(null);

		setTitulo("");
		setTipoEntrada("url");
		setConteudoOriginal("");
		setStatus("em_andamento");

		setModo("nova");
		setMenuAberto(false);
		limparMensagens();
	}

	function iniciarNovaInvestigacao() {
		limparFormulario();
	}

	async function selecionarInvestigacao(id) {
		try {
				setMenuAberto(false);
			limparMensagens();

			const investigacao = await investigacaoService.buscarPorId(id);

			setInvestigacaoSelecionada(investigacao);
			setTitulo(investigacao.titulo);
			setTipoEntrada(investigacao.tipo_entrada);
			setConteudoOriginal(investigacao.conteudo_original);
			setStatus(investigacao.status);
			setAfirmacoes(investigacao.afirmacoes ?? []);
			setAfirmacaoSelecionada(null);
			setModo("visualizar");
		} catch (error) {
			console.error("Erro ao buscar investigação:", error);
			setErro(
				error.response?.data?.detail ||
					"Não foi possível carregar a investigação.",
			);
		}
	}

	function iniciarEdicao() {
		setMenuAberto(false);
		limparMensagens();
		setModo("editar");
	}

	function cancelarEdicao() {
		if (!investigacaoSelecionada) {
			iniciarNovaInvestigacao();
			return;
		}

		setTitulo(investigacaoSelecionada.titulo);
		setTipoEntrada(investigacaoSelecionada.tipo_entrada);
		setConteudoOriginal(investigacaoSelecionada.conteudo_original);
		setStatus(investigacaoSelecionada.status);
		setModo("visualizar");
		limparMensagens();
	}

	async function executarIdentificacao(investigacaoId, mensagemSucesso) {
		try {
			setAnalisando(true);
			limparMensagens();
			setAfirmacaoSelecionada(null);

			const resultado = await investigacaoService.identificarAfirmacoes(
				investigacaoId,
			);

			setAfirmacoes(resultado ?? []);
			setSucesso(mensagemSucesso);
		} catch (error) {
			console.error("Erro ao identificar afirmações:", error);

			if (error.response?.status === 422) {
				setAfirmacoes([]);
				setErro(
					error.response?.data?.detail ||
						"Nenhuma afirmação relevante foi identificada.",
				);
			} else if (error.response?.status === 503) {
				setErro(
					error.response?.data?.detail ||
						"O serviço de IA está indisponível no momento.",
				);
			} else {
				setErro(
					error.response?.data?.detail ||
						"Não foi possível identificar as afirmações.",
				);
			}
		} finally {
			setAnalisando(false);
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		limparMensagens();

		if (!titulo.trim()) {
			setErro("Informe um título para a investigação.");
			return;
		}

		if (!conteudoOriginal.trim()) {
			setErro("Informe o conteúdo da investigação.");
			return;
		}

		if (
			tipoEntrada === "url" &&
			!/^https?:\/\/\S+/i.test(conteudoOriginal.trim())
		) {
			setErro("Informe uma URL válida.");
			return;
		}

		try {
			setSalvando(true);

			if (ehNova) {
				const resposta = await investigacaoService.criar({
					titulo: titulo.trim(),
					tipo_entrada: tipoEntrada,
					conteudo_original: conteudoOriginal.trim(),
				});

				await carregarInvestigacoes();
				await selecionarInvestigacao(resposta.id);

				await executarIdentificacao(
					resposta.id,
					"Investigação criada e conteúdo processado.",
				);
			} else {
				await investigacaoService.atualizar(
					investigacaoSelecionada.id,
					{
						titulo: titulo.trim(),
						tipo_entrada: tipoEntrada,
						conteudo_original: conteudoOriginal.trim(),
						status,
					},
				);

				const atualizada = await investigacaoService.buscarPorId(
					investigacaoSelecionada.id,
				);

				setInvestigacaoSelecionada(atualizada);
				setTitulo(atualizada.titulo);
				setTipoEntrada(atualizada.tipo_entrada);
				setConteudoOriginal(atualizada.conteudo_original);
				setStatus(atualizada.status);
				setAfirmacoes(atualizada.afirmacoes ?? afirmacoes);
				setModo("visualizar");
				await carregarInvestigacoes();

				setSucesso("Investigação atualizada com sucesso.");
			}
		} catch (error) {
			console.error("Erro ao salvar investigação:", error);

			setErro(
				error.response?.data?.detail ||
					"Não foi possível salvar a investigação.",
			);
		} finally {
			setSalvando(false);
		}
	}

	async function handleExcluir() {
		if (!investigacaoSelecionada) {
			return;
		}

		const confirmou = window.confirm(
			`Deseja realmente excluir a investigação "${investigacaoSelecionada.titulo}"? Essa ação não pode ser desfeita.`,
		);

		if (!confirmou) {
			return;
		}

		try {
			setExcluindo(true);
			limparMensagens();

			await investigacaoService.remover(investigacaoSelecionada.id);

			const restantes = investigacoes.filter(
				(item) => item.id !== investigacaoSelecionada.id,
			);

			setInvestigacoes(restantes);

			if (restantes.length > 0) {
				await selecionarInvestigacao(restantes[0].id);
			} else {
				iniciarNovaInvestigacao();
			}
		} catch (error) {
			console.error("Erro ao excluir investigação:", error);
			setErro(
				error.response?.data?.detail ||
					"Não foi possível excluir a investigação.",
			);
		} finally {
			setExcluindo(false);
		}
	}

	async function handleLogout() {
		try {
			authService.logout();
			navigate("/login");
		} catch (error) {
			console.error("Erro ao encerrar sessão:", error);
		}
	}

	function selecionarAfirmacao(afirmacao) {
		setAfirmacaoSelecionada(afirmacao.id);
	}

	return (
		<main className="investigacao-page">
			<header className="investigacao-topbar">
				<div className="investigacao-brand">
					<div className="investigacao-brand-icon">
						<Icon size={17}>
							<path d="M12 3 4 7l8 4 8-4-8-4Z" />
							<path d="M6 10v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V10" />
							<path d="M20 8v5" />
						</Icon>
					</div>
					<strong>Investigação Crítica</strong>
				</div>

				<div className="investigacao-topbar-title" aria-live="polite">
					<span>INVESTIGAÇÃO</span>
					<strong>{tituloExibido}</strong>
				</div>

				<div className="investigacao-topbar-actions">
					{ehEdicao && (
						<button type="submit" form="investigacao-form" className="investigacao-primary-button" disabled={salvando || excluindo}>
							{salvando ? "Salvando..." : "Salvar"}
						</button>
					)}

					<button type="button" className="investigacao-menu-button" onClick={() => setMenuAberto((aberto) => !aberto)} aria-label="Abrir menu" aria-expanded={menuAberto}>
						<Icon size={18}><path d="M5 7h14M5 12h14M5 17h14" /></Icon>
					</button>

					{menuAberto && (
						<div className="investigacao-menu">
							{!ehNova && (
								<>
									<button type="button" onClick={iniciarEdicao}>Alterar investigação</button>
									<button type="button" className="investigacao-menu-danger" onClick={handleExcluir} disabled={excluindo}>
										{excluindo ? "Excluindo..." : "Excluir investigação"}
									</button>
									<div className="investigacao-menu-divider" />
								</>
							)}
							<button type="button" onClick={handleLogout}>Sair</button>
						</div>
					)}
				</div>
			</header>

			<div className="investigacao-workspace">
				<aside className="investigacao-sidebar">
					<div className="sidebar-header">
						<div>
							<strong>Minhas investigações</strong>
							<span>{investigacoes.length}{" "}{investigacoes.length === 1 ? "investigação" : "investigações"}</span>
						</div>
						<button type="button" className="new-investigation-button" onClick={iniciarNovaInvestigacao} aria-label="Nova investigação">+</button>
					</div>

					<div className="investigacao-list">
						{carregando ? (
							<p className="sidebar-message">Carregando...</p>
						) : investigacoes.length === 0 ? (
							<p className="sidebar-message">Nenhuma investigação criada.</p>
						) : (
							investigacoes.map((investigacao) => (
								<button type="button" key={investigacao.id} className={`investigacao-list-item ${investigacaoSelecionada?.id === investigacao.id ? "investigacao-list-item-active" : ""}`} onClick={() => selecionarInvestigacao(investigacao.id)}>
									<span className="investigacao-list-title">{investigacao.titulo}</span>
									<span className="investigacao-list-status"><span className={`status-dot status-${investigacao.status}`} />{formatarStatus(investigacao.status)}</span>
								</button>
							))
						)}
					</div>
				</aside>

				<div className="investigacao-content-area">
					<nav className="investigacao-breadcrumb" aria-label="Navegação">
						<span>Minhas Investigações</span>
						<Icon size={13}><path d="m9 18 6-6-6-6" /></Icon>
						<strong>{tituloExibido}</strong>
					</nav>

			<section className="investigacao-main">
				{erro && (
					<div className="investigacao-alert investigacao-alert-error">
						{erro}
					</div>
				)}

				{sucesso && (
					<div className="investigacao-alert investigacao-alert-success">
						{sucesso}
					</div>
				)}

				<div className="investigacao-section-heading">
					<div>
						<span className="investigacao-section-kicker">
							CONTEÚDO ORIGINAL
						</span>
					</div>

					{!ehNova && (
						<span className="investigacao-status-badge">
							<span
								className={`investigacao-status-dot investigacao-status-${status}`}
							/>
							{formatarStatus(status)}
						</span>
					)}
				</div>

				<form
					id="investigacao-form"
					className="investigacao-original-card"
					onSubmit={handleSubmit}
				>
					<div className="investigacao-original-header">
						<div className="investigacao-original-icon">
							{tipoEntrada === "url" ? "N" : "T"}
						</div>

						<div className="investigacao-original-meta">
							{ehNova || ehEdicao ? (
								<>
									<input
										className="investigacao-title-input"
										type="text"
										value={titulo}
										onChange={(event) =>
											setTitulo(event.target.value)
										}
										placeholder="Título da investigação"
										maxLength={255}
										disabled={salvando}
									/>

									{tipoEntrada === "url" ? (
										<input
											className="investigacao-content-input"
											type="url"
											value={conteudoOriginal}
											onChange={(event) =>
												setConteudoOriginal(
													event.target.value,
												)
											}
											placeholder="https://exemplo.com/conteudo"
											disabled={salvando}
										/>
									) : (
										<textarea
											className="investigacao-content-textarea"
											value={conteudoOriginal}
											onChange={(event) =>
												setConteudoOriginal(
													event.target.value,
												)
											}
											placeholder="Cole aqui o conteúdo que será analisado..."
											rows={5}
											disabled={salvando}
										/>
									)}
								</>
							) : (
								<>
									<h1>{titulo}</h1>

									{tipoEntrada === "url" ? (
										<a
											href={conteudoOriginal}
											className="investigacao-original-url"
											target="_blank"
											rel="noreferrer"
										>
											{conteudoOriginal}
										</a>
									) : (
										<p className="investigacao-original-text">
											{conteudoOriginal}
										</p>
									)}
								</>
							)}
						</div>

						<span className="investigacao-entry-badge">
							{tipoEntrada.toUpperCase()}
						</span>
					</div>

					<div className="investigacao-original-footer">
						{!ehNova && investigacaoSelecionada ? (
							<span className="investigacao-created">
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
								{formatarData(
									investigacaoSelecionada.data_criacao,
								)}
							</span>
						) : (
							<div className="investigacao-entry-selector">
								<button
									type="button"
									className={
										tipoEntrada === "url"
											? "investigacao-entry-selector-active"
											: ""
									}
									onClick={() => {
										setTipoEntrada("url");
										setConteudoOriginal("");
										limparMensagens();
									}}
									disabled={salvando}
								>
									URL
								</button>
								<button
									type="button"
									className={
										tipoEntrada === "texto"
											? "investigacao-entry-selector-active"
											: ""
									}
									onClick={() => {
										setTipoEntrada("texto");
										setConteudoOriginal("");
										limparMensagens();
									}}
									disabled={salvando}
								>
									Texto
								</button>
							</div>
						)}

						{tipoEntrada === "url" &&
							!ehNova &&
							!ehEdicao &&
							conteudoOriginal && (
								<a
									href={conteudoOriginal}
									target="_blank"
									rel="noreferrer"
									className="investigacao-original-link"
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

				{ehEdicao && (
					<div className="investigacao-edit-actions">
						<button
							type="button"
							className="investigacao-secondary-button"
							onClick={cancelarEdicao}
							disabled={salvando || excluindo}
						>
							Cancelar
						</button>

						<button
							type="submit"
							form="investigacao-form"
							className="investigacao-primary-button"
							disabled={salvando || excluindo}
						>
							{salvando ? "Salvando..." : "Salvar alterações"}
						</button>
					</div>
				)}

				{ehNova && (
					<div className="investigacao-start-panel">
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
							form="investigacao-form"
							className="investigacao-primary-button"
							disabled={salvando}
						>
							{salvando ? "Processando..." : "Criar e analisar"}
						</button>
					</div>
				)}

				{!ehNova && (
					<section className="investigacao-assertions-section">
						<div className="investigacao-section-heading">
							<span className="investigacao-section-kicker">
								AFIRMAÇÕES IDENTIFICADAS ({quantidadeAfirmacoes})
							</span>

							{analisando ? (
								<span className="investigacao-text-button investigacao-text-button-static">Analisando...</span>
							) : quantidadeAfirmacoes === 0 ? (
								<button type="button" className="investigacao-text-button" onClick={() => executarIdentificacao(investigacaoSelecionada.id, "Afirmações identificadas com sucesso.")}>Identificar afirmações</button>
							) : null}
						</div>

						{analisando ? (
							<div className="investigacao-empty-card">
								<div className="investigacao-spinner" />
								<strong>Analisando o conteúdo...</strong>
								<span>
									A IA está identificando afirmações
									potencialmente verificáveis.
								</span>
							</div>
						) : quantidadeAfirmacoes === 0 ? (
							<div className="investigacao-empty-card">
								<div className="investigacao-empty-icon">
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
							<div className="investigacao-assertions-list">
								{afirmacoes.map((afirmacao, index) => {
									const evidencias =
										afirmacao.evidencias_count ??
										afirmacao.evidencias?.length ??
										0;
									const progresso =
										progressoAfirmacao(afirmacao);

									return (
										<article
											key={afirmacao.id}
											className={`investigacao-assertion-card ${
												afirmacaoSelecionada ===
												afirmacao.id
													? "investigacao-assertion-card-selected"
													: ""
											}`}
										>
											<div className="investigacao-assertion-main">
												<div className="investigacao-assertion-index">
													{String(index + 1).padStart(
														2,
														"0",
													)}
												</div>

												<div className="investigacao-assertion-body">
													<h3>
														{afirmacao.texto}
													</h3>

													<span className="investigacao-ai-badge">
														Identificada por IA
													</span>

													<div className="investigacao-assertion-progress">
														<span className="investigacao-assertion-status">
															{evidencias > 0
																? "Em investigação"
																: "Não iniciada"}
														</span>

														<div className="investigacao-progress-track">
															<span
																style={{
																	width: `${Math.max(
																		6,
																		progresso,
																	)}%`,
																}}
															/>
														</div>

														<span className="investigacao-evidence-count">
															{evidencias}{" "}
															{evidencias === 1
																? "evidência"
																: "evidências"}
														</span>
													</div>
												</div>
											</div>

											<button
												type="button"
												className="investigacao-investigate-button"
												onClick={() =>
													selecionarAfirmacao(
														afirmacao,
													)
												}
											>
												{afirmacaoSelecionada ===
												afirmacao.id
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

						{afirmacaoSelecionada && (
							<div className="investigacao-selection-note">
								<strong>Afirmação selecionada.</strong>
								<span>
									O próximo passo é iniciar a investigação
									dessa afirmação.
								</span>
							</div>
						)}
					</section>
				)}

				<section className="investigacao-conclusion-section">
					<div className="investigacao-section-heading">
						<span className="investigacao-section-kicker">
							CONCLUSÃO DA INVESTIGAÇÃO
						</span>
					</div>

					<div className="investigacao-conclusion-card">
						<div className="investigacao-conclusion-header">
							<strong>Sua conclusão geral</strong>
							<span>Obrigatório</span>
						</div>

						<div className="investigacao-conclusion-placeholder">
							<div className="investigacao-lock-icon">
								<Icon size={18}>
									<rect
										x="5"
										y="10"
										width="14"
										height="10"
										rx="2"
									/>
									<path d="M8 10V7a4 4 0 0 1 8 0v3" />
								</Icon>
							</div>

							<span>
								Investigue ao menos uma afirmação para concluir
							</span>
						</div>

						<p>
							Baseie-se nas afirmações investigadas e evidências
							reunidas.
						</p>
					</div>
				</section>

				{!carregando && (
					<div className="investigacao-footer-spacer">
						<span>
							Última atualização:{" "}
							{formatarDataHora(
								investigacaoSelecionada?.data_atualizacao,
							)}
						</span>
					</div>
				)}
					</section>
				</div>
			</div>

			<footer className="investigacao-bottom-bar">
				<button
					type="button"
					className="investigacao-secondary-button"
					onClick={iniciarNovaInvestigacao}
				>
					← Voltar às investigações
				</button>

				<button
					type="button"
					className="investigacao-primary-button investigacao-conclusion-button"
					disabled
				>
					Salvar Conclusão
				</button>
			</footer>
		</main>
	);
}

export default Investigacao;
