import { useCallback, useEffect, useRef, useState } from "react";
import investigationModel from "../models/investigationModel";

export default function useConclusionController(investigationId) {
	const [conclusion, setConclusion] = useState(null);
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(Boolean(investigationId));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const requestId = useRef(0);

	useEffect(() => {
		const currentRequestId = ++requestId.current;

		setConclusion(null);
		setText("");
		setError("");
		setSuccess("");
		setSaving(false);

		if (!investigationId) {
			setLoading(false);
			return undefined;
		}

		let cancelled = false;

		async function load() {
			try {
				setLoading(true);
				const result =
					await investigationModel.getConclusion(investigationId);
				if (!cancelled) {
					setConclusion(result);
					setText(result.text ?? "");
				}
			} catch (requestError) {
				if (cancelled) return;
				if (requestError.response?.status !== 404) {
					console.error("Erro ao carregar conclusão:", requestError);
					setError(
						requestError.response?.data?.detail ||
							"Não foi possível carregar a conclusão.",
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, [investigationId]);

	const save = useCallback(async (canConclude) => {
		if (!investigationId || !canConclude) {
			setError(
				"Conclua ao menos uma afirmação antes de salvar a conclusão.",
			);
			return false;
		}

		const conclusionText = text.trim();
		if (!conclusionText) {
			setError("Escreva a conclusão antes de salvar.");
			return false;
		}

		const currentRequestId = requestId.current;
		try {
			setSaving(true);
			setError("");
			setSuccess("");
			const result = await investigationModel.saveConclusion(
				investigationId,
				conclusionText,
			);
			if (requestId.current === currentRequestId) {
				setConclusion(result);
				setText(result.text ?? conclusionText);
				setSuccess("Conclusão salva com sucesso.");
				return true;
			}
			return false;
		} catch (requestError) {
			console.error("Erro ao salvar conclusão:", requestError);
			if (requestId.current === currentRequestId) {
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível salvar a conclusão.",
				);
			}
			return false;
		} finally {
			if (requestId.current === currentRequestId) {
				setSaving(false);
			}
		}
	}, [investigationId, text]);

	return {
		conclusion,
		text,
		setText,
		loading,
		saving,
		error,
		success,
		save,
	};
}
