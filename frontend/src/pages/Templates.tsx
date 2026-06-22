import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, MessageSquare, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [nicho, setNicho] = useState('');
  const [conteudo, setConteudo] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSalvar = async () => {
    if (!nome || !conteudo) {
      alert("Nome e Mensagem são obrigatórios.");
      return;
    }
    
    try {
      await api.post('/templates', {
        nome,
        nicho: nicho || null,
        conteudo
      });
      setIsModalOpen(false);
      setNome('');
      setNicho('');
      setConteudo('');
      fetchTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar o template.');
    }
  };

  const insertVariable = (variable: string) => {
    setConteudo(prev => prev + `{{${variable}}}`);
  };

  const renderPreview = () => {
    let preview = conteudo;
    preview = preview.replace(/{{nome}}/g, 'João da Silva');
    preview = preview.replace(/{{cidade}}/g, 'São Paulo');
    preview = preview.replace(/{{nicho}}/g, nicho || 'Restaurante');
    preview = preview.replace(/{{site}}/g, 'www.exemplo.com.br');
    preview = preview.replace(/{{instagram}}/g, '@joaodasilva');
    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Templates de Mensagem</h1>
          <p className="text-zinc-400 mt-2">Crie scripts personalizados com variáveis dinâmicas (ex: {"{{nome}}"}, {"{{cidade}}"}).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-[#25D366] hover:bg-[#1DA851] text-white">
          <Plus className="mr-2" size={18} />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-zinc-500">Carregando...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum template criado ainda.</p>
            <p className="text-sm">Clique em "Novo Template" para começar a criar suas mensagens.</p>
          </div>
        ) : (
          templates.map((tpl) => (
            <Card key={tpl.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-zinc-100 flex justify-between items-start">
                  {tpl.nome}
                  <div className="flex gap-1 text-zinc-500">
                    <button className="hover:text-blue-400 transition-colors p-1"><Edit size={16}/></button>
                    <button className="hover:text-red-400 transition-colors p-1"><Trash2 size={16}/></button>
                  </div>
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  {tpl.nicho || 'Geral'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="bg-zinc-950 p-3 rounded text-sm text-zinc-300 font-mono overflow-y-auto max-h-32 whitespace-pre-wrap">
                  {tpl.conteudo.length > 150 ? tpl.conteudo.substring(0, 150) + '...' : tpl.conteudo}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Novo Template</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Nome do Template</label>
                  <Input 
                    placeholder="Ex: Prospecção E-commerce" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Nicho (Opcional)</label>
                  <Input 
                    placeholder="Ex: Moda" 
                    value={nicho}
                    onChange={(e) => setNicho(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex justify-between">
                  <span>Mensagem</span>
                  <span className="text-xs text-zinc-500">Use os atalhos abaixo para inserir variáveis</span>
                </label>
                
                <div className="flex gap-2 flex-wrap mb-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable('nome')} className="h-7 text-xs border-zinc-700 text-zinc-300">{"{{nome}}"}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable('cidade')} className="h-7 text-xs border-zinc-700 text-zinc-300">{"{{cidade}}"}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable('nicho')} className="h-7 text-xs border-zinc-700 text-zinc-300">{"{{nicho}}"}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable('site')} className="h-7 text-xs border-zinc-700 text-zinc-300">{"{{site}}"}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertVariable('instagram')} className="h-7 text-xs border-zinc-700 text-zinc-300">{"{{instagram}}"}</Button>
                </div>

                <textarea
                  className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Olá {{nome}}, tudo bem? Vi sua loja de {{nicho}} em {{cidade}}..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Preview (Como o lead vai ver)</label>
                <div className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-zinc-300 text-sm whitespace-pre-wrap min-h-[80px]">
                  {renderPreview() || <span className="text-zinc-500 italic">O preview da mensagem aparecerá aqui...</span>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-900 rounded-b-lg">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-300 hover:text-white">
                Cancelar
              </Button>
              <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
