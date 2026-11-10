import { useCallback, useEffect, useState } from "react";
import sourceModel from "../models/sourceModel";

// Sources registered in the investigation (shared by all its claims).
export default function useSourcesController(investigationId) {
	const [sources, setSources] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				setLoading(true);
				setError("");
				const list = await sourceModel.list(investigationId);
				if (!cancelled) {
					setSources(list ?? []);
				}
			} catch (requestError) {
				console.error("Erro ao carregar fontes:", requestError);
				if (!cancelled) {
					setError(
						requestError.response?.data?.detail ||
							"Não foi possível carregar as fontes.",
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

	// RN07: only the source chosen by the investigator enters the investigation.
	// Rethrows API errors so the caller can display the message.
	const register = useCallback(
		async (source) => {
			const existing = sources.find((item) => item.url === source.url);
			if (existing) return existing;

			const created = await sourceModel.register(
				investigationId,
				source,
			);
			setSources((current) => [...current, created]);
			return created;
		},
		[sources, investigationId],
	);

	return { sources, loading, error, register };
}
