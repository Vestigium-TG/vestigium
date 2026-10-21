import { useCallback, useEffect, useState } from "react";
import investigacaoService from "../services/investigacaoService";

// Carrega a lista de investigações do usuário (alimenta a barra lateral).
export default function useInvestigacoes() {
	const [investigacoes, setInvestigacoes] = useState([]);
	const [carregando, setCarregando] = useState(true);
	const [erro, setErro] = useState("");

	const recarregar = useCallback(async () => {
		try {
			setCarregando(true);
			setErro("");
			const dados = await investigacaoService.listar();
			setInvestigacoes(dados);
			return dados;
		} catch (error) {
			console.error("Erro ao carregar investigações:", error);
			setErro(
				error.response?.data?.detail ||
					"Não foi possível carregar as investigações.",
			);
			return [];
		} finally {
			setCarregando(false);
		}
	}, []);

	useEffect(() => {
		recarregar();
	}, [recarregar]);

	return { investigacoes, setInvestigacoes, carregando, erro, recarregar };
}
