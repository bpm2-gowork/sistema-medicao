import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Camera, CheckCircle, Trash2, AlertOctagon, TrendingUp, Droplets, Zap, Building, MapPin } from 'lucide-react'

// CONFIGURAÇÕES
const N8N_WEBHOOK_URL = '' // Coloque sua URL aqui se tiver
const PORCENTAGEM_ALERTA = 0.60 
const VALOR_SEM_ANDAR = '___SEM_ANDAR___' // Constante interna para controle

export default function Leitura() {
  const [tipoAtivo, setTipoAtivo] = useState('agua') 

  // Dados Mestres
  const [todosMedidores, setTodosMedidores] = useState([])
  
  // Seleções de Navegação
  const [predioSelecionado, setPredioSelecionado] = useState('')
  const [andarSelecionado, setAndarSelecionado] = useState('')
  const [medidorSelecionado, setMedidorSelecionado] = useState('')

  // Dados de Leitura
  const [leituraAnterior, setLeituraAnterior] = useState(null)
  const [leituraAtual, setLeituraAtual] = useState('')
  const [mediaHistorica, setMediaHistorica] = useState(null)
  
  // Arquivos e Status
  const [foto, setFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [motivoValidacao, setMotivoValidacao] = useState('') 

  const fileInputRef = useRef(null)

  // 1. Busca TODOS os Medidores do tipo ativo
  useEffect(() => {
    async function fetchMedidores() {
      // Reset total
      setTodosMedidores([])
      setPredioSelecionado('')
      setAndarSelecionado('')
      setMedidorSelecionado('')
      setLeituraAtual('')
      setFoto(null)
      setPreviewUrl(null)

      const { data } = await supabase
        .from('medidores')
        .select('*')
        .eq('tipo', tipoAtivo)
        .order('nome')
      
      if (data) setTodosMedidores(data)
    }
    fetchMedidores()
  }, [tipoAtivo])

  // --- LÓGICA INTELIGENTE DE FILTROS ---
  
  // 1. Lista de Prédios Únicos (Ignora nulos)
  const prediosUnicos = [...new Set(todosMedidores.map(m => m.local_unidade).filter(Boolean))].sort()
  
  // 2. Lista de Andares baseada no Prédio (Trata Nulos)
  let andaresOpcoes = []
  if (predioSelecionado) {
    // Filtra medidores desse prédio
    const medidoresDoPredio = todosMedidores.filter(m => m.local_unidade === predioSelecionado)
    
    // Pega andares reais (Ex: "1º Andar", "Térreo")
    const andaresReais = [...new Set(medidoresDoPredio.map(m => m.andar).filter(Boolean))].sort()
    
    // Verifica se tem algum "sem andar" (null ou vazio)
    const temSemAndar = medidoresDoPredio.some(m => !m.andar)

    // Monta a lista final
    andaresOpcoes = andaresReais.map(a => ({ valor: a, label: a }))
    
    // Se tiver itens sem andar, adiciona a opção especial no INÍCIO da lista
    if (temSemAndar) {
      andaresOpcoes.unshift({ valor: VALOR_SEM_ANDAR, label: 'Geral / Sem Andar' })
    }
  }

  // 3. Filtra Relógios Finais
  const medidoresFinais = todosMedidores.filter(m => {
    if (m.local_unidade !== predioSelecionado) return false
    
    if (andarSelecionado === VALOR_SEM_ANDAR) {
      return !m.andar // Retorna se for null ou vazio
    }
    return m.andar === andarSelecionado
  })

  // 2. Busca Dados ao Selecionar o Relógio Final
  useEffect(() => {
    if (!medidorSelecionado) return

    async function fetchDadosMedidor() {
      const nomeMedidor = todosMedidores.find(m => m.id == medidorSelecionado)?.nome
      if (!nomeMedidor) return

      const viewAlvo = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'

      const { data: historico } = await supabase
        .from(viewAlvo)
        .select('leitura_num, consumo_calculado')
        .eq('identificador_relogio', nomeMedidor)
        .order('data_real', { ascending: false })
        .limit(10)

      if (historico && historico.length > 0) {
        setLeituraAnterior(historico[0].leitura_num || 0)

        const consumosValidos = historico
          .map(h => h.consumo_calculado)
          .filter(c => c !== null && c >= 0)
        
        if (consumosValidos.length > 0) {
          const soma = consumosValidos.reduce((a, b) => a + b, 0)
          setMediaHistorica(soma / consumosValidos.length)
        } else {
          setMediaHistorica(null)
        }
      } else {
        setLeituraAnterior(0)
        setMediaHistorica(null)
      }
    }
    fetchDadosMedidor()
  }, [medidorSelecionado])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // --- CÁLCULOS E VALIDAÇÃO ---
  const valorAtualNum = Number(leituraAtual)
  const valorAnteriorNum = Number(leituraAnterior)
  const consumo = leituraAtual ? valorAtualNum - valorAnteriorNum : 0
  const isMenorQueAnterior = leituraAtual && leituraAnterior !== null && valorAtualNum < valorAnteriorNum
  const isConsumoAlto = !isMenorQueAnterior && mediaHistorica && consumo > (mediaHistorica * (1 + PORCENTAGEM_ALERTA))
  const podeEnviar = leituraAtual && foto && (!isMenorQueAnterior || motivoValidacao !== '')

  // --- ENVIO ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeEnviar) return
    setLoading(true)
    
    try {
      // Upload
      const fileExt = foto.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, foto)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName)
      
      const medidorObj = todosMedidores.find(m => m.id == medidorSelecionado)
      
      let obsFinal = isConsumoAlto ? `ALERTA: Consumo Alto (+${Math.round((consumo/mediaHistorica - 1)*100)}%)` : ''
      if (isMenorQueAnterior) obsFinal = motivoValidacao === 'virada' ? 'Virada de Relógio' : 'Ajuste Manual'

      const dadosComuns = {
        identificador_relogio: medidorObj.nome,
        unidade: medidorObj.local_unidade,
        andar: medidorObj.andar, // Salva null se for null, isso é ok
        data_hora: new Date().toISOString(),
        apenas_data: new Date().toISOString().split('T')[0],
        foto_url: urlData.publicUrl,
        usuario: 'App Web',
        observacao: obsFinal
      }

      if (tipoAtivo === 'agua') {
        await supabase.from('hidrometros').insert({ ...dadosComuns, leitura_hidrometro: leituraAtual.toString() })
      } else {
        await supabase.from('energia').insert({ ...dadosComuns, leitura_energia: leituraAtual.toString() })
      }

      // N8N
      if (N8N_WEBHOOK_URL) {
        fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipoAtivo,
            medidor: medidorObj.nome,
            unidade: medidorObj.local_unidade,
            andar: medidorObj.andar || 'Geral',
            leitura_atual: valorAtualNum,
            consumo: isMenorQueAnterior ? valorAtualNum : consumo,
            alerta: isConsumoAlto || isMenorQueAnterior,
            foto: urlData.publicUrl
          })
        }).catch(err => console.error(err))
      }

      setMensagem(isConsumoAlto ? 'Salvo! Alerta enviado.' : 'Leitura salva!')
      setLeituraAtual('')
      setFoto(null)
      setPreviewUrl(null)
      setMotivoValidacao('')
      setMedidorSelecionado('') // Limpa só o relógio
      setTimeout(() => setMensagem(null), 3000)

    } catch (error) {
      alert('Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Abas */}
      <div className="flex p-1 bg-white rounded-xl shadow-sm border border-gray-200">
        <button onClick={() => setTipoAtivo('agua')} className={`flex-1 flex items-center justify-center py-3 text-sm font-medium rounded-lg transition-all ${tipoAtivo === 'agua' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Droplets className="w-4 h-4 mr-2" /> Água
        </button>
        <button onClick={() => setTipoAtivo('energia')} className={`flex-1 flex items-center justify-center py-3 text-sm font-medium rounded-lg transition-all ${tipoAtivo === 'energia' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Zap className="w-4 h-4 mr-2" /> Energia
        </button>
      </div>

      {mensagem && (
        <div className={`p-4 rounded-gowork flex items-center animate-bounce ${mensagem.includes('Alerta') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
          <CheckCircle className="w-5 h-5 mr-2" />
          {mensagem}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-gowork shadow-sm border border-gray-100 space-y-6">
        
        {/* NAVEGAÇÃO EM CASCATA */}
        <div className="space-y-4">
          
          {/* 1. SELEÇÃO DE UNIDADE */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 flex items-center">
              <Building className="w-3 h-3 mr-1" /> Unidade (Prédio)
            </label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-primary"
              value={predioSelecionado}
              onChange={(e) => {
                setPredioSelecionado(e.target.value)
                setAndarSelecionado('')
                setMedidorSelecionado('')
              }}
              required
            >
              <option value="">Selecione a Unidade...</option>
              {prediosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* 2. SELEÇÃO DE ANDAR (Só aparece se tiver prédio) */}
          {predioSelecionado && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> Andar / Setor
              </label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-primary"
                value={andarSelecionado}
                onChange={(e) => {
                  setAndarSelecionado(e.target.value)
                  setMedidorSelecionado('')
                }}
                required
              >
                <option value="">Selecione...</option>
                {andaresOpcoes.map(opcao => (
                  <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. SELEÇÃO DE RELÓGIO (Só aparece se tiver andar) */}
          {andarSelecionado && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Relógio
              </label>
              <select 
                className="w-full p-3 border-2 border-primary/20 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary text-gray-800 font-medium"
                value={medidorSelecionado}
                onChange={(e) => setMedidorSelecionado(e.target.value)}
                required
              >
                <option value="">Qual medidor?</option>
                {medidoresFinais.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Info Técnica + Input (Só renderiza se selecionou o relógio final) */}
        {medidorSelecionado && (
          <div className="animate-in fade-in space-y-6 pt-4 border-t border-gray-100">
            
            {leituraAnterior !== null && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 block mb-1">Leitura Anterior</span>
                  <span className="text-lg font-bold text-gray-700">{leituraAnterior}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 block mb-1">Média Histórica</span>
                  <span className="text-lg font-bold text-gray-700">
                    {mediaHistorica ? Math.round(mediaHistorica) : '--'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Leitura Atual</label>
              <input 
                type="number" 
                className={`w-full p-4 text-2xl font-bold tracking-widest border rounded-lg outline-none transition-colors ${
                  isMenorQueAnterior || isConsumoAlto 
                    ? 'border-alert text-alert bg-red-50' 
                    : 'border-gray-300 focus:border-primary text-gray-800'
                }`}
                placeholder="00000"
                value={leituraAtual}
                onChange={(e) => {
                  setLeituraAtual(e.target.value)
                  if (Number(e.target.value) >= leituraAnterior) setMotivoValidacao('')
                }}
                required
                autoFocus
              />
            </div>

            {/* Alertas */}
            {isMenorQueAnterior && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-bold text-alert text-sm mb-2">Valor menor que o anterior</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="motivo" checked={motivoValidacao === 'virada'} onChange={() => setMotivoValidacao('virada')} />
                    <span className="text-sm text-red-900">Relógio Virou (Zerou)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="motivo" checked={motivoValidacao === 'ajuste'} onChange={() => setMotivoValidacao('ajuste')} />
                    <span className="text-sm text-red-900">Ajuste / Correção</span>
                  </label>
                </div>
              </div>
            )}

            {isConsumoAlto && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start space-x-3">
                <TrendingUp className="w-6 h-6 text-orange-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-orange-800 text-sm">Consumo Elevado!</h4>
                  <p className="text-xs text-orange-700 mt-1">
                    Consumo ({consumo}) está 60% acima da média.
                  </p>
                </div>
              </div>
            )}

            {/* Câmera */}
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              {!previewUrl ? (
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 flex flex-col items-center text-gray-400">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="font-medium text-sm">Tirar Foto</span>
                </button>
              ) : (
                <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 shadow-md h-48">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => {setFoto(null); setPreviewUrl(null)}} className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full shadow">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !podeEnviar}
              className={`w-full font-bold py-4 rounded-gowork shadow-lg transition-all text-white ${
                !podeEnviar ? 'bg-gray-300 cursor-not-allowed' : 
                isConsumoAlto ? 'bg-secondary hover:bg-orange-600' : 
                'bg-primary hover:bg-blue-700'
              }`}
            >
              {loading ? 'Salvando...' : 'Confirmar Leitura'}
            </button>
          </div>
        )}

      </form>
    </div>
  )
}