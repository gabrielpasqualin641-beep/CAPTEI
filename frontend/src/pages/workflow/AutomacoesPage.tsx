import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { WorkflowBuilder } from './WorkflowBuilder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Workflow, X } from 'lucide-react';

export default function AutomacoesPage() {
  const [activeWorkflow, setActiveWorkflow] = useState<{ id: string; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    
    setActiveWorkflow({
      id: `wf-${Date.now()}`,
      name: newWorkflowName.trim()
    });
    setIsModalOpen(false);
    setNewWorkflowName('');
  };

  if (activeWorkflow) {
    return (
      <div className="h-[calc(100vh-0px)] w-full overflow-hidden relative flex flex-col">
        <div className="absolute top-4 left-4 z-50">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => setActiveWorkflow(null)}
          >
            <X size={16} className="mr-2" /> Voltar
          </Button>
        </div>
        <ReactFlowProvider>
          <WorkflowBuilder
            workflowId={activeWorkflow.id}
            workflowName={activeWorkflow.name}
          />
        </ReactFlowProvider>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Automações</h1>
          <p className="text-zinc-400 mt-2">Crie fluxos de conversa inteligentes e filtros avançados para o seu CRM.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#25D366] text-white hover:bg-[#1DA851] font-bold shadow-lg shadow-emerald-900/20"
        >
          <Plus size={18} className="mr-2" />
          Criar Nova Automação
        </Button>
      </div>

      {/* Lista Vazia Temporária */}
      <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
            <Workflow className="h-12 w-12 text-[#25D366]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma automação ativa</h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            Você ainda não possui automações rodando. Clique no botão acima para construir seu primeiro fluxo visual.
          </p>
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="outline" 
            className="border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/30"
          >
            Iniciar Construtor
          </Button>
        </CardContent>
      </Card>

      {/* Modal Customizado Nativo em Tailwind */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Nova Automação</h2>
              <p className="text-sm text-slate-400 mt-1">
                Dê um nome para identificar o seu novo fluxo de mensagens e triagem.
              </p>
            </div>

            <form onSubmit={handleCreate}>
              <div className="mb-6">
                <Input
                  id="name"
                  placeholder="Ex: Qualificação de Leads Locais"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white focus-visible:ring-emerald-500 placeholder:text-slate-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!newWorkflowName.trim()} 
                  className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Iniciar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
