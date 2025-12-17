import { Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'
import BottomMenu from './BottomMenu'
import ChuvaAnimation from './ChuvaAnimation'
import RaiosAnimation from './RaiosAnimation'

export default function Layout() {
  const { tipoAtivo } = useTheme()
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    // Adicionamos pb-24 sempre, para o conteúdo não ficar escondido atrás do menu fixo no PC também
    <div className={`min-h-screen transition-all pb-24 ${
      tipoAtivo === 'agua'
        ? 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-yellow-50/30 to-slate-100'
    }`}>
      
      {/* HEADER SUPERIOR (Igual para Mobile e Desktop) */}
      <header className={`shadow-lg sticky top-0 z-40 transition-all relative ${
        tipoAtivo === 'agua'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
          : 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900'
      }`}>
        
        {/* Animação de fundo */}
        {tipoAtivo === 'agua' ? <ChuvaAnimation /> : <RaiosAnimation />}
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between relative z-10">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-wide transition-colors ${
              tipoAtivo === 'agua' ? 'text-white' : 'text-yellow-700'
            }`}>
              GOWORK
            </h1>
            <p className={`text-xs sm:text-sm uppercase tracking-wider mt-1 transition-colors ${
              tipoAtivo === 'agua' ? 'text-white opacity-90' : 'text-yellow-800 opacity-90'
            }`}>
              {user?.nome || 'Gestão de Utilidades'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-xs sm:text-sm px-4 py-2 rounded-full font-semibold transition-all hidden sm:block ${
              tipoAtivo === 'agua'
                ? 'bg-white/20 text-white'
                : 'bg-yellow-600/20 text-yellow-800'
            }`}>
              {user?.role === 'n1' ? 'Operacional' : 'Admin'}
            </div>

            {/* BOTÃO DE SAIR */}
            <button 
              onClick={handleLogout}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                tipoAtivo === 'agua'
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-yellow-600/20 text-yellow-900 hover:bg-yellow-700/30'
              }`}
              title="Sair do sistema"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO DA PÁGINA */}
      <main className="min-h-[calc(100vh-80px)] transition-all">
        <Outlet />
      </main>

      {/* MENU INFERIOR (Agora visível SEMPRE, removi o 'md:hidden') */}
      <div>
        <BottomMenu />
      </div>
    </div>
  )
}