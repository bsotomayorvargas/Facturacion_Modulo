import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, X, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  inputUrl: string;
  setInputUrl: (v: string) => void;
  inputCompanyDb: string;
  setInputCompanyDb: (v: string) => void;
  inputUser: string;
  setInputUser: (v: string) => void;
  inputPass: string;
  setInputPass: (v: string) => void;
  handleConnect: () => void;
}

export function LoginModal({
  isOpen, onClose, isConnected,
  inputUrl, setInputUrl,
  inputCompanyDb, setInputCompanyDb,
  inputUser, setInputUser,
  inputPass, setInputPass,
  handleConnect
}: LoginModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">Service Layer</h2>
                    <p className="text-xs text-slate-500">Conexión con SAP B1</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Credenciales de Acceso
                    {isConnected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </label>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">URL Base API</label>
                      <input 
                        type="text" 
                        placeholder="https://sbo-server:50000/b1s/v2" 
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500" 
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        disabled={isConnected}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">CompanyDB</label>
                      <input 
                        type="text" 
                        placeholder="Ej: SBOFLUXSOLAR" 
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500" 
                        value={inputCompanyDb}
                        onChange={e => setInputCompanyDb(e.target.value)}
                        disabled={isConnected}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Usuario</label>
                      <input 
                        type="text" 
                        placeholder="Usuario de SAP" 
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500" 
                        value={inputUser}
                        onChange={e => setInputUser(e.target.value)}
                        disabled={isConnected}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500" 
                        value={inputPass}
                        onChange={e => setInputPass(e.target.value)}
                        disabled={isConnected}
                      />
                    </div>
                  </div>

                  {!isConnected ? (
                    <button 
                      onClick={() => {
                        handleConnect();
                        onClose();
                      }}
                      className="w-full py-2.5 mt-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400"
                      disabled={!inputUrl || !inputUser || !inputPass}
                    >
                      Conectar a SAP B1
                    </button>
                  ) : (
                    <div className="w-full py-2.5 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-md text-center shadow-sm">
                      Conexión Activa
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
