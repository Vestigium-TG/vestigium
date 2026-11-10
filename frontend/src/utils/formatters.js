// Shared formatters and display helpers for investigation screens.

export function formatDate(value) {
	if (!value) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "medium",
	}).format(new Date(value));
}

export function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}

export function formatStatus(status) {
	switch (status) {
		case "in_progress":
		case "em_andamento":
			return "Em andamento";
		case "completed":
		case "concluida":
			return "Concluída";
		case "cancelled":
		case "cancelada":
			return "Cancelada";
		default:
			return status || "-";
	}
}

// Maps legacy/backend status values to the CSS class suffix.
export function statusClass(status) {
	switch (status) {
		case "em_andamento":
			return "in-progress";
		case "concluida":
			return "completed";
		case "cancelada":
			return "cancelled";
		case "in_progress":
			return "in-progress";
		default:
			return status || "";
	}
}

// Human-readable domain for a URL ("https://www.site.com/a" -> "site.com").
export function getDomain(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url || "";
	}
}
