import { useCallback, useEffect, useState } from "react";
import claimModel from "../models/claimModel";

export default function useReflectionsController(claimId) {
	const [reflections, setReflections] = useState([]);
	const [loading, setLoading] = useState(Boolean(claimId));
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deletingReflectionId, setDeletingReflectionId] = useState(null);

	useEffect(() => {
		if (!claimId) {
			setReflections([]);
			setLoading(false);
			return undefined;
		}

		let cancelled = false;

		async function load() {
			try {
				setLoading(true);
				setError("");
				setReflections([]);

				const result = await claimModel.listReflections(claimId);
				if (!cancelled) {
					setReflections(result ?? []);
				}
			} catch (requestError) {
				console.error("Erro ao carregar reflexão:", requestError);
				if (!cancelled) {
					setError(
						requestError.response?.data?.detail ||
							"Não foi possível carregar a reflexão.",
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
		async (text) => {
			try {
				setSaving(true);
				setError("");
				const created = await claimModel.registerReflection(claimId, {
					text,
				});
				setReflections((current) => [...current, created]);
				return created;
			} catch (requestError) {
				console.error("Erro ao registrar reflexão:", requestError);
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível registrar a reflexão.",
				);
				return null;
			} finally {
				setSaving(false);
			}
		},
		[claimId],
	);

	const remove = useCallback(async (reflectionId) => {
		try {
			setDeletingReflectionId(reflectionId);
			setError("");
			await claimModel.deleteReflection(reflectionId);
			setReflections((current) =>
				current.filter((reflection) => reflection.id !== reflectionId),
			);
			return true;
		} catch (requestError) {
			console.error("Erro ao remover reflexão:", requestError);
			setError(
				requestError.response?.data?.detail ||
					"Não foi possível remover a reflexão.",
			);
			return false;
		} finally {
			setDeletingReflectionId(null);
		}
	}, []);

	return {
		reflections,
		loading,
		error,
		saving,
		deletingReflectionId,
		register,
		remove,
	};
}
