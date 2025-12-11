import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Zap, Droplets, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [tipoAtivo, setTipoAtivo] = useState('agua') // 'agua' | 'energia'
  const [dadosGrafico, setDadosGrafico] = useState([])
  const [resumo, setResumo] = useState({ totalConsumo: 0, leiturasCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      const view = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'
      
      // Busca os últimos 50 registros para calcular métricas
      const { data, error } = await supabase
        .from(view)
        .select('identificador_relogio, consumo_calculado, data_real')
        .order('data_real', { ascending: false })
        .limit(100)

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      // 1. Calcula totais (Ignorando viradas negativas para soma)
      const validos = data.filter(d => d.consumo_calculado >= 0)
      const total = validos.reduce((acc, curr) => acc + Number(curr.consumo_calculado), 0)
      
      setResumo({
        totalConsumo: total,
        leiturasCount: data.length
      })

      // 2. Prepara dados para o gráfico (Top 10 maiores consumos recentes)
      // Agrupa por relógio apenas para visualização simplificada
      const agrupado = validos.slice(0, 15).map(d => ({
        nome: d.identificador_relogio.split(' - ')[0].substring(0, 10), // Encurta nome
        valor: d.consumo_calculado
      })).reverse()

      setDadosGrafico(agrupado)
      setLoading(false)
    }

    fetchDashboard()
  }, [tipoAtivo])

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-xl font-bold text-gray-800">Visão Geral</h2>

      {/* Toggle */}
      <div className="flex p-1 bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-xs mx-auto">
        <button onClick={() => setTipoAtivo('agua')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${tipoAtivo === 'agua' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}>Água</button>
        <button onClick={() => setTipoAtivo('energia')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${tipoAtivo === 'energia' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>Energia</button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-gowork shadow-sm border border-gray-100">
          <div className={`flex items-center space-x-2 mb-2 ${tipoAtivo === 'agua' ? 'text-blue-500' : 'text-orange-500'}`}>
            {tipoAtivo === 'agua' ? <Droplets className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            <span className="text-sm font-semibold">Consumo Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {resumo.totalConsumo.toLocaleString('pt-BR')} 
            <span className="text-xs font-normal text-gray-400 ml-1">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Últimos 100 registros</p>
        </div>

        <div className="bg-white p-4 rounded-gowork shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-semibold">Leituras</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{resumo.leiturasCount}</p>
          <p className="text-[10px] text-gray-400 mt-1">Realizadas recentemente</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white p-5 rounded-gowork shadow-sm border border-gray-100 h-80">
        <h3 className="text-sm font-bold text-gray-600 mb-6 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Consumo Recente (por Leitura)
        </h3>
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-300">Carregando gráfico...</div>
        ) : dadosGrafico.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-300 text-sm">Sem dados suficientes para gráfico.</div>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosGrafico}>
              <XAxis dataKey="nome" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                cursor={{fill: 'transparent'}}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {dadosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={tipoAtivo === 'energia' ? '#FF6B35' : '#3F76FF'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}