import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authModel from "../models/authModel";
import { ROUTES } from "../routes/paths";

export default function useRegisterController() {
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");

		if (password !== confirmation) {
			setError("As senhas não coincidem.");
			return;
		}

		setLoading(true);

		try {
			await authModel.register(email, password);
			await authModel.login(email, password);
			navigate(ROUTES.newInvestigation);
		} catch (requestError) {
			const message = requestError.response?.data?.detail;
			setError(
				message ||
					"Não foi possível concluir o acesso automático. Tente fazer o login.",
			);
		} finally {
			setLoading(false);
		}
	}

	return {
		email,
		setEmail,
		password,
		setPassword,
		confirmation,
		setConfirmation,
		error,
		loading,
		handleSubmit,
	};
}
