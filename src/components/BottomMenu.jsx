import { Link, useLocation } from 'react-router-dom'
import { PlusSquare, List, BarChart3 } from 'lucide-react'

export default function BottomMenu() {
  const location = useLocation()
  
  // Função para destacar o ícone ativo
  const isActive = (path) => {
    return location.pathname === path 
      ? "text-primary scale-110" 
      : "text-gray-400 hover:text-gray-600"
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        
        <Link to="/" className={`flex flex-col items-center transition-all ${isActive('/')}`}>
          <PlusSquare className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Leitura</span>
        </Link>

        <Link to="/historico" className={`flex flex-col items-center transition-all ${isActive('/historico')}`}>
          <List className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Histórico</span>
        </Link>

        <Link to="/dashboard" className={`flex flex-col items-center transition-all ${isActive('/dashboard')}`}>
          <BarChart3 className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Gráficos</span>
        </Link>

      </div>
    </div>
  )
}