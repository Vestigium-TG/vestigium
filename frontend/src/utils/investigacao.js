// Formatadores e rotas compartilhados entre as telas de investigação.

export function formatarData(data) {
	if (!data) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "medium",
	}).format(new Date(data));
}

export function formatarDataHora(data) {
	if (!data) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(data));
}

export function formatarStatus(status) {
	switch (status) {
		case "em_andamento":
			return "Em andamento";
		case "concluida":
			return "Concluída";
		case "cancelada":
			return "Cancelada";
		default:
			return status || "-";
	}
}

// Domínio legível de uma URL ("https://www.site.com/a" -> "site.com").
export function dominio(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url || "";
	}
}

// Rotas do front. Se mudar o path no router, ajuste só aqui.
export const ROTAS = {
	novaInvestigacao: "/investigacoes",
	investigacao: (id) => `/investigacoes/${id}`,
	afirmacao: (investigacaoId, afirmacaoId) =>
		`/investigacoes/${investigacaoId}/afirmacoes/${afirmacaoId}`,
	login: "/login",
};
