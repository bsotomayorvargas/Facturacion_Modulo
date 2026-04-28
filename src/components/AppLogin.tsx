import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, ArrowRight, ShieldCheck, Settings2 } from 'lucide-react';

interface AppLoginProps {
  onLogin: () => void;
}

// --- FLUID BACKGROUND GENERATOR CONFIGURATION ---
const INITIAL_FLUID_CONFIG = {
  containerOpacity: 0.9,
  noiseOpacity: 0.04,
  noiseFrequency: "0.85",
  baseGradient: "from-[#002870]/60 via-[#001438] to-[#001438]",
  layers: [
    {
      id: "blue-main",
      active: true,
      color: "rgba(37,99,235,0.4)",
      size: "120vw",
      initialPos: { top: "-30%", left: "-10%" },
      animX: [0, 200, -100, 0],
      animY: [0, -150, 100, 0],
      duration: 25,
      delay: 0,
    },
    {
      id: "blue-secondary",
      active: true,
      color: "rgba(59,130,246,0.3)",
      size: "100vw",
      initialPos: { bottom: "-20%", right: "-20%" },
      animX: [0, -150, 200, 0],
      animY: [0, 150, -150, 0],
      duration: 28,
      delay: 1,
    },
    {
      id: "cyan-core",
      active: true,
      color: "rgba(14,165,233,0.2)",
      size: "80vw",
      initialPos: { top: "20%", left: "20%" },
      animX: [0, 150, -150, 0],
      animY: [0, 100, -200, 0],
      duration: 22,
      delay: 2,
    },
    {
      id: "deep-blue",
      active: true,
      color: "rgba(0,40,112,0.6)",
      size: "130vw",
      initialPos: { bottom: "-30%", left: "-10%" },
      animX: [0, -200, 100, 0],
      animY: [0, -100, 200, 0],
      duration: 30,
      delay: 3,
    },
    {
      id: "purple-experiment",
      active: false,
      color: "rgba(139,92,246,0.15)",
      size: "90vw",
      initialPos: { top: "30%", left: "30%" },
      animX: [0, 100, -100, 0],
      animY: [0, 100, -100, 0],
      duration: 35,
      delay: 0,
    },
    {
      id: "emerald-highlight",
      active: false,
      color: "rgba(16,185,129,0.15)",
      size: "70vw",
      initialPos: { top: "10%", right: "20%" },
      animX: [0, -150, 150, 0],
      animY: [0, -50, 100, 0],
      duration: 20,
      delay: 4,
    }
  ]
};

export function AppLogin({ onLogin }: AppLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [config, setConfig] = useState(INITIAL_FLUID_CONFIG);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        onLogin();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Login error', err);
      setError(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#001438] relative overflow-hidden">
      
      {/* Botón del Generador */}
      <button 
        onClick={() => setShowGenerator(!showGenerator)}
        className="absolute top-6 left-6 z-[60] text-blue-200/50 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg"
        title="Generador de Fluidos"
      >
        <Settings2 className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showGenerator && (
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-6 z-[60] w-80 bg-[#001438]/90 backdrop-blur-2xl border border-blue-500/20 rounded-2xl p-5 shadow-2xl text-blue-100"
          >
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" /> Generador de Fluidos
            </h3>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest block">Intensidad Global ({Math.round(config.containerOpacity * 100)}%)</label>
                <input type="range" min="0" max="1" step="0.05" value={config.containerOpacity} onChange={(e) => setConfig({...config, containerOpacity: parseFloat(e.target.value)})} className="w-full h-1.5 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest block">Textura Vidrio ({Math.round(config.noiseOpacity * 1000)}%)</label>
                <input type="range" min="0" max="0.1" step="0.005" value={config.noiseOpacity} onChange={(e) => setConfig({...config, noiseOpacity: parseFloat(e.target.value)})} className="w-full h-1.5 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              
              <div className="pt-4 border-t border-blue-500/20">
                <label className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-3 block">Capas de Fusión</label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {config.layers.map((layer, idx) => (
                    <div key={layer.id} className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: layer.color.replace(/[\d.]+\)$/g, '1)') }}></div>
                        <span className="text-xs font-medium text-blue-100/90">{layer.id}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={layer.active}
                          onChange={(e) => {
                            const newLayers = [...config.layers];
                            newLayers[idx].active = e.target.checked;
                            setConfig({...config, layers: newLayers});
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 border border-blue-900/50"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#001438]">
        {/* Base Gradient */}
        <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${config.baseGradient}`}></div>
        
        {/* Fluid Gradient Orbs Container */}
        <div className="absolute inset-0 w-full h-full mix-blend-screen transition-opacity duration-300" style={{ opacity: config.containerOpacity }}>
          {config.layers.filter(l => l.active).map((layer) => (
            <motion.div 
              key={layer.id}
              animate={{ 
                x: layer.animX, 
                y: layer.animY 
              }}
              transition={{ 
                duration: layer.duration, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: layer.delay
              }}
              className="absolute rounded-full pointer-events-none will-change-transform"
              style={{ 
                ...layer.initialPos,
                width: layer.size, 
                height: layer.size,
                background: `radial-gradient(circle, ${layer.color} 0%, ${layer.color.replace(/[\d.]+\)$/g, '0)')} 65%)`
              }}
            />
          ))}
        </div>

        {/* SVG Noise Texture Overlay */}
        <svg className="absolute inset-0 w-full h-full mix-blend-overlay pointer-events-none transition-opacity duration-300" style={{ opacity: config.noiseOpacity }} xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency={config.noiseFrequency} numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
        </svg>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>

      <div className="w-full max-w-md px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-10"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
            <img src="/LogoCopecFlux.svg" alt="Copec Flux" className="h-14 relative z-10 drop-shadow-2xl brightness-110" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Inner top highlight */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError(false);
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-blue-200/30 font-medium"
                      placeholder="Ingrese su usuario"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(false);
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-blue-200/30 font-medium"
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="text-red-400 text-xs font-medium text-center bg-red-500/10 border border-red-500/20 py-2 rounded-lg"
                  >
                    Credenciales incorrectas. Intente nuevamente.
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                {isAuthenticating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
