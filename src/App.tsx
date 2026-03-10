import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import AdvisorWorkloadPage from "./pages/AdvisorWorkloadPage";
import DepartmentMonitoringPage from "./pages/DepartmentMonitoringPage";
import OutcomesPage from "./pages/OutcomesPage";
import CompliancePage from "./pages/CompliancePage";
import UserManagementPage from "./pages/UserManagementPage";
import GuidePage from "./pages/GuidePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/cases" replace />;
  return <>{children}</>;
};

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === 'advisor') return <Navigate to="/cases" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'department_chair']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
            <Route path="/cases/:caseId" element={<ProtectedRoute><CaseDetailPage /></ProtectedRoute>} />
            <Route path="/advisor-workload" element={<ProtectedRoute allowedRoles={['admin', 'department_chair']}><AdvisorWorkloadPage /></ProtectedRoute>} />
            <Route path="/department-monitoring" element={<ProtectedRoute allowedRoles={['admin', 'department_chair']}><DepartmentMonitoringPage /></ProtectedRoute>} />
            <Route path="/outcomes" element={<ProtectedRoute allowedRoles={['admin', 'department_chair']}><OutcomesPage /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute allowedRoles={['admin', 'department_chair']}><CompliancePage /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute allowedRoles={['admin']}><GuidePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
