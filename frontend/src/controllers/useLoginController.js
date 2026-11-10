import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authModel from "../models/authModel";
import { ROUTES } from "../routes/paths";

export default function useLoginController() {
	const navigate = useNavigate();
	const location = useLocation();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const successMessage = location.state?.success;

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setLoading(true);

		try {
			await authModel.login(email, password);
			navigate(ROUTES.newInvestigation);
		} catch (requestError) {
			const message = requestError.response?.data?.detail;
			setError(message || "Não foi possível entrar. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}

	return {
		email,
		setEmail,
		password,
		setPassword,
		error,
		loading,
		successMessage,
		handleSubmit,
	};
}
