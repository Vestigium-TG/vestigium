import api from "./api";

// UC08 — Gerar Perguntas Orientadoras
async function listarPerguntas(afirmacaoId) {
	const response = await api.get(
		`/afirmacoes/${afirmacaoId}/perguntas`
	);
	return response.data;
}

async function gerarPerguntas(afirmacaoId) {
	const response = await api.post(
		`/afirmacoes/${afirmacaoId}/perguntas`
	);
	return response.data;
}

// UC09 — Pesquisar Fontes
async function gerarConsultas(afirmacaoId) {
	const response = await api.post(
		`/afirmacoes/${afirmacaoId}/consultas`
	);

	// O backend retorna { afirmacao_id, consultas }.
	return response.data.consultas ?? [];
}

async function pesquisarFontes(afirmacaoId, consulta) {
	const response = await api.post(
		`/afirmacoes/${afirmacaoId}/pesquisar`,
		consulta ? { consulta } : undefined
	);

	// O backend retorna { mensagem, resultados }.
	return response.data.resultados ?? [];
}

// Fontes registradas na investigação
async function listarFontes(investigacaoId) {
	const response = await api.get(
		`/investigacoes/${investigacaoId}/fontes`
	);
	return response.data;
}

async function registrarFonte(investigacaoId, dados) {
	const response = await api.post(
		`/investigacoes/${investigacaoId}/fontes`,
		{
			fontes: [dados],
		}
	);

	// O backend retorna uma lista de fontes criadas.
	return response.data[0];
}

export default {
	listarPerguntas,
	gerarPerguntas,
	gerarConsultas,
	pesquisarFontes,
	listarFontes,
	registrarFonte,
};
