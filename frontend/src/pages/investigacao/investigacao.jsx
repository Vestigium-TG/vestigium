import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import investigacaoService from "../../services/investigacaoService";
import "./investigacao.css";

function formatarData(data) {
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

function Investigacao() {
	const navigate = useNavigate();

	const [investigacoes, setInvestigacoes] = useState([]);
	const [investigacaoSelecionada, setInvestigacaoSelecionada] =
		useState(null);

	const [titulo, setTitulo] = useState("");
	const [tipoEntrada, setTipoEntrada] = useState("url");
	const [conteudoOriginal, setConteudoOriginal] = useState("");
	const [status, setStatus] = useState("em_andamento");

	const [modo, setModo] = useState("nova");

	const [carregando, setCarregando] = useState(true);
	const [salvando, setSalvando] = useState(false);
	const [excluindo, setExcluindo] = useState(false);
	const [erro, setErro] = useState("");

	useEffect(() => {
		carregarInvestigacoes();
	}, []);

	async function carregarInvestigacoes() {
		try {
			setCarregando(true);
			setErro("");

			const dados = await investigacaoService.listar();

			setInvestigacoes(dados);
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

	function limparFormulario() {
		setInvestigacaoSelecionada(null);

		setTitulo("");
		setTipoEntrada("url");
		setConteudoOriginal("");
		setStatus("em_andamento");

		setErro("");
	}

	function iniciarNovaInvestigacao() {
		limparFormulario();
		setModo("nova");
	}

	async function selecionarInvestigacao(id) {
		try {
			setErro("");

			const investigacao = await investigacaoService.buscarPorId(id);

			setInvestigacaoSelecionada(investigacao);

			setTitulo(investigacao.titulo);
			setTipoEntrada(investigacao.tipo_entrada);
			setConteudoOriginal(investigacao.conteudo_original);
			setStatus(investigacao.status);

			setModo("editar");
		} catch (error) {
			console.error("Erro ao buscar investigação:", error);

			setErro(
				error.response?.data?.detail ||
					"Não foi possível carregar a investigação.",
			);
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();

		setErro("");

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

			if (modo === "nova") {
				const resposta = await investigacaoService.criar({
					titulo: titulo.trim(),
					tipo_entrada: tipoEntrada,
					conteudo_original: conteudoOriginal.trim(),
				});

				await carregarInvestigacoes();

				await selecionarInvestigacao(resposta.id);
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

				await carregarInvestigacoes();

				const atualizada =
					await investigacaoService.buscarPorId(
						investigacaoSelecionada.id,
					);

				setInvestigacaoSelecionada(atualizada);

				setTitulo(atualizada.titulo);
				setTipoEntrada(atualizada.tipo_entrada);
				setConteudoOriginal(atualizada.conteudo_original);
				setStatus(atualizada.status);
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
			setErro("");

			await investigacaoService.remover(
				investigacaoSelecionada.id,
			);

			setInvestigacoes((atuais) =>
				atuais.filter(
					(item) =>
						item.id !== investigacaoSelecionada.id,
				),
			);

			iniciarNovaInvestigacao();
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

	return (
		<main className="investigacao-page">
			<header className="investigacao-header">
				<div>
					<span className="investigacao-eyebrow">
						VESTIGIUM
					</span>

					<h1>Investigações</h1>
				</div>

				<button
					className="logout-button"
					type="button"
					onClick={handleLogout}
				>
					Sair
				</button>
			</header>

			<div className="investigacao-workspace">
				<aside className="investigacao-sidebar">
					<div className="sidebar-header">
						<div>
							<strong>Minhas investigações</strong>

							<span>
								{investigacoes.length}{" "}
								{investigacoes.length === 1
									? "investigação"
									: "investigações"}
							</span>
						</div>

						<button
							type="button"
							className="new-investigation-button"
							onClick={iniciarNovaInvestigacao}
						>
							+
						</button>
					</div>

					<button
						type="button"
						className={`new-investigation-link ${
							modo === "nova"
								? "new-investigation-link-active"
								: ""
						}`}
						onClick={iniciarNovaInvestigacao}
					>
						<span>+</span>
						Nova investigação
					</button>

					<div className="investigacao-list">
						{carregando ? (
							<p className="sidebar-message">
								Carregando...
							</p>
						) : investigacoes.length === 0 ? (
							<p className="sidebar-message">
								Nenhuma investigação criada.
							</p>
						) : (
							investigacoes.map((investigacao) => (
								<button
									key={investigacao.id}
									type="button"
									className={`investigacao-list-item ${
										investigacaoSelecionada?.id ===
										investigacao.id
											? "investigacao-list-item-active"
											: ""
									}`}
									onClick={() =>
										selecionarInvestigacao(
											investigacao.id,
										)
									}
								>
									<span className="investigacao-list-title">
										{investigacao.titulo}
									</span>

									<span className="investigacao-list-status">
										<span
											className={`status-dot status-${investigacao.status}`}
										/>

										{formatarStatus(
											investigacao.status,
										)}
									</span>
								</button>
							))
						)}
					</div>
				</aside>

				<section className="investigacao-content">
					<div className="investigacao-content-header">
						<div>
							<span className="investigacao-eyebrow">
								{modo === "nova"
									? "NOVA INVESTIGAÇÃO"
									: "INVESTIGAÇÃO"}
							</span>

							<h2>
								{modo === "nova"
									? "Criar investigação"
									: investigacaoSelecionada?.titulo}
							</h2>

							{modo === "editar" &&
								investigacaoSelecionada && (
									<p>
										Criada em{" "}
										{formatarData(
											investigacaoSelecionada.data_criacao,
										)}
									</p>
								)}
						</div>

						{modo === "editar" && (
							<span className="status-badge">
								<span
									className={`status-dot status-${status}`}
								/>

								{formatarStatus(status)}
							</span>
						)}
					</div>

					{erro && (
						<div className="investigacao-error" role="alert">
							{erro}
						</div>
					)}

					<form
						className="investigacao-form"
						onSubmit={handleSubmit}
					>
						<div className="form-group">
							<label htmlFor="titulo">Título</label>

							<input
								id="titulo"
								name="titulo"
								type="text"
								value={titulo}
								onChange={(event) =>
									setTitulo(event.target.value)
								}
								placeholder="Ex.: Verificação de uma notícia"
								maxLength={255}
								disabled={salvando}
							/>
						</div>

						<div className="form-group">
							<label>Tipo de entrada</label>

							<div className="tipo-entrada-options">
								<label
									className={`tipo-entrada-option ${
										tipoEntrada === "url"
											? "tipo-entrada-option-active"
											: ""
									}`}
								>
									<input
										type="radio"
										name="tipo_entrada"
										value="url"
										checked={
											tipoEntrada === "url"
										}
										onChange={() => {
											setTipoEntrada("url");
											setConteudoOriginal("");
											setErro("");
										}}
										disabled={salvando}
									/>

									<div>
										<strong>URL</strong>

										<span>
											Investigar uma página ou
											conteúdo da internet.
										</span>
									</div>
								</label>

								<label
									className={`tipo-entrada-option ${
										tipoEntrada === "texto"
											? "tipo-entrada-option-active"
											: ""
									}`}
								>
									<input
										type="radio"
										name="tipo_entrada"
										value="texto"
										checked={
											tipoEntrada === "texto"
										}
										onChange={() => {
											setTipoEntrada("texto");
											setConteudoOriginal("");
											setErro("");
										}}
										disabled={salvando}
									/>

									<div>
										<strong>Texto</strong>

										<span>
											Inserir diretamente o conteúdo
											que será analisado.
										</span>
									</div>
								</label>
							</div>
						</div>

						<div className="form-group">
							<label htmlFor="conteudo_original">
								{tipoEntrada === "url"
									? "URL do conteúdo"
									: "Texto do conteúdo"}
							</label>

							{tipoEntrada === "url" ? (
								<input
									id="conteudo_original"
									name="conteudo_original"
									type="url"
									value={conteudoOriginal}
									onChange={(event) =>
										setConteudoOriginal(
											event.target.value,
										)
									}
									placeholder="https://exemplo.com/noticia"
									disabled={salvando}
								/>
							) : (
								<textarea
									id="conteudo_original"
									name="conteudo_original"
									value={conteudoOriginal}
									onChange={(event) =>
										setConteudoOriginal(
											event.target.value,
										)
									}
									placeholder="Cole aqui o conteúdo que deseja investigar..."
									rows={12}
									disabled={salvando}
								/>
							)}
						</div>

						{modo === "editar" && (
							<div className="form-group">
								<label htmlFor="status">
									Status
								</label>

								<select
									id="status"
									value={status}
									onChange={(event) =>
										setStatus(event.target.value)
									}
									disabled={salvando}
								>
									<option value="em_andamento">
										Em andamento
									</option>

									<option value="concluida">
										Concluída
									</option>

									<option value="cancelada">
										Cancelada
									</option>
								</select>
							</div>
						)}

						<div className="investigacao-actions">
							{modo === "editar" && (
								<button
									type="button"
									className="delete-button"
									onClick={handleExcluir}
									disabled={
										salvando || excluindo
									}
								>
									{excluindo
										? "Excluindo..."
										: "Excluir investigação"}
								</button>
							)}

							<div className="investigacao-actions-right">
								{modo === "editar" && (
									<button
										type="button"
										className="cancel-button"
										onClick={
											iniciarNovaInvestigacao
										}
										disabled={
											salvando ||
											excluindo
										}
									>
										Nova
									</button>
								)}

								<button
									type="submit"
									className="create-button"
									disabled={
										salvando || excluindo
									}
								>
									{salvando
										? "Salvando..."
										: modo === "nova"
											? "Criar investigação"
											: "Salvar alterações"}
								</button>
							</div>
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}

export default Investigacao;
