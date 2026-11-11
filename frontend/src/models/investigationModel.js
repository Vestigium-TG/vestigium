import api from "./api";

async function list() {
	const response = await api.get("/investigations");

	return response.data;
}

async function getById(id) {
	const response = await api.get(`/investigations/${id}`);

	return response.data;
}

async function create(data) {
	const response = await api.post("/investigations", data);

	return response.data;
}

async function update(id, data) {
	const response = await api.patch(`/investigations/${id}`, data);

	return response.data;
}

async function remove(id) {
	const response = await api.delete(`/investigations/${id}`);

	return response.data;
}

async function identifyClaims(id) {
	const response = await api.post(`/investigations/${id}/claims`);

	return response.data;
}

async function getConclusion(id) {
	const response = await api.get(`/investigations/${id}/conclusion`);

	return response.data;
}

async function saveConclusion(id, text) {
	const response = await api.put(`/investigations/${id}/conclusion`, {
		text,
	});

	return response.data;
}

export default {
	list,
	getById,
	create,
	update,
	remove,
	identifyClaims,
	getConclusion,
	saveConclusion,
};
