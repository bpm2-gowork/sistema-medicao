import { Zap } from 'lucide-react'

export default function RaiosAnimation() {
  const columns = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {columns.map((col) => {
        const randomStart = Math.random() * 100
        return (
          <div
            key={col}
            className="absolute animate-fall-lightning opacity-70"
            style={{
              left: `${(col / 20) * 100}%`,
              top: `-${randomStart}vh`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3.5 + Math.random() * 2.5}s`
            }}
          >
            <Zap 
              size={26} 
              className="text-white"
              fill="currentColor"
            />
          </div>
        )
      })}
      
      <style jsx>{`
        @keyframes fall-lightning {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
          60% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        
        .animate-fall-lightning {
          animation: fall-lightning 3s linear infinite;
        }
      `}</style>
    </div>
  )
}