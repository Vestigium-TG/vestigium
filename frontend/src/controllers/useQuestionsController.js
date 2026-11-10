import { useCallback, useEffect, useRef, useState } from "react";
import claimModel from "../models/claimModel";

function messageFromError(error) {
	const status = error.response?.status;
	const detail = error.response?.data?.detail;

	if (status === 503) {
		return detail || "O serviço de IA está indisponível no momento.";
	}
	if (status === 422) {
		return "A IA não gerou perguntas adequadas. Tente novamente.";
	}
	return detail || "Não foi possível obter as perguntas orientadoras.";
}

// UC08 — Generate guiding questions.
// Lists the saved questions; if there are none, generates them on first open.
// Use `key={claimId}` in the parent to reset state when changing claims.
export default function useQuestionsController(claimId) {
	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState("");

	// Avoid generating twice (the backend persists every generation).
	const generatedFor = useRef(null);

	const generate = useCallback(async () => {
		try {
			setGenerating(true);
			setError("");
			const list = await claimModel.generateQuestions(claimId);
			setQuestions(list ?? []);
		} catch (requestError) {
			console.error("Erro ao gerar perguntas:", requestError);
			setError(messageFromError(requestError));
		} finally {
			setGenerating(false);
		}
	}, [claimId]);

	useEffect(() => {
		let cancelled = false;

		async function start() {
			try {
				const list = await claimModel.listQuestions(claimId);
				if (cancelled) return;

				setQuestions(list ?? []);
				setLoading(false);

				if (
					(list ?? []).length === 0 &&
					generatedFor.current !== claimId
				) {
					generatedFor.current = claimId;
					await generate();
				}
			} catch (requestError) {
				console.error("Erro ao carregar perguntas:", requestError);
				if (!cancelled) {
					setError(messageFromError(requestError));
					setLoading(false);
				}
			}
		}

		start();

		return () => {
			cancelled = true;
		};
	}, [claimId, generate]);

	return { questions, loading, generating, error, generate };
}
