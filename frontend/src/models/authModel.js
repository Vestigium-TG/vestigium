import api from "./api";

async function register(email, password) {
	const response = await api.post("/auth/register", {
		email,
		password,
	});

	return response.data;
}

async function login(email, password) {
	const response = await api.post("/auth/login", {
		email,
		password,
	});

	localStorage.setItem("token", response.data.token);

	return response.data;
}

async function getMe() {
	const response = await api.get("/auth/me");

	return response.data;
}

function logout() {
	localStorage.removeItem("token");
}

export default {
	register,
	login,
	getMe,
	logout,
};
