
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import Icon from "../Icon";
import { formatarStatus, ROTAS } from "../../utils/investigacao";
import "../../pages/investigacao/investigacao.css";

/**
 * Layout comum das telas de investigação: topo + barra lateral + área de
 * conteúdo + rodapé.
 *
 * Props
 * - titulo / rotulo: título centralizado no topo (rotulo padrão: "INVESTIGAÇÃO")
 * - investigacoes, selecionadaId, carregando: dados da barra lateral
 * - onSelecionar(id), onNova(): ações da barra lateral
 * - menuItens: [{ rotulo, onClick, perigo?, desabilitado? }] (o "Sair" é automático)
 * - acoesTopo: nó extra à esquerda do botão de menu (ex.: botão "Salvar")
 * - rodape: conteúdo do rodapé (botões)
 * - children: conteúdo da página
 */
function InvestigacaoShell({
  titulo,
  rotulo = "INVESTIGAÇÃO",
  investigacoes = [],
  selecionadaId = null,
  carregando = false,
  onSelecionar,
  onNova,
  menuItens = [],
  acoesTopo = null,
  rodape = null,
  children,
}) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  function handleLogout() {
    try {
      authService.logout();
      navigate(ROTAS.login);
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
    }
  }

  function executar(acao) {
    setMenuAberto(false);
    acao?.();
  }

  return (
    <main className="investigacao-page">
      <header className="investigacao-topbar">
        <div className="investigacao-brand">
          <div className="investigacao-brand-icon">
            <Icon size={17}>
              <path d="M12 3 4 7l8 4 8-4-8-4Z" />
              <path d="M6 10v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V10" />
              <path d="M20 8v5" />
            </Icon>
          </div>
          <strong>Investigação Crítica</strong>
        </div>

        <div className="investigacao-topbar-title" aria-live="polite">
          <span>{rotulo}</span>
          <strong>{titulo}</strong>
        </div>

        <div className="investigacao-topbar-actions">
          {acoesTopo}

          <button
            type="button"
            className="investigacao-menu-button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
          >
            <Icon size={18}>
              <path d="M5 7h14M5 12h14M5 17h14" />
            </Icon>
          </button>

          {menuAberto && (
            <div className="investigacao-menu">
              {menuItens.map((item) => (
                <button
                  key={item.rotulo}
                  type="button"
                  className={item.perigo ? "investigacao-menu-danger" : ""}
                  onClick={() => executar(item.onClick)}
                  disabled={item.desabilitado}
                >
                  {item.rotulo}
                </button>
              ))}

              {menuItens.length > 0 && (
                <div className="investigacao-menu-divider" />
              )}

              <button type="button" onClick={() => executar(handleLogout)}>
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="investigacao-workspace">
        <aside className="investigacao-sidebar">
          <div className="sidebar-header">
            <div>
              <strong>Minhas investigações</strong>
              <span>
                {investigacoes.length}{" "}
                {investigacoes.length === 1 ? "investigação" : "investigações"}
              </span>
            </div>
            <button
              type="button"
              className="new-investigation-button"
              onClick={onNova}
              aria-label="Nova investigação"
            >
              +
            </button>
          </div>

          <div className="investigacao-list">
            {carregando ? (
              <p className="sidebar-message">Carregando...</p>
            ) : investigacoes.length === 0 ? (
              <p className="sidebar-message">Nenhuma investigação criada.</p>
            ) : (
              investigacoes.map((investigacao) => (
                <button
                  type="button"
                  key={investigacao.id}
                  className={`investigacao-list-item ${String(selecionadaId) === String(investigacao.id)
                      ? "investigacao-list-item-active"
                      : ""
                    }`}
                  onClick={() => onSelecionar?.(investigacao.id)}
                >
                  <span className="investigacao-list-title">
                    {investigacao.titulo}
                  </span>
                  <span className="investigacao-list-status">
                    <span className={`status-dot status-${investigacao.status}`} />
                    {formatarStatus(investigacao.status)}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="investigacao-content-area">{children}</div>
      </div>

      <footer className="investigacao-bottom-bar">{rodape}</footer>
    </main>
  );
}

export default InvestigacaoShell;
