import api from "./api";

async function list(investigationId) {
	const response = await api.get(
		`/investigations/${investigationId}/sources`,
	);

	return response.data;
}

async function register(investigationId, source) {
	const response = await api.post(
		`/investigations/${investigationId}/sources`,
		{
			sources: [source],
		},
	);

	// The backend returns the list of created sources.
	return response.data[0];
}

export default {
	list,
	register,
};
