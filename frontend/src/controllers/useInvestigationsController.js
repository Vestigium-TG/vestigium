import { useCallback, useEffect, useState } from "react";
import investigationModel from "../models/investigationModel";

function errorMessage(requestError) {
	return (
		requestError.response?.data?.detail ||
		"Não foi possível carregar as investigações."
	);
}

// Loads the user's investigations (feeds the sidebar).
export default function useInvestigationsController() {
	const [investigations, setInvestigations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const reload = useCallback(async () => {
		setLoading(true);
		setError("");

		try {
			const data = await investigationModel.list();
			setInvestigations(data);
			return data;
		} catch (requestError) {
			console.error("Erro ao carregar investigações:", requestError);
			setError(errorMessage(requestError));
			return [];
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		investigationModel
			.list()
			.then((data) => {
				if (!cancelled) {
					setInvestigations(data);
				}
			})
			.catch((requestError) => {
				console.error("Erro ao carregar investigações:", requestError);
				if (!cancelled) {
					setError(errorMessage(requestError));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return { investigations, setInvestigations, loading, error, reload };
}
