import { Link } from "react-router-dom";
import useRegisterController from "../../../controllers/useRegisterController";
import { ROUTES } from "../../../routes/paths";
import logo from "../../../assets/images/logo.png";
import "./register.css";

function RegisterView() {
	const {
		email,
		setEmail,
		password,
		setPassword,
		confirmation,
		setConfirmation,
		error,
		loading,
		handleSubmit,
	} = useRegisterController();

	return (
		<main className="register-page">
			<section className="register-container">
				<section
					className="register-intro"
					aria-labelledby="register-title"
				>
					<img className="register-logo" src={logo} alt="Vestigium" />
					<p className="register-eyebrow">Vestigium</p>
					<h1 id="register-title">Comece sua investigação.</h1>
					<p className="register-description">
						Crie sua conta para guardar fontes, evidências e
						descobertas com organização.
					</p>
				</section>

				<section
					className="register-panel"
					aria-label="Formulário de registro"
				>
					<div className="register-heading">
						<p className="register-kicker">Novo acesso</p>
						<h2>Criar sua conta</h2>
						<p>Preencha seus dados para começar.</p>
					</div>

					<form className="register-form" onSubmit={handleSubmit}>
						<label htmlFor="register-email">
							<i
								className="fa-solid fa-envelope"
								aria-hidden="true"
							/>
							Email
						</label>
						<input
							id="register-email"
							name="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="voce@exemplo.com"
							required
						/>

						<label htmlFor="register-password">
							<i
								className="fa-solid fa-marker"
								aria-hidden="true"
							/>
							Senha
						</label>
						<input
							id="register-password"
							name="password"
							type="password"
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="Crie uma senha"
							minLength={6}
							required
						/>

						<label htmlFor="register-confirmation">
							<i
								className="fa-solid fa-marker"
								aria-hidden="true"
							/>
							Confirmar senha
						</label>
						<input
							id="register-confirmation"
							name="confirmation"
							type="password"
							autoComplete="new-password"
							value={confirmation}
							onChange={(event) =>
								setConfirmation(event.target.value)
							}
							placeholder="Repita sua senha"
							minLength={6}
							required
						/>

						{error && (
							<p className="register-error" role="alert">
								{error}
							</p>
						)}

						<button
							className="register-submit"
							type="submit"
							disabled={loading}
						>
							{loading ? "Criando conta..." : "Criar conta"}
						</button>
					</form>

					<p className="register-footer">
						Já tem uma conta? <Link to={ROUTES.login}>Entrar</Link>
					</p>
				</section>
			</section>
		</main>
	);
}

export default RegisterView;
