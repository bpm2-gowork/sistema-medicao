import { Outlet } from 'react-router-dom'
import BottomMenu from './BottomMenu'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Bar */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide">GOWORK</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-wider">Gestão de Utilidades</p>
          </div>
          <div className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
            Admin
          </div>
        </div>
      </header>

      {/* Conteúdo das Páginas */}
      <main className="max-w-md mx-auto px-4 py-6">
        <Outlet />
      </main>

      <BottomMenu />
    </div>
  )
}