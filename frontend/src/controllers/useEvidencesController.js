import { useCallback, useEffect, useState } from "react";
import claimModel from "../models/claimModel";

export default function useEvidencesController(claimId) {
	const [evidences, setEvidences] = useState([]);
	const [loading, setLoading] = useState(Boolean(claimId));
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deletingEvidenceId, setDeletingEvidenceId] = useState(null);

	useEffect(() => {
		if (!claimId) {
			setEvidences([]);
			setLoading(false);
			return undefined;
		}

		let cancelled = false;

		async function load() {
			try {
				setLoading(true);
				setError("");
				setEvidences([]);

				const result = await claimModel.listEvidences(claimId);
				if (!cancelled) {
					setEvidences(result ?? []);
				}
			} catch (requestError) {
				console.error("Erro ao carregar evidências:", requestError);
				if (!cancelled) {
					setError(
						requestError.response?.data?.detail ||
							"Não foi possível carregar as evidências.",
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
	}, [claimId]);

	const register = useCallback(
		async (evidence) => {
			try {
				setSaving(true);
				setError("");
				const created = await claimModel.registerEvidence(
					claimId,
					evidence,
				);
				setEvidences((current) => [...current, created]);
				return created;
			} catch (requestError) {
				console.error("Erro ao registrar evidência:", requestError);
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível registrar a evidência.",
				);
				return null;
			} finally {
				setSaving(false);
			}
		},
		[claimId],
	);

	const remove = useCallback(async (evidenceId) => {
		try {
			setDeletingEvidenceId(evidenceId);
			setError("");
			await claimModel.deleteEvidence(evidenceId);
			setEvidences((current) =>
				current.filter((evidence) => evidence.id !== evidenceId),
			);
			return true;
		} catch (requestError) {
			console.error("Erro ao remover evidência:", requestError);
			setError(
				requestError.response?.data?.detail ||
					"Não foi possível remover a evidência.",
			);
			return false;
		} finally {
			setDeletingEvidenceId(null);
		}
	}, []);

	return {
		evidences,
		loading,
		error,
		saving,
		deletingEvidenceId,
		register,
		remove,
	};
}
