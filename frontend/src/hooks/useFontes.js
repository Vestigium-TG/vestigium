import { useCallback, useEffect, useState } from "react";
import afirmacaoService from "../services/afirmacaoService";

// Fontes registradas na investigação (compartilhadas entre as afirmações dela).
export default function useFontes(investigacaoId) {
	const [fontes, setFontes] = useState([]);
	const [carregando, setCarregando] = useState(true);
	const [erro, setErro] = useState("");

	useEffect(() => {
		let cancelado = false;

		async function carregar() {
			try {
				setCarregando(true);
				setErro("");
				const lista = await afirmacaoService.listarFontes(investigacaoId);
				if (!cancelado) setFontes(lista ?? []);
			} catch (error) {
				console.error("Erro ao carregar fontes:", error);
				if (!cancelado) {
					setErro(
						error.response?.data?.detail ||
							"Não foi possível carregar as fontes.",
					);
				}
			} finally {
				if (!cancelado) setCarregando(false);
			}
		}

		carregar();
		return () => {
			cancelado = true;
		};
	}, [investigacaoId]);

	// RN07: só entra na investigação a fonte que o investigador escolher.
	// Lança o erro da API para quem chamou mostrar a mensagem.
	const registrar = useCallback(
		async (dados) => {
			const existente = fontes.find((f) => f.url === dados.url);
			if (existente) return existente;

			const nova = await afirmacaoService.registrarFonte(investigacaoId, dados);
			setFontes((atual) => [...atual, nova]);
			return nova;
		},
		[fontes, investigacaoId],
	);

	return { fontes, carregando, erro, registrar };
}
