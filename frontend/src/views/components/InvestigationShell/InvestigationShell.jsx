import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authModel from "../../../models/authModel";
import { ROUTES } from "../../../routes/paths";
import { formatStatus, statusClass } from "../../../utils/formatters";
import Icon from "../Icon";
import "../../pages/investigation/investigation.css";

/**
 * Shared layout for investigation screens: top bar + sidebar + content + footer.
 *
 * Props
 * - title / label: title centered in the top bar (default label: "INVESTIGAÇÃO")
 * - investigations, selectedId, loading: sidebar data
 * - onSelect(id), onNew(): sidebar actions
 * - menuItems: [{ label, onClick, danger?, disabled? }] ("Sair" is automatic)
 * - topActions: extra node to the left of the menu button (e.g. "Salvar")
 * - footer: footer content (buttons)
 * - children: page content
 */
function InvestigationShell({
	title,
	label = "INVESTIGAÇÃO",
	investigations = [],
	selectedId = null,
	loading = false,
	onSelect,
	onNew,
	menuItems = [],
	topActions = null,
	footer = null,
	children,
}) {
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);

	function handleLogout() {
		try {
			authModel.logout();
			navigate(ROUTES.login);
		} catch (error) {
			console.error("Erro ao encerrar sessão:", error);
		}
	}

	function runAction(action) {
		setMenuOpen(false);
		action?.();
	}

	return (
		<main className="investigation-page">
			<header className="investigation-topbar">
				<div className="investigation-brand">
					<div className="investigation-brand-icon">
						<Icon size={17}>
							<path d="M12 3 4 7l8 4 8-4-8-4Z" />
							<path d="M6 10v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V10" />
							<path d="M20 8v5" />
						</Icon>
					</div>
					<strong>Investigação Crítica</strong>
				</div>

				<div className="investigation-topbar-title" aria-live="polite">
					<span>{label}</span>
					<strong>{title}</strong>
				</div>

				<div className="investigation-topbar-actions">
					{topActions}

					<button
						type="button"
						className="investigation-menu-button"
						onClick={() => setMenuOpen((open) => !open)}
						aria-label="Abrir menu"
						aria-expanded={menuOpen}
					>
						<Icon size={18}>
							<path d="M5 7h14M5 12h14M5 17h14" />
						</Icon>
					</button>

					{menuOpen && (
						<div className="investigation-menu">
							{menuItems.map((item) => (
								<button
									key={item.label}
									type="button"
									className={
										item.danger
											? "investigation-menu-danger"
											: ""
									}
									onClick={() => runAction(item.onClick)}
									disabled={item.disabled}
								>
									{item.label}
								</button>
							))}

							{menuItems.length > 0 && (
								<div className="investigation-menu-divider" />
							)}

							<button
								type="button"
								onClick={() => runAction(handleLogout)}
							>
								Sair
							</button>
						</div>
					)}
				</div>
			</header>

			<div className="investigation-workspace">
				<aside className="investigation-sidebar">
					<div className="sidebar-header">
						<div>
							<strong>Minhas investigações</strong>
							<span>
								{investigations.length}{" "}
								{investigations.length === 1
									? "investigação"
									: "investigações"}
							</span>
						</div>
						<button
							type="button"
							className="new-investigation-button"
							onClick={onNew}
							aria-label="Nova investigação"
						>
							+
						</button>
					</div>

					<div className="investigation-list">
						{loading ? (
							<p className="sidebar-message">Carregando...</p>
						) : investigations.length === 0 ? (
							<p className="sidebar-message">
								Nenhuma investigação criada.
							</p>
						) : (
							investigations.map((investigation) => (
								<button
									type="button"
									key={investigation.id}
									className={`investigation-list-item ${String(selectedId) ===
											String(investigation.id)
											? "investigation-list-item-active"
											: ""
										}`}
									onClick={() =>
										onSelect?.(investigation.id)
									}
								>
									<span className="investigation-list-title">
										{investigation.title}
									</span>
									<span className="investigation-list-status">
										<span
											className={`status-dot status-${statusClass(
												investigation.status,
											)}`}
										/>
										{formatStatus(investigation.status)}
									</span>
								</button>
							))
						)}
					</div>
				</aside>

				<div className="investigation-content-area">{children}</div>
			</div>

			<footer className="investigation-bottom-bar">{footer}</footer>
		</main>
	);
}

export default InvestigationShell;
