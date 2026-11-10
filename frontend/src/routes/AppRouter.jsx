import { Navigate, Route, Routes } from "react-router-dom";
import ClaimView from "../views/pages/claim/ClaimView";
import InvestigationView from "../views/pages/investigation/InvestigationView";
import LoginView from "../views/pages/login/LoginView";
import ProfileView from "../views/pages/profile/ProfileView";
import RegisterView from "../views/pages/register/RegisterView";
import { ROUTES } from "./paths";

function ProtectedRoute({ children }) {
	return localStorage.getItem("token") ? (
		children
	) : (
		<Navigate to={ROUTES.login} replace />
	);
}

function AppRouter() {
	return (
		<Routes>
			<Route path={ROUTES.login} element={<LoginView />} />
			<Route path={ROUTES.register} element={<RegisterView />} />
			<Route
				path={ROUTES.newInvestigation}
				element={
					<ProtectedRoute>
						<InvestigationView />
					</ProtectedRoute>
				}
			/>
			<Route
				path={ROUTES.investigationPattern}
				element={
					<ProtectedRoute>
						<InvestigationView />
					</ProtectedRoute>
				}
			/>
			<Route
				path={ROUTES.claimPattern}
				element={
					<ProtectedRoute>
						<ClaimView />
					</ProtectedRoute>
				}
			/>
			<Route
				path={ROUTES.profile}
				element={
					<ProtectedRoute>
						<ProfileView />
					</ProtectedRoute>
				}
			/>
			<Route path="*" element={<Navigate to={ROUTES.login} replace />} />
		</Routes>
	);
}

export default AppRouter;
