import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import investigationModel from "../models/investigationModel";
import { ROUTES } from "../routes/paths";

export default function useClaimController() {
	const navigate = useNavigate();
	const { investigationId, claimId } = useParams();

	const [investigation, setInvestigation] = useState(null);
	const [claim, setClaim] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				setLoading(true);
				setError("");

				const data =
					await investigationModel.getById(investigationId);
				if (cancelled) return;

				const found = (data.claims ?? []).find(
					(item) => String(item.id) === String(claimId),
				);

				setInvestigation(data);

				if (!found) {
					setClaim(null);
					setError("Afirmação não encontrada.");
					return;
				}

				setClaim(found);
			} catch (requestError) {
				if (cancelled) return;
				console.error("Erro ao carregar afirmação:", requestError);
				setError(
					requestError.response?.data?.detail ||
						"Não foi possível carregar a afirmação.",
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
	}, [investigationId, claimId]);

	const claims = investigation?.claims ?? [];
	const index = claim
		? claims.findIndex((item) => String(item.id) === String(claim.id))
		: -1;
	const previous = index > 0 ? claims[index - 1] : null;
	const next =
		index >= 0 && index < claims.length - 1 ? claims[index + 1] : null;

	const evidenceCount =
		claim?.evidence_count ?? claim?.evidence?.length ?? 0;

	const goToClaim = useCallback(
		(target) => {
			if (!target) return;
			navigate(ROUTES.claim(investigationId, target.id));
		},
		[navigate, investigationId],
	);

	const goBack = useCallback(() => {
		navigate(ROUTES.investigation(investigationId));
	}, [navigate, investigationId]);

	const goToInvestigation = useCallback(
		(targetId) => {
			navigate(ROUTES.investigation(targetId));
		},
		[navigate],
	);

	const goToNewInvestigation = useCallback(() => {
		navigate(ROUTES.newInvestigation);
	}, [navigate]);

	return {
		investigationId,
		investigation,
		claim,
		claims,
		index,
		previous,
		next,
		evidenceCount,
		loading,
		error,
		goToClaim,
		goBack,
		goToInvestigation,
		goToNewInvestigation,
	};
}
