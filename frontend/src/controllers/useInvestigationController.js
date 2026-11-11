import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import investigationModel from "../models/investigationModel";
import { ROUTES } from "../routes/paths";

const INITIAL_STATUS = "in_progress";

export default function useInvestigationController() {
	const navigate = useNavigate();
	const { id } = useParams();

	const [investigations, setInvestigations] = useState([]);
	const [selectedInvestigation, setSelectedInvestigation] = useState(null);
	const [claims, setClaims] = useState([]);

	const [title, setTitle] = useState("");
	const [inputType, setInputType] = useState("url");
	const [originalContent, setOriginalContent] = useState("");
	const [status, setStatus] = useState(INITIAL_STATUS);

	const [mode, setMode] = useState("create");

	const [loading, setLoading] = useState(true);
	const [analyzing, setAnalyzing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [selectedClaimId, setSelectedClaimId] = useState(null);

	const isEditing = mode === "edit";
	const isCreating = mode === "create";

	const displayedTitle = isCreating
		? "Nova investigação"
		: selectedInvestigation?.title || "Investigação";

	const claimCount = claims.length;

	const clearMessages = useCallback(() => {
		setError("");
		setSuccess("");
	}, []);

	const applyInvestigation = useCallback((investigation) => {
		setSelectedInvestigation(investigation);
		setTitle(investigation.title);
		setInputType(investigation.input_type);
		setOriginalContent(investigation.original_content);
		setStatus(investigation.status);
		setClaims(investigation.claims ?? []);
		setSelectedClaimId(null);
		setMode("view");
	}, []);

	const clearForm = useCallback(() => {
		setSelectedInvestigation(null);
		setClaims([]);
		setSelectedClaimId(null);

		setTitle("");
		setInputType("url");
		setOriginalContent("");
		setStatus(INITIAL_STATUS);

		setMode("create");
		clearMessages();
	}, [clearMessages]);

	const reloadInvestigations = useCallback(async () => {
		try {
			setError("");
			const data = await investigationModel.list();
			setInvestigations(data);
			return data;
		} catch (requestError) {
			console.error("Erro ao carregar investigações:", requestError);
			setError(
				requestError.response?.data?.detail ||
					"Não foi possível carregar as investigações.",
			);
			return [];
		}
	}, []);

	const loadInvestigation = useCallback(
		async (investigationId) => {
			clearMessages();
			const investigation =
				await investigationModel.getById(investigationId);
			applyInvestigation(investigation);
			return investigation;
		},
		[applyInvestigation, clearMessages],
	);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				setLoading(true);

				const data = await investigationModel.list();
				if (cancelled) return;
				setInvestigations(data);

				if (id) {
					const investigation =
						await investigationModel.getById(id);
					if (!cancelled) {
						applyInvestigation(investigation);
					}
				} else {
					clearForm();
				}
			} catch (requestError) {
				if (cancelled) return;
				console.error("Erro ao carregar investigações:", requestError);
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível carregar as investigações.",
				);
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, [id, applyInvestigation, clearForm]);

	const startNewInvestigation = useCallback(() => {
		clearForm();
		navigate(ROUTES.newInvestigation);
	}, [clearForm, navigate]);

	const selectInvestigation = useCallback(
		(investigationId) => {
			clearMessages();
			navigate(ROUTES.investigation(investigationId));
		},
		[clearMessages, navigate],
	);

	const startEditing = useCallback(() => {
		clearMessages();
		setMode("edit");
	}, [clearMessages]);

	const cancelEditing = useCallback(() => {
		if (!selectedInvestigation) {
			startNewInvestigation();
			return;
		}

		setTitle(selectedInvestigation.title);
		setInputType(selectedInvestigation.input_type);
		setOriginalContent(selectedInvestigation.original_content);
		setStatus(selectedInvestigation.status);
		setMode("view");
		clearMessages();
	}, [selectedInvestigation, startNewInvestigation, clearMessages]);

	const runClaimIdentification = useCallback(
		async (investigationId, successMessage) => {
			try {
				setAnalyzing(true);
				clearMessages();
				setSelectedClaimId(null);

				const result =
					await investigationModel.identifyClaims(investigationId);

				setClaims(result ?? []);
				setSuccess(successMessage);
			} catch (requestError) {
				console.error("Erro ao identificar afirmações:", requestError);

				if (requestError.response?.status === 422) {
					setClaims([]);
					setError(
						requestError.response?.data?.detail ||
							"Nenhuma afirmação relevante foi identificada.",
					);
				} else if (requestError.response?.status === 503) {
					setError(
						requestError.response?.data?.detail ||
							"O serviço de IA está indisponível no momento.",
					);
				} else {
					setError(
						requestError.response?.data?.detail ||
							"Não foi possível identificar as afirmações.",
					);
				}
			} finally {
				setAnalyzing(false);
			}
		},
		[clearMessages],
	);

	const handleSubmit = useCallback(
		async (event) => {
			event.preventDefault();
			clearMessages();

			if (!title.trim()) {
				setError("Informe um título para a investigação.");
				return;
			}

			if (!originalContent.trim()) {
				setError("Informe o conteúdo da investigação.");
				return;
			}

			if (
				inputType === "url" &&
				!/^https?:\/\/\S+/i.test(originalContent.trim())
			) {
				setError("Informe uma URL válida.");
				return;
			}

			try {
				setSaving(true);

				if (isCreating) {
					const response = await investigationModel.create({
						title: title.trim(),
						input_type: inputType,
						original_content: originalContent.trim(),
					});

					await reloadInvestigations();
					await loadInvestigation(response.id);
					await runClaimIdentification(
						response.id,
						"Investigação criada e conteúdo processado.",
					);
					navigate(ROUTES.investigation(response.id));
				} else {
					await investigationModel.update(selectedInvestigation.id, {
						title: title.trim(),
						input_type: inputType,
						original_content: originalContent.trim(),
						status,
					});

					const updated = await investigationModel.getById(
						selectedInvestigation.id,
					);

					applyInvestigation(updated);
					await reloadInvestigations();

					setSuccess("Investigação atualizada com sucesso.");
				}
			} catch (requestError) {
				console.error("Erro ao salvar investigação:", requestError);
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível salvar a investigação.",
				);
			} finally {
				setSaving(false);
			}
		},
		[
			clearMessages,
			title,
			originalContent,
			inputType,
			isCreating,
			reloadInvestigations,
			loadInvestigation,
			runClaimIdentification,
			navigate,
			selectedInvestigation,
			status,
			applyInvestigation,
		],
	);

	const handleDelete = useCallback(async () => {
		if (!selectedInvestigation) {
			return;
		}

		const confirmed = window.confirm(
			`Deseja realmente excluir a investigação "${selectedInvestigation.title}"? Essa ação não pode ser desfeita.`,
		);

		if (!confirmed) {
			return;
		}

		try {
			setDeleting(true);
			clearMessages();

			await investigationModel.remove(selectedInvestigation.id);

			const remaining = investigations.filter(
				(item) => item.id !== selectedInvestigation.id,
			);

			setInvestigations(remaining);

			if (remaining.length > 0) {
				navigate(ROUTES.investigation(remaining[0].id));
			} else {
				startNewInvestigation();
			}
		} catch (requestError) {
			console.error("Erro ao excluir investigação:", requestError);
			setError(
				requestError.response?.data?.detail ||
					"Não foi possível excluir a investigação.",
			);
		} finally {
			setDeleting(false);
		}
	}, [
		selectedInvestigation,
		investigations,
		clearMessages,
		navigate,
		startNewInvestigation,
	]);

	const selectClaim = useCallback(
		(claim) => {
			if (!selectedInvestigation) {
				return;
			}

			setSelectedClaimId(claim.id);
			navigate(ROUTES.claim(selectedInvestigation.id, claim.id));
		},
		[navigate, selectedInvestigation],
	);

	const markInvestigationConcluded = useCallback(() => {
		if (!selectedInvestigation) {
			return;
		}

		setStatus("concluida");
		setSelectedInvestigation((current) =>
			current ? { ...current, status: "concluida" } : current,
		);
		setInvestigations((current) =>
			current.map((item) =>
				String(item.id) === String(selectedInvestigation.id)
					? { ...item, status: "concluida" }
					: item,
			),
		);
	}, [selectedInvestigation]);

	return {
		investigations,
		selectedInvestigation,
		claims,
		title,
		setTitle,
		inputType,
		setInputType,
		originalContent,
		setOriginalContent,
		status,
		setStatus,
		mode,
		isEditing,
		isCreating,
		displayedTitle,
		claimCount,
		loading,
		analyzing,
		saving,
		deleting,
		error,
		success,
		selectedClaimId,
		startNewInvestigation,
		selectInvestigation,
		startEditing,
		cancelEditing,
		runClaimIdentification,
		handleSubmit,
		handleDelete,
		selectClaim,
		markInvestigationConcluded,
	};
}
