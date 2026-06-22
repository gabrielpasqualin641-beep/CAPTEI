import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Smartphone, Plus, QrCode, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function Configuracoes() {
  const [instancias, setInstancias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaInstancia, setNovaInstancia] = useState('');
  const [qrCode, setQrCode] = useState<{id: string, base64: string} | null>(null);

  useEffect(() => {
    fetchInstancias();
  }, []);

  async function fetchInstancias() {
    try {
      const { data } = await api.get('/instances');
      setInstancias(data);
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCriarInstancia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaInstancia) return;

    try {
      await api.post('/instances', { nome: novaInstancia });
      setNovaInstancia('');
      fetchInstancias();
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      alert('Erro ao criar instância');
    }
  };

  const showQrCode = async (id: string) => {
    try {
      const { data } = await api.get(`/instances/${id}/qrcode`);
      if (data.base64) {
        setQrCode({ id, base64: data.base64 });
      } else {
        alert('QR Code ainda não está pronto. Tente novamente em alguns segundos.');
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      alert('Erro ao buscar QR Code');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open':
      case 'conectado': 
        return <Badge className="bg-[#25D366] text-white">Conectado</Badge>;
      case 'connecting':
      case 'aguardando_qr': 
        return <Badge className="bg-yellow-500 text-white">Aguardando QR</Badge>;
      default: 
        return <Badge className="bg-zinc-600 text-white">Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
        <p className="text-zinc-400 mt-2">Gerencie suas instâncias do WhatsApp via Evolution API.</p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100 flex items-center gap-2">
            <Smartphone size={20} /> Instâncias do WhatsApp
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Conecte seus números de WhatsApp para realizar os disparos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCriarInstancia} className="flex gap-4">
            <Input 
              placeholder="Nome da Instância (ex: Vendas_01)" 
              value={novaInstancia}
              onChange={e => setNovaInstancia(e.target.value)}
              className="bg-zinc-800 border-zinc-700 max-w-sm"
            />
            <Button type="submit" className="bg-[#25D366] hover:bg-[#1DA851] text-white">
              <Plus size={18} className="mr-2" /> Nova Instância
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {loading ? (
              <div className="text-zinc-500">Carregando...</div>
            ) : instancias.map(inst => (
              <Card key={inst.id} className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-zinc-100">{inst.nome}</h3>
                      <p className="text-xs text-zinc-500 mt-1">ID: {inst.id.split('-')[0]}</p>
                    </div>
                    {getStatusBadge(inst.status)}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {(inst.status === 'aguardando_qr' || inst.status === 'connecting' || inst.status === 'close') && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                        onClick={() => showQrCode(inst.id)}
                      >
                        <QrCode size={16} className="mr-2" /> Gerar QR
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex-1">
                      <RefreshCw size={16} className="mr-2" /> Sincronizar
                    </Button>
                    <Button size="sm" variant="destructive" className="px-2">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {qrCode && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 max-w-sm w-full text-center">
                <h3 className="text-xl font-bold text-white mb-4">Leia o QR Code</h3>
                <p className="text-sm text-zinc-400 mb-6">Abra o WhatsApp, vá em "Aparelhos conectados" e aponte a câmera.</p>
                <div className="bg-white p-2 rounded-lg inline-block mb-6">
                  <img src={qrCode.base64} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <Button onClick={() => { setQrCode(null); fetchInstancias(); }} className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
