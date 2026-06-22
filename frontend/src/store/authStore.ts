import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Tipos de Usuário ────────────────────────────────────────────────────────

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
}

// ─── Auth Store (com persist) ────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// ─── UI Store (sem persist — apenas em memória) ──────────────────────────────
// Sinaliza fluxos de UI transitórios entre rotas, como o toast pós-cadastro.

interface UIState {
  /** True imediatamente após o cadastro bem-sucedido na Landing Page. */
  justRegistered: boolean;
  setJustRegistered: (value: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  justRegistered: false,
  setJustRegistered: (value) => set({ justRegistered: value }),
}));

