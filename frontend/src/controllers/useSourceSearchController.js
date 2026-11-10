import { useState } from "react";
import claimModel from "../models/claimModel";
import { getDomain } from "../utils/formatters";

function messageFromError(error, fallback) {
	const detail = error.response?.data?.detail;

	if (error.response?.status === 503) {
		return detail || "O serviço está indisponível no momento.";
	}
	return detail || fallback;
}

// The backend may name result fields differently; normalize them here.
function normalizeResult(item) {
	return {
		url: item.url ?? item.link ?? "",
		title: item.title ?? "",
		excerpt: item.excerpt ?? item.snippet ?? item.summary ?? "",
	};
}

function queryText(item) {
	return typeof item === "string" ? item : (item.text ?? item.query ?? "");
}

// UC09 — Search sources.
// Props: claimId, sources (already registered), onSelect(source) -> Promise
// Use `key={claimId}` in the parent to reset state when changing claims.
export default function useSourceSearchController({
	claimId,
	sources,
	onSelect,
}) {
	const [queries, setQueries] = useState([]);
	const [generatingQueries, setGeneratingQueries] = useState(false);
	const [activeQuery, setActiveQuery] = useState("");

	const [results, setResults] = useState([]);
	const [searchPerformed, setSearchPerformed] = useState(false);
	const [searching, setSearching] = useState(false);

	const [manualUrl, setManualUrl] = useState("");
	const [manualTitle, setManualTitle] = useState("");
	const [saving, setSaving] = useState(false);

	const [error, setError] = useState("");

	function isSelected(url) {
		return sources.some((source) => source.url === url);
	}

	async function suggestQueries() {
		try {
			setGeneratingQueries(true);
			setError("");
			const list = await claimModel.generateSearchQueries(claimId);
			setQueries((list ?? []).map(queryText).filter(Boolean));
		} catch (requestError) {
			console.error("Erro ao gerar sugestões de pesquisa:", requestError);
			setError(
				messageFromError(
					requestError,
					"Não foi possível gerar sugestões de pesquisa.",
				),
			);
		} finally {
			setGeneratingQueries(false);
		}
	}

	async function search(query) {
		try {
			setSearching(true);
			setError("");
			setActiveQuery(query ?? "");

			const list = await claimModel.searchSources(claimId, query);
			setResults(
				(list ?? [])
					.map(normalizeResult)
					.filter((result) => result.url),
			);
			setSearchPerformed(true);
		} catch (requestError) {
			console.error("Erro ao pesquisar fontes:", requestError);
			setResults([]);
			setSearchPerformed(false);
			setError(
				messageFromError(
					requestError,
					"Não foi possível pesquisar fontes. Tente novamente.",
				),
			);
		} finally {
			setSearching(false);
		}
	}

	async function select(source) {
		try {
			setSaving(true);
			setError("");
			await onSelect(source);
			return true;
		} catch (requestError) {
			console.error("Erro ao registrar fonte:", requestError);
			setError(
				messageFromError(
					requestError,
					"Não foi possível registrar a fonte.",
				),
			);
			return false;
		} finally {
			setSaving(false);
		}
	}

	function selectResult(result) {
		return select({
			url: result.url,
			title: result.title || getDomain(result.url),
			content: result.excerpt,
			type: "search",
		});
	}

	async function addManual(event) {
		event.preventDefault();

		const url = manualUrl.trim();
		if (!/^https?:\/\/\S+/i.test(url)) {
			setError(
				"Informe uma URL válida, começando com http:// ou https://.",
			);
			return;
		}

		const ok = await select({
			url,
			title: manualTitle.trim() || getDomain(url),
			type: "manual",
		});

		if (ok) {
			setManualUrl("");
			setManualTitle("");
		}
	}

	return {
		queries,
		generatingQueries,
		activeQuery,
		results,
		searchPerformed,
		searching,
		manualUrl,
		setManualUrl,
		manualTitle,
		setManualTitle,
		saving,
		error,
		isSelected,
		suggestQueries,
		search,
		selectResult,
		addManual,
	};
}
