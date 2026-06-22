import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { BannerLimite } from '../components/BannerLimite';

export function AppLayout() {
  const location = useLocation();
  const isWorkflowBuilder = location.pathname.includes('/automacoes');

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex font-sans antialiased selection:bg-[#25D366]/30 selection:text-white">
      <Sidebar />
      <main className={`flex-1 ml-64 min-h-screen flex flex-col bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,211,102,0.15),rgba(0,0,0,0))] ${
        isWorkflowBuilder ? 'p-0 overflow-hidden' : 'p-8 overflow-y-auto'
      }`}>
        <div className={isWorkflowBuilder ? 'w-full h-full flex-1 flex flex-col' : 'max-w-7xl mx-auto w-full'}>
          <BannerLimite />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
