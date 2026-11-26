import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { gerarArtePromocao } from './utils/gerarArteCanvas';
import { Calendar, Send, Trash2, Image as ImageIcon, Sparkles, Clock, Upload } from 'lucide-react';

export default function App() {
  const [titulo, setTitulo] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');
  const [precoPromo, setPrecoPromo] = useState('');
  const [cupom, setCupom] = useState('');
  const [linkAfiliado, setLinkAfiliado] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [legenda, setLegenda] = useState('');
  const [dataAgendada, setDataAgendada] = useState('');
  const [redes, setRedes] = useState({
    instagram: true,
    whatsapp: true,
  });

  const [previewArte, setPreviewArte] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [fila, setFila] = useState([]);

  useEffect(() => {
    carregarFila();
  }, []);

  useEffect(() => {
    if (!titulo || !precoPromo) return;
    const de = precoOriginal ? `❌ De: R$ ${Number(precoOriginal).toFixed(2).replace('.', ',')}\n` : '';
    const por = `✅ Por: R$ ${Number(precoPromo).toFixed(2).replace('.', ',')}\n`;
    const txtCupom = cupom ? `🎟️ Cupom: ${cupom.toUpperCase()}\n` : '';
    const link = linkAfiliado ? `\n🛒 Compre aqui: ${linkAfiliado}` : '';

    setLegenda(`🔥 OFERTA IMPERDÍVEL!\n\n${titulo}\n\n${de}${por}${txtCupom}${link}\n\n#promocao #oferta #desconto`);
  }, [titulo, precoOriginal, precoPromo, cupom, linkAfiliado]);

  async function carregarFila() {
    const { data, error } = await supabase
      .from('fila_publicacoes')
      .select(`
        id,
        rede_social,
        status,
        data_agendada,
        produtos_promocoes (
          titulo,
          preco_promo,
          arte_gerada_url
        )
      `)
      .order('data_agendada', { ascending: true });

    if (!error && data) setFila(data);
  }

  function handleArquivoLocal(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImagemUrl(localUrl);
  }

  async function handleGerarPreview() {
    if (!titulo || !precoOriginal || !precoPromo) {
      alert('Preencha título, preço original e preço promocional.');
      return;
    }
    const blob = await gerarArtePromocao({
      titulo,
      precoOriginal: parseFloat(precoOriginal),
      precoPromo: parseFloat(precoPromo),
      cupom,
      imagemUrl,
    });
    setPreviewArte(URL.createObjectURL(blob));
  }

  async function handleSalvarEAgendar(e) {
    e.preventDefault();
    const redesSelecionadas = Object.keys(redes).filter((r) => redes[r]);
    if (redesSelecionadas.length === 0) {
      alert('Selecione pelo menos uma rede social.');
      return;
    }

    setCarregando(true);
    try {
      const blob = await gerarArtePromocao({
        titulo,
        precoOriginal: parseFloat(precoOriginal),
        precoPromo: parseFloat(precoPromo),
        cupom,
        imagemUrl,
      });

      const nomeArquivo = `promo-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('promocoes-artes')
        .upload(nomeArquivo, blob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('promocoes-artes')
        .getPublicUrl(nomeArquivo);

      const { data: promoData, error: promoError } = await supabase
        .from('produtos_promocoes')
        .insert({
          titulo,
          preco_original: parseFloat(precoOriginal),
          preco_promo: parseFloat(precoPromo),
          cupom: cupom || null,
          link_afiliado: linkAfiliado,
          imagem_produto_url: imagemUrl.startsWith('blob:') ? null : imagemUrl || null,
          arte_gerada_url: publicUrlData.publicUrl,
          legenda,
        })
        .select()
        .single();

      if (promoError) throw promoError;

      const agendamentos = redesSelecionadas.map((rede) => ({
        promocao_id: promoData.id,
        rede_social: rede,
        status: 'pendente',
        data_agendada: new Date(dataAgendada).toISOString(),
      }));

      const { error: filaError } = await supabase
        .from('fila_publicacoes')
        .insert(agendamentos);

      if (filaError) throw filaError;

      setTitulo('');
      setPrecoOriginal('');
      setPrecoPromo('');
      setCupom('');
      setLinkAfiliado('');
      setImagemUrl('');
      setPreviewArte(null);
      await carregarFila();
      alert('Promoção agendada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao agendar: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleExcluirAgendamento(id) {
    await supabase.from('fila_publicacoes').delete().eq('id', id);
    carregarFila();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" />
              Gerenciador de Promoções
            </h1>
            <p className="text-slate-400 text-sm">
              Instagram + WhatsApp • Geração automática de artes 1080x1080
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSalvarEAgendar} className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-white">Nova Oferta</h2>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Título do Produto</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Fone Bluetooth JBL Tune 520BT Preto"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Preço Original (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={precoOriginal}
                  onChange={(e) => setPrecoOriginal(e.target.value)}
                  placeholder="299.90"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Preço Promo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={precoPromo}
                  onChange={(e) => setPrecoPromo(e.target.value)}
                  placeholder="189.90"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cupom (Opcional)</label>
                <input
                  type="text"
                  value={cupom}
                  onChange={(e) => setCupom(e.target.value)}
                  placeholder="PROMO20"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Imagem do Produto (URL ou Arquivo)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imagemUrl}
                    onChange={(e) => setImagemUrl(e.target.value)}
                    placeholder="Cole a URL ou envie ao lado"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <label className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center border border-slate-700" title="Enviar imagem do PC">
                    <Upload size={18} />
                    <input type="file" accept="image/*" onChange={handleArquivoLocal} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Link da Oferta / Afiliado</label>
                <input
                  type="url"
                  required
                  value={linkAfiliado}
                  onChange={(e) => setLinkAfiliado(e.target.value)}
                  placeholder="https://amzn.to/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Legenda da Postagem</label>
              <textarea
                rows={4}
                required
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Canais de Publicação</label>
                <div className="flex gap-6">
                  {['instagram', 'whatsapp'].map((rede) => (
                    <label key={rede} className="flex items-center gap-2 capitalize cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={redes[rede]}
                        onChange={(e) => setRedes({ ...redes, [rede]: e.target.checked })}
                        className="accent-amber-500 w-4 h-4"
                      />
                      {rede}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Data e Hora do Disparo</label>
                <input
                  type="datetime-local"
                  required
                  value={dataAgendada}
                  onChange={(e) => setDataAgendada(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleGerarPreview}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-medium transition"
              >
                <ImageIcon size={18} />
                Pré-visualizar Arte
              </button>

              <button
                type="submit"
                disabled={carregando}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-semibold transition"
              >
                <Send size={18} />
                {carregando ? 'Gerando e Agendando...' : 'Agendar Publicação'}
              </button>
            </div>
          </form>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 self-start">
              Preview da Arte (1080x1080)
            </h2>
            {previewArte ? (
              <img
                src={previewArte}
                alt="Preview da Promoção"
                className="w-full aspect-square object-contain rounded-lg border border-slate-700"
              />
            ) : (
              <div className="w-full aspect-square bg-slate-950 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <ImageIcon size={40} className="mb-2 opacity-50" />
                <p className="text-sm">Preencha os dados e clique em "Pré-visualizar Arte" para conferir o resultado.</p>
              </div>
            )}
          </div>
        </div>

        <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-amber-400" />
            Fila de Publicações ({fila.length})
          </h2>

          {fila.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma publicação agendada no momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-2">Arte</th>
                    <th className="py-3 px-2">Produto</th>
                    <th className="py-3 px-2">Canal</th>
                    <th className="py-3 px-2">Agendado para</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {fila.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-2">
                        <img
                          src={item.produtos_promocoes?.arte_gerada_url}
                          alt=""
                          className="w-12 h-12 rounded object-cover border border-slate-700"
                        />
                      </td>
                      <td className="py-3 px-2 font-medium text-white">
                        {item.produtos_promocoes?.titulo}
                        <span className="block text-xs text-emerald-400">
                          R$ {Number(item.produtos_promocoes?.preco_promo).toFixed(2).replace('.', ',')}
                        </span>
                      </td>
                      <td className="py-3 px-2 capitalize">{item.rede_social}</td>
                      <td className="py-3 px-2 text-slate-300">
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-slate-400" />
                          {new Date(item.data_agendada).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.status === 'publicado'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.status === 'erro'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleExcluirAgendamento(item.id)}
                          className="text-slate-400 hover:text-red-400 p-1 transition"
                          title="Remover da fila"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}