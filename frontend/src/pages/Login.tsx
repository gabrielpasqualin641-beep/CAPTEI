import { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../store/authStore';
import { api } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CheckCircle2, X } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // ── Lê e consome a flag de cadastro recém-concluído ─────────────────────
  const justRegistered = useUIStore((state) => state.justRegistered);
  const setJustRegistered = useUIStore((state) => state.setJustRegistered);

  useEffect(() => {
    if (justRegistered) {
      setShowSuccessBanner(true);
      // Limpa a flag para que o toast não reapareça em visitas futuras
      setJustRegistered(false);
      // Auto-remove o banner após 8 s
      const timer = setTimeout(() => setShowSuccessBanner(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [justRegistered, setJustRegistered]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', { email, senha });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao fazer login.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-4">

      {/* ── Banner de sucesso pós-cadastro ────────────────────────────────── */}
      {showSuccessBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex w-full max-w-md animate-in fade-in slide-in-from-top-3 duration-500 items-start gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-4 py-3.5 shadow-lg"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-300">
              Conta criada com sucesso! 🎉
            </p>
            <p className="mt-0.5 text-xs text-emerald-400/80">
              Faça seu login abaixo para acessar o painel do Captei.
            </p>
          </div>
          <button
            aria-label="Fechar aviso"
            onClick={() => setShowSuccessBanner(false)}
            className="text-emerald-600 hover:text-emerald-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Card de login ─────────────────────────────────────────────────── */}
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="items-center space-y-3 text-center">
          <svg viewBox="0 0 120 36" width="150" height="45" aria-label="Captei">
            <text x="0" y="28" fontFamily="Arial Black" fontSize="28" fontWeight="900" fill="#ffffff">Capt</text>
            <text x="67" y="28" fontFamily="Arial Black" fontSize="28" fontWeight="900" fill="#25D366">ei</text>
          </svg>
          <CardDescription className="text-zinc-400">Prospecção Inteligente</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-zinc-700 bg-zinc-800 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="border-zinc-700 bg-zinc-800 focus:border-emerald-500"
              />
            </div>

            <Button
              id="btn-login"
              type="submit"
              className="w-full bg-[#25D366] text-white hover:bg-[#1DA851]"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Não tem uma conta?{' '}
            <Link
              to="/landing"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Criar conta grátis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
