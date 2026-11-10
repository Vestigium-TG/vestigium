import useProfileController from "../../../controllers/useProfileController";
import { formatDate } from "../../../utils/formatters";
import logo from "../../../assets/images/logo.png";
import "./profile.css";

function ProfileView() {
	const { user, error, loading } = useProfileController();

	return (
		<main className="profile-page">
			<section className="profile-content" aria-labelledby="profile-title">
				<img className="profile-logo" src={logo} alt="Vestigium" />
				<p className="profile-kicker">Vestigium</p>
				<div className="profile-title-row">
					<h1 id="profile-title">Seu perfil</h1>
				</div>
				<p className="profile-description">
					Consulte as informações básicas da sua conta.
				</p>

				{error && (
					<p className="profile-error" role="alert">
						{error}
					</p>
				)}

				{loading && !error && (
					<p className="profile-status">Carregando perfil...</p>
				)}

				{user && (
					<dl className="profile-data">
						<div>
							<dt>
								<i
									className="fa-solid fa-envelope"
									aria-hidden="true"
								/>
								Email
							</dt>
							<dd>{user.email}</dd>
						</div>
						<div>
							<dt>
								<i
									className="fa-solid fa-circle-user"
									aria-hidden="true"
								/>
								ID do usuário
							</dt>
							<dd>{user.id}</dd>
						</div>
						<div>
							<dt>
								<i
									className="fa-solid fa-calendar-days"
									aria-hidden="true"
								/>
								Conta criada em
							</dt>
							<dd>{formatDate(user.created_at)}</dd>
						</div>
					</dl>
				)}
			</section>
		</main>
	);
}

export default ProfileView;
