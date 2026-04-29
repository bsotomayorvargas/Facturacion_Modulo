import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from './store';
import { formatCurrency, formatDate } from './lib/utils';
import { Database, LogOut, CheckCircle2, UploadCloud, AlertCircle, Search, ArrowRight, FileText, Calculator, Building2, Calendar, Filter, Download, RefreshCw, FileSpreadsheet, Settings2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EditOrderModal } from './components/EditOrderModal';
import { LoginModal } from './components/LoginModal';
import { SalesOrderTable } from './components/ui/SalesOrderTable';
import { InvoiceTable } from './components/ui/InvoiceTable';
import { PurchaseInvoicesView } from './components/PurchaseInvoicesView';
import { Settings } from 'lucide-react';

const formatSheetStatus = (status?: string) => {
  switch(status) {
    case 'ready_anticipo': return <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">Anticipo</span>;
    case 'ready_cierre': return <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-0.5">Cierre <CheckCircle2 className="w-2.5 h-2.5" /></span>;
    case 'ready_100': return <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">100% Excep.</span>;
    case 'anomaly': return <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">Bloqueado</span>;
    case 'pending_te4': return <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Pend. TE4</span>;
    case 'pending': return <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Pend. Op.</span>;
    default: return <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">N/A</span>;
  }
};

import { AppLogin } from './components/AppLogin';
import { ConfirmationModal, ConfirmationActionType, ConfirmationData } from './components/ConfirmationModal';
import { sendFacturacionEmail } from './lib/emailService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('app_auth') === 'true';
  });

  const { 
    session, filters, masterData, orders, selectedOrderEntry, selectedSublines,
    setFilters, selectOrder, toggleSubline, toggleAllSublines, connect, disconnect,
    syncMasterData, fetchOrders,
    batchSelectedOrders, isProcessingBatch, batchProgress, toggleBatchSelection, toggleAllBatchSelection,
    regularizeProjects, activeTab, setActiveTab, invoices, isFetchingInvoices, fetchInvoices, generateCreditNote,
    fetchPurchaseInvoices, isFetchingPurchases
  } = useStore();

  const [inputCompanyDb, setInputCompanyDb] = useState(session.companyDb);
  const [inputUser, setInputUser] = useState(session.user);
  const [inputPass, setInputPass] = useState('');
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [editingOrder, setEditingOrder] = useState<number | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    actionType: ConfirmationActionType;
    data: ConfirmationData;
    onConfirm: (comment: string) => void;
  }>({ isOpen: false, title: '', actionType: 'batch-invoice', data: {}, onConfirm: () => {} });

  if (!isAuthenticated) {
    return (
      <AppLogin 
        onLogin={() => {
          localStorage.setItem('app_auth', 'true');
          window.location.reload();
        }} 
      />
    );
  }


  // Derived state: filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesBplid = o.bplid === filters.bplid;
      const matchesRut = filters.rut ? o.cardCode.toLowerCase().includes(filters.rut.toLowerCase()) : true;
      const matchesProject = filters.project ? o.project?.toLowerCase().includes(filters.project.toLowerCase()) : true;
      const matchesCC = filters.cc ? o.documentLines.some(l => l.costCenter?.toLowerCase().includes(filters.cc.toLowerCase())) : true;
      
      const searchLower = filters.searchQuery.toLowerCase();
      const matchesSearch = filters.searchQuery ? (
        String(o.docNum).includes(filters.searchQuery) ||
        o.project?.toLowerCase().includes(searchLower) ||
        o.reference?.toLowerCase().includes(searchLower)
      ) : true;

      return matchesBplid && matchesRut && matchesProject && matchesCC && matchesSearch;
    });
  }, [orders, filters]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesBplid = inv.bplid === filters.bplid;
      const matchesRut = filters.rut ? inv.cardCode.toLowerCase().includes(filters.rut.toLowerCase()) : true;
      
      const searchLower = filters.searchQuery.toLowerCase();
      const matchesSearch = filters.searchQuery ? (
        String(inv.docNum).includes(filters.searchQuery) ||
        inv.cardName?.toLowerCase().includes(searchLower)
      ) : true;

      return matchesBplid && matchesRut && matchesSearch;
    });
  }, [invoices, filters]);



  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    if (!value) {
      setFilters({ [key]: '' });
      return;
    }
    if (value.includes('-')) {
      const [year, month, day] = value.split('-');
      setFilters({ [key]: `${day}/${month}/${year}` });
      return;
    }
    // Fallback if typed manually
    const clean = value.replace(/[^\d]/g, '');
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + clean.slice(4, 8);
    setFilters({ [key]: formatted.slice(0, 10) });
  };

  const handleConnect = async () => {
    if (inputCompanyDb && inputUser && inputPass) {
      try {
        await connect(inputCompanyDb, inputUser, inputPass);
        setIsLoginModalOpen(false);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleFetchOrders = async () => {
    setIsFetchingOrders(true);
    if (activeTab === 'OVs') {
      await Promise.all([fetchOrders(), fetchInvoices()]);
    } else if (activeTab === 'Facturas') {
      await fetchInvoices();
    } else if (activeTab === 'Compras') {
      await fetchPurchaseInvoices();
    }
    setIsFetchingOrders(false);
  };


  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR: Credentials & Global Actions */}
      <aside className="w-64 bg-blue-950 border-r border-blue-900 flex flex-col shrink-0 shadow-xl z-10">
        <div className="p-6 border-b border-blue-800 flex items-center">
          <div className="w-1/2 flex justify-start pr-2">
            <img src="/LogoCopecFlux.svg" alt="Copec Flux Logo" className="h-10 w-auto" />
          </div>
          <div className="w-1/2 text-center border-l border-blue-800 pl-2">
            <h1 className="text-white font-bold text-[11px] uppercase tracking-wider leading-tight">
              Flux AyF<br />Platform
            </h1>
          </div>
        </div>

        <nav className="py-4 px-3 space-y-2 border-b border-blue-800/50">
          <button 
            onClick={() => setActiveTab('OVs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'OVs' ? 'bg-blue-800 text-white' : 'hover:bg-blue-800 hover:text-white text-blue-100'}`}
          >
            <FileText size={18} className={activeTab === 'OVs' ? 'text-blue-400' : ''} />
            Órdenes de Venta
          </button>
          <button 
            onClick={() => setActiveTab('Facturas')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'Facturas' ? 'bg-blue-800 text-white' : 'hover:bg-blue-800 hover:text-white text-blue-100'}`}
          >
            <Calculator size={18} className={activeTab === 'Facturas' ? 'text-blue-400' : ''} />
            Facturas Venta
          </button>
          <button 
            onClick={() => setActiveTab('Compras')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'Compras' ? 'bg-blue-800 text-white' : 'hover:bg-blue-800 hover:text-white text-blue-100'}`}
          >
            <FileSpreadsheet size={18} className={activeTab === 'Compras' ? 'text-blue-400' : ''} />
            Compras (CxP)
          </button>
        </nav>
        
        <div className="flex-1 overflow-y-auto"></div>
          
        <div className="p-4 border-t border-blue-900 bg-blue-950/50 flex flex-col gap-3 shrink-0">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-900/60 text-blue-200 text-xs font-medium rounded-lg hover:bg-blue-800 hover:text-white transition-colors border border-blue-800 shadow-inner"
          >
            <Settings className="w-3.5 h-3.5" />
            Login SAP
          </button>

          <div className="text-center pt-2 border-t border-blue-900/50 mt-1">
            <div className="text-[10px] text-blue-300/40 font-mono">
              {session.token ? `Sesión Activa: ${session.token.substring(0, 8)}...` : 'Sin conexión a Service Layer'}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        {!session.isConnected && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-xl border border-slate-200 text-center max-w-sm">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Requiere Autenticación</h2>
                    <p className="text-sm text-slate-500 mt-2">Por favor, ingrese sus credenciales de Service Layer en el panel izquierdo para cargar las Órdenes de Venta vigentes.</p>
                </div>
            </div>
        )}

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {activeTab === 'OVs' ? 'Gestión de Órdenes de Venta' : activeTab === 'Facturas' ? 'Facturación Electrónica' : 'Cuentas por Pagar (Compras)'}
            </h2>
            <div className="h-5 w-px bg-slate-300 mx-2"></div>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase rounded-md border ${session.isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${session.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
              {session.isConnected ? 'SL Online' : 'SL Offline'}
            </span>
          </div>

          <div className="flex items-center gap-4">
             {/* Dropdown de Herramientas Lote */}
             <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors shadow-sm focus:ring-2 focus:ring-slate-200 outline-none">
                  <Settings2 className="w-3.5 h-3.5" />
                  Herramientas Lote
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden translate-y-1 group-hover:translate-y-0">
                  <div className="p-1">
                    <button 
                      onClick={async () => {
                        const XLSX = await import('xlsx');
                        const worksheet = XLSX.utils.aoa_to_sheet([
                          ["Ceco", "Doc venta", "Fecha de ganado", "Fecha TE4 Inscrito"],
                          ["200", "540001479", "01-01-2024", ""],
                          ["300", "540001480", "01-01-2024", "15-02-2024"]
                        ]);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
                        XLSX.writeFile(workbook, "Plantilla_Cruce_OVs.xlsx");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors text-left"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar Plantilla Excel
                    </button>
                    <div className="relative overflow-hidden group/upload">
                      <input 
                        type="file" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              if (event.target?.result) {
                                try {
                                  const data = new Uint8Array(event.target.result as ArrayBuffer);
                                  const XLSX = await import('xlsx');
                                  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                                  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                                  const resultsData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
                                  useStore.getState().syncSheetsData(resultsData);
                                  alert("¡Planilla cruzada exitosamente!");
                                } catch (error) {
                                  console.error(error);
                                }
                              }
                            };
                            reader.readAsArrayBuffer(file);
                          }
                        }}
                      />
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 group-hover/upload:bg-slate-50 group-hover/upload:text-blue-600 rounded-md transition-colors text-left pointer-events-none">
                        <UploadCloud className="w-3.5 h-3.5" /> Sincronizar Cruce Excel
                      </button>
                    </div>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button 
                      onClick={async () => {
                        try {
                          const { fetchProjectStatusesFromSheets } = await import('./lib/googleSheets');
                          const resultsData = await fetchProjectStatusesFromSheets();
                          useStore.getState().syncSheetsData(resultsData);
                          alert(`¡Sincronización exitosa! Se leyeron ${resultsData.length} registros desde Google Sheets.`);
                        } catch (error) {
                          console.error(error);
                          alert("Hubo un error al sincronizar con Google Sheets.");
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors text-left"
                    >
                      <Database className="w-3.5 h-3.5" /> Sincronizar Google Sheets
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button 
                      onClick={syncMasterData}
                      disabled={!session.isConnected || masterData.isSyncing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors text-left disabled:opacity-50"
                    >
                      <Database className={`w-3.5 h-3.5 ${masterData.isSyncing ? 'animate-spin text-blue-500' : ''}`} /> 
                      {masterData.isSyncing ? 'Sincronizando Maestros...' : 'Sincronizar Maestros'}
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button 
                      onClick={() => regularizeProjects(useStore.getState().orders)}
                      disabled={!session.isConnected || isFetchingOrders || useStore.getState().isProcessingBatch}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors text-left disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${useStore.getState().isProcessingBatch ? 'animate-spin text-blue-500' : ''}`} /> 
                      Regularizar Proyectos
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </header>

        {/* Unified Control Bar (Bento Layout) */}
        <div className="bg-slate-50 p-6 pb-0 shrink-0 z-10">
          <div className="max-w-[1600px] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 flex flex-col xl:flex-row gap-5 xl:items-end">
              
              {/* Group 1: Required Context (Company & Dates) */}
              <div className="flex flex-wrap gap-4 flex-[2]">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Empresa Base
                  </label>
                  <select 
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                    value={filters.bplid}
                    onChange={e => setFilters({ bplid: e.target.value })}
                    disabled={!session.isConnected || masterData.bplids.length === 0}
                  >
                    {masterData.bplids.length === 0 ? <option value="">Cargando maestras...</option> : 
                      masterData.bplids.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                    }
                  </select>
                </div>
                
                <div className="space-y-1.5 w-36">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Fecha Desde
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono color-scheme-light"
                    value={filters.dateFrom ? filters.dateFrom.split('-').reverse().join('-') : ''}
                    onChange={e => {
                      const parts = e.target.value.split('-');
                      if(parts.length === 3) setFilters({ dateFrom: `${parts[2]}-${parts[1]}-${parts[0]}` });
                    }}
                    disabled={!session.isConnected}
                  />
                </div>

                <div className="space-y-1.5 w-36">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Fecha Hasta
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono color-scheme-light"
                    value={filters.dateTo ? filters.dateTo.split('-').reverse().join('-') : ''}
                    onChange={e => {
                      const parts = e.target.value.split('-');
                      if(parts.length === 3) setFilters({ dateTo: `${parts[2]}-${parts[1]}-${parts[0]}` });
                    }}
                    disabled={!session.isConnected}
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="hidden xl:block w-px h-12 bg-slate-200 mx-2"></div>

              {/* Group 2: Advanced Search & Local Filters */}
              <div className="flex flex-wrap gap-4 flex-[3]">
                <div className="space-y-1.5 w-28">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> RUT
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: 76..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={filters.rut}
                    onChange={e => setFilters({ rut: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5 w-28">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> C. Costo
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: 200"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={filters.cc}
                    onChange={e => setFilters({ cc: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 w-28">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> Proyecto
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: PRJ-1"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={filters.project}
                    onChange={e => setFilters({ project: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Search className="w-3 h-3" /> Búsqueda Rápida
                  </label>
                  <input 
                    type="text" 
                    placeholder="Buscar Nº Documento o Proyecto..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={filters.searchQuery}
                    onChange={e => setFilters({ searchQuery: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleFetchOrders()}
                  />
                </div>
              </div>

              {/* Group 3: Primary Action */}
              <div className="w-full xl:w-auto">
                <button 
                  onClick={handleFetchOrders}
                  disabled={!session.isConnected || isFetchingOrders || (activeTab === 'Compras' && isFetchingPurchases)}
                  className="w-full xl:w-[160px] h-[38px] flex items-center justify-center gap-2 bg-blue-700 text-white text-sm font-semibold rounded-md hover:bg-blue-800 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:shadow-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none"
                >
                  {isFetchingOrders || (activeTab === 'Compras' && isFetchingPurchases) ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  {isFetchingOrders || (activeTab === 'Compras' && isFetchingPurchases) ? 'Extrayendo...' : 'Consultar SAP'}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Tables Container (Split Layout) */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col space-y-6 overflow-hidden min-h-0"
            >
          {/* Data Quality Center */}
          {useStore(state => state.sheetAnomalies).length > 0 && activeTab === 'OVs' && (
            <section className="bg-amber-50/50 border border-amber-200/60 rounded-sm shadow-sm p-4 animate-in fade-in slide-in-from-top-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-800 tracking-tight">Calidad de Datos: Anomalías Detectadas</h3>
                <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-sm font-bold ml-2 border border-amber-200/50">
                  {useStore(state => state.sheetAnomalies).length} Casos
                </span>
              </div>
              <p className="text-[11px] text-amber-700/80 mb-3">
                Las siguientes Órdenes muestran incongruencias en la planilla operativa (Bd_Trabajada) y su facturación ha sido bloqueada.
              </p>
              <div className="max-h-32 overflow-y-auto border border-amber-200/40 rounded-sm custom-scrollbar">
                <table className="w-full text-left text-[11px] bg-white/50">
                  <thead className="bg-amber-100/30 sticky top-0 text-amber-800/80">
                    <tr>
                      <th className="p-2 font-semibold">OV (DocNum)</th>
                      <th className="p-2 font-semibold">Ref. Sheets (Doc Venta)</th>
                      <th className="p-2 font-semibold">Regla Quebrantada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {useStore(state => state.sheetAnomalies).map((a, i) => (
                      <tr key={i} className="border-b border-amber-50">
                        <td className="p-2 font-bold">{a.docNum}</td>
                        <td className="p-2 font-mono text-amber-600">{a.sheetRef}</td>
                        <td className="p-2 text-amber-700">{a.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Sales Orders Table */}
          {activeTab === 'OVs' && (
          <section className="flex-[3] bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col overflow-hidden min-h-0 relative">
            
            {/* Loading Overlay */}
            {isFetchingOrders && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                 <div className="text-slate-500 font-medium text-sm flex gap-2 items-center">
                   <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                   Descargando transacciones de SAP...
                 </div>
              </div>
            )}
            
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 min-h-[48px]">
              {batchSelectedOrders.length > 0 ? (
                <div className="flex items-center gap-4 w-full animate-in fade-in">
                  <span className="text-xs font-semibold text-blue-700">{batchSelectedOrders.length} Seleccionadas</span>
                  <div className="h-4 w-px bg-slate-300"></div>
                  {isProcessingBatch ? (
                    <span className="text-xs font-medium text-blue-600 flex items-center gap-2">
                       <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                       Procesando Masivo {batchProgress?.current || 0} / {batchProgress?.total || 0}...
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Confirmar Facturación Masiva',
                            actionType: 'batch-invoice',
                            data: {
                              affectedCount: batchSelectedOrders.length
                            },
                            onConfirm: (comment) => {
                              useStore.getState().invoiceBatchOrders();
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                              if (comment) {
                                const totalBatchAmount = useStore.getState().orders
                                  .filter(o => batchSelectedOrders.includes(o.docEntry))
                                  .reduce((sum, o) => sum + o.totalNet, 0);
                                  
                                sendFacturacionEmail(
                                  batchSelectedOrders.length,
                                  "",
                                  totalBatchAmount,
                                  "",
                                  comment,
                                  true
                                );
                              }
                            }
                          });
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-sm border border-emerald-200 shadow-sm"
                      >
                        Facturar Masivo
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Confirmar Cierre Masivo en SAP',
                            actionType: 'batch-close',
                            data: {
                              affectedCount: batchSelectedOrders.length
                            },
                            onConfirm: () => {
                              useStore.getState().closeBatchOrders();
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="text-[11px] font-bold text-red-700 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1 rounded-sm border border-red-200 shadow-sm"
                      >
                        Cerrar Masivo
                      </button>
                      <button 
                        onClick={() => toggleAllBatchSelection(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 transition-colors ml-2 hover:underline underline-offset-2"
                      >
                        Desmarcar Todo
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Órdenes de Ventas Vigentes</h2>
                  <span className="text-[10px] font-medium text-slate-400">{filteredOrders.length} registros encontrados</span>
                </>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
              <SalesOrderTable data={filteredOrders} onEditOrder={setEditingOrder} />
            </div>
          </section>
          )}

          {/* Invoices Table */}
          {activeTab === 'Facturas' && (
            <section className="flex-[3] bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col overflow-hidden min-h-0 relative">
              {isFetchingInvoices && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                   <div className="text-slate-500 font-medium text-sm flex gap-2 items-center">
                     <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                     Descargando facturas de SAP...
                   </div>
                </div>
              )}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 min-h-[48px]">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Facturas de Venta Vigentes</h2>
                <span className="text-[10px] font-medium text-slate-400">{filteredInvoices.length} registros encontrados</span>
              </div>
              <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
                <InvoiceTable data={filteredInvoices} />
              </div>
            </section>
            )}

          {/* Purchase Invoices Table */}
          {activeTab === 'Compras' && (
             <PurchaseInvoicesView />
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {editingOrder !== null && (
          <EditOrderModal 
            orderEntry={editingOrder} 
            onClose={() => setEditingOrder(null)} 
          />
        )}
      </AnimatePresence>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isConnected={session.isConnected}
        inputCompanyDb={inputCompanyDb}
        setInputCompanyDb={setInputCompanyDb}
        inputUser={inputUser}
        setInputUser={setInputUser}
        inputPass={inputPass}
        setInputPass={setInputPass}
        handleConnect={handleConnect}
      />

      <ConfirmationModal 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
        isLoading={isProcessingBatch} 
      />
    </div>
  );
}

