// Frontend routes. Keep them aligned with the backend entity names.
export const ROUTES = {
	login: "/login",
	register: "/register",
	profile: "/profile",
	newInvestigation: "/investigations",
	investigationPattern: "/investigations/:id",
	investigation: (id) => `/investigations/${id}`,
	claimPattern: "/investigations/:investigationId/claims/:claimId",
	claim: (investigationId, claimId) =>
		`/investigations/${investigationId}/claims/${claimId}`,
};
