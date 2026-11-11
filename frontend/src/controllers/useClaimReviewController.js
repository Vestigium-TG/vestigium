import { useCallback, useEffect, useRef, useState } from "react";
import claimModel from "../models/claimModel";

export default function useClaimReviewController(claimId) {
	const [reviewState, setReviewState] = useState(null);
	const [loadingClaimId, setLoadingClaimId] = useState(null);
	const [errorState, setErrorState] = useState(null);
	const requestId = useRef(0);

	useEffect(() => {
		requestId.current += 1;
		setReviewState(null);
		setLoadingClaimId(null);
		setErrorState(null);
	}, [claimId]);

	const review =
		reviewState && reviewState.claimId === claimId
			? reviewState.data
			: null;
	const loading =
		loadingClaimId !== null && loadingClaimId === claimId;
	const error =
		errorState && errorState.claimId === claimId
			? errorState.message
			: "";

	const analyze = useCallback(async () => {
		const currentRequestId = ++requestId.current;
		try {
			setLoadingClaimId(claimId);
			setErrorState(null);
			setReviewState(null);
			const result = await claimModel.reviewClaim(claimId);
			if (requestId.current === currentRequestId) {
				setReviewState({ claimId, data: result });
			}
			return result;
		} catch (requestError) {
			console.error("Erro ao analisar afirmação:", requestError);
			const status = requestError.response?.status;
			const detail = requestError.response?.data?.detail;
			let message;

			if (status === 503) {
				message =
					detail || "O serviço de IA está indisponível no momento.";
			} else if (status === 422) {
				message =
					detail ||
					"Adicione fontes ou evidências antes de solicitar a análise.";
			} else {
				message = detail || "Não foi possível analisar a afirmação.";
			}
			if (requestId.current === currentRequestId) {
				setErrorState({ claimId, message });
			}
			return null;
		} finally {
			if (requestId.current === currentRequestId) {
				setLoadingClaimId(null);
			}
		}
	}, [claimId]);

	return { review, loading, error, analyze };
}
