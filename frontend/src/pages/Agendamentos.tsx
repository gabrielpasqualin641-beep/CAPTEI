import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Agendamentos() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Agendamentos</h1>
        <p className="text-zinc-400 mt-2">Gerencie e visualize seus agendamentos programados.</p>
      </div>

      <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg mt-8">
        <CardHeader className="flex flex-col items-center justify-center pt-12 pb-4">
          <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
            <CalendarClock className="h-12 w-12 text-[#25D366]" />
          </div>
          <CardTitle className="text-xl font-bold text-white text-center">Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pb-12">
          <p className="text-zinc-400 text-center max-w-md">
            O módulo de agendamentos visuais está sendo preparado. Em breve você poderá arrastar, 
            soltar e organizar todos os seus disparos diretamente em um calendário interativo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
