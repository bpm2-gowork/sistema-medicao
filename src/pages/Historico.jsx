import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Calendar, Droplets, Zap, ExternalLink, Trash2, Edit2, X, Search, Filter, Building, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

const VALOR_SEM_ANDAR = '___SEM_ANDAR___'
const ITENS_POR_PAGINA = 20

export default function Historico() {
  const [tipoAtivo, setTipoAtivo] = useState('agua')
  
  // Dados e Estado da Tabela
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Filtros
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroAndar, setFiltroAndar] = useState('')

  // Dados para os Selects de Filtro (Carregados do cadastro)
  const [opcoesUnidades, setOpcoesUnidades] = useState([])
  const [opcoesAndares, setOpcoesAndares] = useState([]) // Baseado na unidade

  // Estados Edição
  const [editandoItem, setEditandoItem] = useState(null)
  const [novoValor, setNovoValor] = useState('')
  const [novaObs, setNovaObs] = useState('')
  const [saving, setSaving] = useState(false)

  // 1. Carrega as Opções de Filtro (Unidades e Andares) da tabela MEDIDORES
  // Isso garante que todas as unidades apareçam no dropdown, independente do histórico
  useEffect(() => {
    async function fetchOpcoesFiltro() {
      const { data } = await supabase
        .from('medidores')
        .select('local_unidade, andar')
        .eq('tipo', tipoAtivo)
      
      if (data) {
        // Extrai Unidades Únicas
        const unidades = [...new Set(data.map(m => m.local_unidade).filter(Boolean))].sort()
        setOpcoesUnidades(unidades)
      }
    }
    fetchOpcoesFiltro()
    
    // Reseta filtros e página ao trocar aba
    setFiltroUnidade('')
    setFiltroAndar('')
    setTermoBusca('')
    setPaginaAtual(1)
  }, [tipoAtivo])

  // 2. Atualiza opções de Andar quando escolhe Unidade
  useEffect(() => {
    if (!filtroUnidade) {
      setOpcoesAndares([])
      return
    }
    
    async function fetchAndares() {
      // Busca medidores dessa unidade para ver os andares possíveis
      const { data } = await supabase
        .from('medidores')
        .select('andar')
        .eq('local_unidade', filtroUnidade)
        .eq('tipo', tipoAtivo)

      if (data) {
        const andaresReais = [...new Set(data.map(m => m.andar).filter(Boolean))].sort()
        const temSemAndar = data.some(m => !m.andar)
        
        const opcoes = andaresReais.map(a => ({ valor: a, label: a }))
        if (temSemAndar) opcoes.unshift({ valor: VALOR_SEM_ANDAR, label: 'Geral / Sem Andar' })
        
        setOpcoesAndares(opcoes)
      }
    }
    fetchAndares()
  }, [filtroUnidade, tipoAtivo])


  // 3. BUSCA PRINCIPAL (Server-Side Filtering & Pagination)
  useEffect(() => {
    fetchLeituras()
  }, [tipoAtivo, paginaAtual, filtroUnidade, filtroAndar, termoBusca]) // Recarrega se qualquer filtro mudar

  async function fetchLeituras() {
    setLoading(true)
    const tabela = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'
    
    // Inicia Query
    let query = supabase
      .from(tabela)
      .select('*', { count: 'exact' }) // Pede também a contagem total

    // --- APLICA FILTROS NO SERVIDOR ---
    if (filtroUnidade) {
      query = query.eq('unidade', filtroUnidade)
    }

    if (filtroAndar) {
      if (filtroAndar === VALOR_SEM_ANDAR) {
        query = query.is('andar', null) // Filtra nulos
      } else {
        query = query.eq('andar', filtroAndar)
      }
    }

    if (termoBusca) {
      // ilike faz busca case-insensitive (ignora maiuscula/minuscula)
      query = query.ilike('identificador_relogio', `%${termoBusca}%`)
    }

    // --- APLICA PAGINAÇÃO ---
    const from = (paginaAtual - 1) * ITENS_POR_PAGINA
    const to = from + ITENS_POR_PAGINA - 1

    const { data, count, error } = await query
      .order('data_real', { ascending: false })
      .range(from, to)

    if (error) {
      console.error(error)
    } else {
      setLeituras(data || [])
      setTotalRegistros(count || 0)
    }
    
    setLoading(false)
  }

  // --- AÇÕES (Deletar/Editar) ---
  const deletarLeitura = async (id) => {
    if (!confirm('Excluir registro permanentemente?')) return
    const tabela = tipoAtivo === 'agua' ? 'hidrometros' : 'energia'
    const { error } = await supabase.from(tabela).delete().eq('id_registro', id)
    if (!error) fetchLeituras() // Recarrega a página atual
    else alert(error.message)
  }

  const salvarEdicao = async (e) => {
    e.preventDefault()
    setSaving(true)
    const tabela = tipoAtivo === 'agua' ? 'hidrometros' : 'energia'
    const campoLeitura = tipoAtivo === 'agua' ? 'leitura_hidrometro' : 'leitura_energia'
    
    const { error } = await supabase
      .from(tabela)
      .update({ [campoLeitura]: novoValor.toString(), observacao: novaObs })
      .eq('id_registro', editandoItem.id_registro)

    if (!error) { 
      setEditandoItem(null)
      fetchLeituras() 
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  const formatarData = (dataIso) => {
    if (!dataIso) return '--/--'
    return new Date(dataIso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })
  }

  // Cálculos de Paginação
  const totalPaginas = Math.ceil(totalRegistros / ITENS_POR_PAGINA)
  const handlePaginaAnterior = () => setPaginaAtual(p => Math.max(1, p - 1))
  const handlePaginaProxima = () => setPaginaAtual(p => Math.min(totalPaginas, p + 1))

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      
      <div className="flex flex-col space-y-3 bg-white p-4 rounded-gowork shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Histórico Completo</h2>
        
        {/* Toggle Tipo */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button onClick={() => setTipoAtivo('agua')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${tipoAtivo === 'agua' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>Água</button>
          <button onClick={() => setTipoAtivo('energia')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${tipoAtivo === 'energia' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Energia</button>
        </div>

        {/* --- FILTROS (Agora Server-Side) --- */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar (Enter para pesquisar)..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
              value={termoBusca}
              onChange={e => {
                setTermoBusca(e.target.value)
                setPaginaAtual(1) // Volta pra pagina 1 ao filtrar
              }}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
               <Building className="absolute left-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
               <select 
                 className="w-full pl-7 pr-6 py-2 rounded-lg border border-gray-200 text-xs h-10 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary truncate"
                 value={filtroUnidade}
                 onChange={e => {
                   setFiltroUnidade(e.target.value)
                   setFiltroAndar('') 
                   setPaginaAtual(1)
                 }}
               >
                 <option value="">Todas Unidades</option>
                 {opcoesUnidades.map(u => <option key={u} value={u}>{u}</option>)}
               </select>
               <Filter className="absolute right-2 top-3 w-3 h-3 text-gray-300 pointer-events-none" />
            </div>

            <div className={`relative flex-1 transition-opacity ${!filtroUnidade ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
               <MapPin className="absolute left-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
               <select 
                 className="w-full pl-7 pr-6 py-2 rounded-lg border border-gray-200 text-xs h-10 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary truncate"
                 value={filtroAndar}
                 onChange={e => {
                   setFiltroAndar(e.target.value)
                   setPaginaAtual(1)
                 }}
                 disabled={!filtroUnidade}
               >
                 <option value="">Todos Andares</option>
                 {opcoesAndares.map(op => <option key={op.valor} value={op.valor}>{op.label}</option>)}
               </select>
               <Filter className="absolute right-2 top-3 w-3 h-3 text-gray-300 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* --- LISTA --- */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 animate-pulse">Carregando dados...</div>
      ) : leituras.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-gowork shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {leituras.map((item) => (
              <div key={item.id_registro} className="bg-white p-3 rounded-gowork shadow-sm border border-gray-100 flex gap-3 animate-in slide-in-from-bottom-2">
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${tipoAtivo === 'energia' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                  {tipoAtivo === 'energia' ? <Zap className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-gray-700 truncate text-sm">{item.identificador_relogio}</h3>
                      <p className="text-[10px] text-gray-500 font-medium truncate flex items-center">
                        {item.unidade || 'Sem Unidade'} 
                        {item.andar ? ` • ${item.andar}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border ml-2 whitespace-nowrap">ID: {item.id_registro}</span>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-400 mt-1 mb-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatarData(item.data_real)}
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg font-bold text-gray-800">{item.leitura_num}</span>
                        <span className="text-xs text-gray-400">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                      </div>
                      {item.consumo_calculado !== null && (
                        <div className={`text-xs font-medium ${item.consumo_calculado < 0 ? 'text-orange-500' : 'text-green-600'}`}>
                          {item.consumo_calculado < 0 ? 'Ajuste/Virada' : `Consumo: ${item.consumo_calculado}`}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-1">
                      {item.foto_url && (
                        <a href={item.foto_url} target="_blank" className="p-2 text-gray-400 hover:text-primary bg-gray-50 rounded-lg border border-gray-100">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => abrirEdicao(item)} className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletarLeitura(item.id_registro)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* PAGINAÇÃO */}
          <div className="flex items-center justify-between pt-4 pb-8">
            <button 
              onClick={handlePaginaAnterior} 
              disabled={paginaAtual === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-medium text-gray-500">
              Página {paginaAtual} de {totalPaginas} ({totalRegistros} itens)
            </span>

            <button 
              onClick={handlePaginaProxima} 
              disabled={paginaAtual >= totalPaginas}
              className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Modal de Edição (Mantido) */}
      {editandoItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
         <div className="bg-white rounded-gowork shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
           <div className="bg-gray-800 px-5 py-4 flex justify-between items-center text-white">
             <h3 className="font-bold flex items-center"><Edit2 className="w-4 h-4 mr-2" /> Corrigir Leitura</h3>
             <button onClick={() => setEditandoItem(null)}><X className="w-5 h-5" /></button>
           </div>
           <form onSubmit={salvarEdicao} className="p-6 space-y-4">
             <div>
               <label className="block text-sm font-semibold text-gray-600 mb-1">Novo Valor</label>
               <input type="number" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} className="w-full p-3 border rounded-lg text-lg font-bold" autoFocus />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-600 mb-1">Motivo</label>
               <textarea value={novaObs} onChange={(e) => setNovaObs(e.target.value)} className="w-full p-3 border rounded-lg text-sm h-20 resize-none" placeholder="Por que está alterando?" />
             </div>
             <button type="submit" disabled={saving} className="w-full bg-primary text-white font-bold py-3 rounded-lg shadow-lg">
               {saving ? 'Salvando...' : 'Confirmar Correção'}
             </button>
           </form>
         </div>
       </div>
      )}
    </div>
  )
}