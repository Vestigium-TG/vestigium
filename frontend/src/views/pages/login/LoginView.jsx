import { Link } from "react-router-dom";
import useLoginController from "../../../controllers/useLoginController";
import { ROUTES } from "../../../routes/paths";
import logo from "../../../assets/images/logo.png";
import "./login.css";

function LoginView() {
	const {
		email,
		setEmail,
		password,
		setPassword,
		error,
		loading,
		successMessage,
		handleSubmit,
	} = useLoginController();

	return (
		<main className="login-page">
			<section className="login-container">
				<section className="login-intro" aria-labelledby="login-title">
					<img className="login-logo" src={logo} alt="Vestigium" />
					<p className="login-eyebrow">Vestigium</p>

					<h1 id="login-title">Investigue com clareza.</h1>

					<p className="login-description">
						Reúna fontes, organize evidências e acompanhe suas
						investigações em um só lugar.
					</p>
				</section>

				<section className="login-panel" aria-label="Formulário de login">
					<div className="login-heading">
						<p className="login-kicker">Acesso</p>

						<h2>Bem-vindo de volta</h2>

						<p>Entre na sua conta para continuar.</p>
					</div>

					<form className="login-form" onSubmit={handleSubmit}>
						<label htmlFor="email">
							<i className="fa-solid fa-envelope" aria-hidden="true" />
							Email
						</label>

						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="voce@exemplo.com"
							required
						/>

						<div className="login-label-row">
							<label htmlFor="password">
								<i className="fa-solid fa-marker" aria-hidden="true" />
								Senha
							</label>
						</div>

						<input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="Digite sua senha"
							required
						/>

						{error && (
							<p className="login-error" role="alert">
								{error}
							</p>
						)}

						{successMessage && (
							<p className="login-success" role="status">
								{successMessage}
							</p>
						)}

						<button
							className="login-submit"
							type="submit"
							disabled={loading}
						>
							{loading ? "Entrando..." : "Entrar"}
						</button>
					</form>

					<p className="login-footer">
						Ainda não tem uma conta?{" "}
						<Link to={ROUTES.register}>Criar conta</Link>
					</p>
				</section>
			</section>
		</main>
	);
}

export default LoginView;
