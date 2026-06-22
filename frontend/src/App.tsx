import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AppLayout } from './layouts/AppLayout';
import { SearchLeads } from './pages/SearchLeads';
import { Leads } from './pages/Leads';
import { Templates } from './pages/Templates';
import { Campanhas } from './pages/Campanhas';
import { Configuracoes } from './pages/Configuracoes';
import Planos from './pages/Planos';
import AutomacoesPage from './pages/workflow/AutomacoesPage';
import { Agendamentos } from './pages/Agendamentos';

// Rota protegida — redireciona para /login se não autenticado
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ── Rotas públicas ──────────────────────────────────────────── */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* ── Rotas protegidas (requerem autenticação) ─────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="buscar" element={<SearchLeads />} />
          <Route path="leads" element={<Leads />} />
          <Route path="templates" element={<Templates />} />
          <Route path="campanhas" element={<Campanhas />} />
          <Route path="automacoes" element={<AutomacoesPage />} />
          <Route path="agendamentos" element={<Agendamentos />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="planos" element={<Planos />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </Router>
  );
}


