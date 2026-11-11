import api from "./api";

// UC08 — Generate guiding questions
async function listQuestions(claimId) {
	const response = await api.get(`/claims/${claimId}/questions`);

	return response.data;
}

async function generateQuestions(claimId) {
	const response = await api.post(`/claims/${claimId}/questions`);

	return response.data;
}

// UC09 — Search sources
async function generateSearchQueries(claimId) {
	const response = await api.post(`/claims/${claimId}/search-queries`);

	// The backend returns { claim_id, queries }.
	return response.data.queries ?? [];
}

async function searchSources(claimId, query) {
	const response = await api.post(
		`/claims/${claimId}/search`,
		query ? { query } : undefined,
	);

	// The backend returns { message, results }.
	return response.data.results ?? [];
}

// UC10: Register Evidence
async function listEvidences(claimId) {
	const response = await api.get(`/claims/${claimId}/evidences`);

	return response.data;
}

async function registerEvidence(claimId, evidence) {
	const response = await api.post(
		`/claims/${claimId}/evidences`,
		evidence,
	);

	return response.data;
}

async function deleteEvidence(evidenceId) {
	const response = await api.delete(`/evidences/${evidenceId}`);

	return response.data;
}

// UC11: Register Reflection
async function listReflections(claimId) {
	const response = await api.get(`/claims/${claimId}/reflection`);

	return response.data;
}

async function registerReflection(claimId, reflection) {
	const response = await api.post(
		`/claims/${claimId}/reflection`,
		reflection,
	);

	return response.data;
}

async function deleteReflection(reflectionId) {
	const response = await api.delete(`/reflection/${reflectionId}`);

	return response.data;
}

async function reviewClaim(claimId) {
	const response = await api.post(`/claims/${claimId}/review`);

	return response.data;
}

export default {
	listQuestions,
	generateQuestions,
	generateSearchQueries,
	searchSources,
	listEvidences,
	registerEvidence,
	deleteEvidence,
	listReflections,
	registerReflection,
	deleteReflection,
	reviewClaim,
};
