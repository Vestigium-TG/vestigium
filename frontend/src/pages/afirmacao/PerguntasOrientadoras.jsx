import { useCallback, useEffect, useRef, useState } from "react";
import afirmacaoService from "../../services/afirmacaoService";
import "./etapas.css";

function mensagemDeErro(error) {
	const status = error.response?.status;
	const detalhe = error.response?.data?.detail;

	if (status === 503) {
		return detalhe || "O serviço de IA está indisponível no momento.";
	}
	if (status === 422) {
		return "A IA não gerou perguntas adequadas. Tente novamente.";
	}
	return detalhe || "Não foi possível obter as perguntas orientadoras.";
}

// UC08 – Gerar Perguntas Orientadoras
// Lista as perguntas já salvas; se não houver nenhuma, gera na primeira abertura.
// Use `key={afirmacaoId}` no pai para reiniciar o estado ao trocar de afirmação.
function PerguntasOrientadoras({ afirmacaoId }) {
	const [perguntas, setPerguntas] = useState([]);
	const [carregando, setCarregando] = useState(true);
	const [gerando, setGerando] = useState(false);
	const [erro, setErro] = useState("");

	// Evita gerar duas vezes (o backend grava cada geração, então duplicaria).
	const geradaPara = useRef(null);

	const gerar = useCallback(async () => {
		try {
			setGerando(true);
			setErro("");
			const lista = await afirmacaoService.gerarPerguntas(afirmacaoId);
			setPerguntas(lista ?? []);
		} catch (error) {
			console.error("Erro ao gerar perguntas:", error);
			setErro(mensagemDeErro(error));
		} finally {
			setGerando(false);
		}
	}, [afirmacaoId]);

	useEffect(() => {
		let cancelado = false;

		async function iniciar() {
			try {
				const lista = await afirmacaoService.listarPerguntas(afirmacaoId);
				if (cancelado) return;

				setPerguntas(lista ?? []);
				setCarregando(false);

				if ((lista ?? []).length === 0 && geradaPara.current !== afirmacaoId) {
					geradaPara.current = afirmacaoId;
					await gerar();
				}
			} catch (error) {
				console.error("Erro ao carregar perguntas:", error);
				if (!cancelado) {
					setErro(mensagemDeErro(error));
					setCarregando(false);
				}
			}
		}

		iniciar();
		return () => {
			cancelado = true;
		};
	}, [afirmacaoId, gerar]);

	if (carregando) {
		return <div className="etapa-vazio">Carregando perguntas...</div>;
	}

	if (gerando) {
		return (
			<div className="etapa-vazio">
				<div className="etapa-spinner" />
				<strong>Gerando perguntas orientadoras...</strong>
			</div>
		);
	}

	if (perguntas.length > 0) {
		return (
			<ol className="etapa-perguntas">
				{perguntas.map((pergunta, indice) => (
					<li className="etapa-card etapa-pergunta" key={pergunta.id}>
						<span className="etapa-numero">{indice + 1}</span>
						<span>{pergunta.texto}</span>
					</li>
				))}
			</ol>
		);
	}

	return (
		<div className="etapa-vazio">
			{erro ? (
				<div className="etapa-erro">{erro}</div>
			) : (
				<span>Ainda não há perguntas para esta afirmação.</span>
			)}
			<button type="button" className="etapa-botao" onClick={gerar}>
				{erro ? "Tentar novamente" : "Gerar perguntas"}
			</button>
		</div>
	);
}

export default PerguntasOrientadoras;
