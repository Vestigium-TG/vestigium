import { useEffect, useState } from "react";
import authModel from "../models/authModel";

export default function useProfileController() {
	const [user, setUser] = useState(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		authModel
			.getMe()
			.then((data) => {
				if (!cancelled) {
					setUser(data);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError("Não foi possível carregar o perfil.");
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

	return { user, error, loading };
}
