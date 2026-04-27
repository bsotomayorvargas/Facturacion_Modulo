import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from './store';
import { formatCurrency, formatDate } from './lib/utils';
import { Database, LogOut, CheckCircle2, UploadCloud, AlertCircle, ArrowUp, ArrowDown, MoreVertical, ChevronDown, ChevronRight, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EditOrderModal } from './components/EditOrderModal';

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

export default function App() {
  const { 
    session, filters, masterData, orders, selectedOrderEntry, selectedSublines,
    setFilters, selectOrder, toggleSubline, toggleAllSublines, connect, disconnect,
    syncMasterData, generateInvoice, getSimulationPayload, fetchOrders,
    batchSelectedOrders, isProcessingBatch, batchProgress, toggleBatchSelection, toggleAllBatchSelection,
    regularizeProjects
  } = useStore();

  const [inputUrl, setInputUrl] = useState(session.url);
  const [inputCompanyDb, setInputCompanyDb] = useState(session.companyDb);
  const [inputUser, setInputUser] = useState(session.user);
  const [inputPass, setInputPass] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>('docNum');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<number | null>(null);

  // Close auto menu on click outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenu(null);
    if (activeMenu !== null) {
      document.addEventListener('click', handleGlobalClick);
      return () => document.removeEventListener('click', handleGlobalClick);
    }
  }, [activeMenu]);

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

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let valA: any = a[sortColumn as keyof typeof a];
        let valB: any = b[sortColumn as keyof typeof b];

        if (sortColumn === 'costCenter') {
          valA = a.documentLines[0]?.costCenter || '';
          valB = b.documentLines[0]?.costCenter || '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredOrders, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const selectedOrder = orders.find(o => o.docEntry === selectedOrderEntry);
  const jsonPayload = getSimulationPayload();

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    const prevValue = filters[key] || '';
    if (value.length < prevValue.length) {
      setFilters({ [key]: value });
      return;
    }
    const clean = value.replace(/[^\d]/g, '');
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + clean.slice(4, 8);
    setFilters({ [key]: formatted.slice(0, 10) });
  };

  const handleConnect = () => {
    if (inputUrl && inputCompanyDb && inputUser && inputPass) {
      connect(inputUrl, inputCompanyDb, inputUser, inputPass);
    }
  };

  const handleFetchOrders = async () => {
    setIsFetchingOrders(true);
    await fetchOrders();
    setIsFetchingOrders(false);
  };

  const handleInvoice = async () => {
    await generateInvoice();
    setIsSimulating(false);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR: Credentials & Global Actions */}
      <aside className="w-64 bg-blue-950 border-r border-blue-900 flex flex-col shrink-0 shadow-xl z-10">
        <div className="p-4 border-b border-blue-900 bg-blue-950 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center font-bold text-xs shadow-inner shadow-blue-500 text-white">S1</div>
              <h1 className="text-sm font-semibold tracking-tight uppercase text-white">SBO Portal Analista</h1>
            </div>
            {session.isConnected && (
              <button onClick={disconnect} className="text-blue-300 hover:text-white transition-colors" title="Desconectar">
                <LogOut className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4 flex-1 space-y-4 overflow-y-auto">
          {/* Credentials Panel */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between">
              Credenciales Service Layer
              {session.isConnected && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            </label>
            <input 
              type="text" 
              placeholder="https://sbo-server:50000/b1s/v2" 
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all shadow-inner disabled:opacity-50" 
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="text" 
              placeholder="CompanyDB (Ej: SBOFLUXSOLAR)" 
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all shadow-inner disabled:opacity-50" 
              value={inputCompanyDb}
              onChange={e => setInputCompanyDb(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="text" 
              placeholder="Usuario" 
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all shadow-inner disabled:opacity-50" 
              value={inputUser}
              onChange={e => setInputUser(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all shadow-inner disabled:opacity-50" 
              value={inputPass}
              onChange={e => setInputPass(e.target.value)}
              disabled={session.isConnected}
            />
            {!session.isConnected && (
              <button 
                onClick={handleConnect}
                className="w-full py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-sm hover:bg-blue-500 transition-colors shadow-md disabled:bg-white/5 disabled:text-blue-300/40"
                disabled={!inputUrl || !inputUser || !inputPass}
              >
                Conectar Sistema
              </button>
            )}
          </div>

          <div className="h-px bg-blue-800/50"></div>

          {/* Master Data Button */}
          <button 
            onClick={syncMasterData}
            disabled={!session.isConnected || masterData.isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2 border border-blue-400/20 bg-blue-900/40 text-blue-200 text-xs font-medium rounded-sm hover:bg-blue-800/60 transition-colors shadow-sm disabled:opacity-50 disabled:bg-white/5 disabled:text-blue-300/30 disabled:border-transparent"
          >
            <Database className={`w-3.5 h-3.5 ${masterData.isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Datos Maestros
          </button>

          {/* Active Filters */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Filtros de Búsqueda</label>
            <select 
              className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 text-white rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-white/5 disabled:text-blue-300/40 [&>option]:text-slate-900"
              value={filters.bplid}
              onChange={e => setFilters({ bplid: e.target.value })}
              disabled={!session.isConnected || masterData.bplids.length === 0}
            >
              {masterData.bplids.length === 0 ? (
                <option value="">Sincronice datos maestros...</option>
              ) : (
                masterData.bplids.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))
              )}
            </select>
            
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="text-[9px] font-bold text-blue-300/80 uppercase">F. Desde</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="DD/MM/YYYY"
                    className="w-full px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all disabled:bg-white/5 disabled:text-blue-300/40" 
                    value={filters.dateFrom}
                    onChange={e => handleDateChange('dateFrom', e.target.value)}
                    disabled={!session.isConnected}
                  />
                </div>
              </div>
              <div className="w-1/2">
                <label className="text-[9px] font-bold text-blue-300/80 uppercase">F. Hasta</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="DD/MM/YYYY"
                    className="w-full px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 text-white placeholder-blue-200/40 rounded-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white/10 transition-all disabled:bg-white/5 disabled:text-blue-300/40" 
                    value={filters.dateTo}
                    onChange={e => handleDateChange('dateTo', e.target.value)}
                    disabled={!session.isConnected}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleFetchOrders}
              disabled={!session.isConnected || isFetchingOrders}
              className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-sm hover:bg-blue-500 transition-colors shadow-md disabled:opacity-50 disabled:bg-white/10 disabled:text-blue-200/50 flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              {isFetchingOrders ? 'Cargando...' : 'Consultar SAP'}
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-blue-950 border-t border-blue-900">
          <div className="text-[10px] text-blue-300/50 font-mono">
            {session.token ? `Sesión: ${session.token.substring(0, 10)}...` : 'Sin conexión SL'}
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

        {/* Top Dashboard Bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className={`text-xs font-semibold px-2 py-1 rounded-sm whitespace-nowrap ${session.isConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
              Service Layer: {session.isConnected ? 'Online' : 'Offline'}
            </span>
            <div className="h-4 w-px bg-slate-300"></div>
            {session.isConnected ? (
              <div 
                className="text-[10px] text-slate-500 font-mono truncate bg-slate-50 px-2 py-1 rounded-sm border border-slate-200 max-w-2xl cursor-help"
                title={`/Orders()?$select=DocEntry,DocNum,DocType,DocDate,DocDueDate,TaxDate,CardCode,DocTotal,DocCurrency,DocRate,Reference1,Comments,JournalMemo,BPLName,Cancelled,DocumentLines&$filter=DocDate ge '${filters.dateFrom}' and DocDate le '${filters.dateTo}'`}
              >
                GET /Orders()?$select=DocEntry,DocNum...&$filter=DocDate ge '{filters.dateFrom}' and DocDate le '{filters.dateTo}'
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Esperando credenciales...</p>
            )}
          </div>
            <div className="flex gap-2 shrink-0 ml-4 items-center">
              <button 
                onClick={async () => {
                  const XLSX = await import('xlsx');
                  const worksheet = XLSX.utils.aoa_to_sheet([
                    ["Ceco", "Doc venta", "Fecha de ganado", "Fecha TE4 Inscrito"],
                    ["200", "540001479", "01-01-2024", ""],
                    ["300", "540001480", "01-01-2024", "15-02-2024"],
                    ["200", "540001481", "", "15-02-2024"],
                    ["300", "21007-540001482", "01-01-2024", ""]
                  ]);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
                  XLSX.writeFile(workbook, "Plantilla_Cruce_OVs.xlsx");
                }}
                className="text-[10px] uppercase font-bold tracking-widest text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-sm transition-colors mr-2 border border-slate-200 cursor-pointer shadow-sm"
              >
                Descargar Plantilla Excel
              </button>
              <div className="relative overflow-hidden inline-[block]">
              <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                id="csvUpload"
                className="absolute inset-0 opacity-0 cursor-pointer"
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
                          const firstSheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[firstSheetName];
                          
                          // Format dates to avoid unparseable values depending on Excel version
                          const resultsData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
                          
                          useStore.getState().syncSheetsData(resultsData);
                          alert("¡Planilla Excel/CSV cruzada exitosamente con las Órdenes de SAP B1!");
                        } catch (error) {
                          console.error("Error validando el archivo:", error);
                          alert("Ocurrió un error al leer el archivo. Intenta guardarlo nuevamente como XLSX o CSV.");
                        }
                      }
                    };
                    reader.readAsArrayBuffer(file);
                  }
                }}
              />
              <button 
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-sm hover:bg-slate-900 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 pointer-events-none"
                disabled={!session.isConnected}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Sincronizar Lote (Excel/CSV)
              </button>
            </div>
            <button 
              className="px-4 py-1.5 bg-blue-800 text-white text-xs font-medium rounded-sm hover:bg-blue-900 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2" 
              onClick={handleFetchOrders}
              disabled={!session.isConnected || isFetchingOrders}
            >
              <Database className={`w-3.5 h-3.5 ${isFetchingOrders ? 'animate-spin' : ''}`} />
              {isFetchingOrders ? 'Extrayendo...' : 'Extraer OVs SBO'}
            </button>
          </div>
        </header>

        {/* Search Module Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text"
                  placeholder="Buscar por Número de OV / Documento SAP..."
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-sm bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all shadow-inner"
                  value={filters.searchQuery}
                  onChange={e => setFilters({ searchQuery: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleFetchOrders()}
                />
              </div>
              <button 
                onClick={handleFetchOrders}
                disabled={!session.isConnected || isFetchingOrders}
                className="px-6 py-2 bg-blue-800 text-white rounded-sm text-sm font-bold hover:bg-blue-900 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isFetchingOrders ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Ejecutar Búsqueda
                  </>
                )}
              </button>
              
              <button 
                onClick={() => regularizeProjects(sortedOrders)}
                disabled={!session.isConnected || isFetchingOrders || isProcessingBatch}
                className="px-4 py-2 bg-slate-50 text-slate-700 rounded-sm text-[11px] font-bold hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2 shadow-sm disabled:opacity-50"
                title="Sincroniza proyectos de líneas a cabecera para mejorar la búsqueda"
              >
                {isProcessingBatch && batchProgress ? (
                  <>
                    <div className="w-3 h-3 border-2 border-slate-500/30 border-t-slate-600 rounded-full animate-spin" />
                    <span>Procesando... {batchProgress.current}/{batchProgress.total}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Regularizar Proyectos</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold uppercase tracking-tight text-[10px]">Filtros API:</span>
                <input 
                  type="text" 
                  placeholder="RUT Cliente" 
                  className="px-3 py-1.5 border border-slate-200 rounded-sm bg-white shadow-sm focus:ring-1 focus:ring-blue-600 outline-none w-40"
                  value={filters.rut}
                  onChange={e => setFilters({ rut: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Código Proyecto" 
                  className="px-3 py-1.5 border border-slate-200 rounded-sm bg-white shadow-sm focus:ring-1 focus:ring-blue-600 outline-none w-40"
                  value={filters.project}
                  onChange={e => setFilters({ project: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Centro Costo" 
                  className="px-3 py-1.5 border border-slate-200 rounded-sm bg-white shadow-sm focus:ring-1 focus:ring-blue-600 outline-none w-40"
                  value={filters.cc}
                  onChange={e => setFilters({ cc: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tables Container (Split Layout) */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col relative z-0">
          
          {/* Data Quality Center */}
          {useStore(state => state.sheetAnomalies).length > 0 && (
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
                        onClick={() => useStore.getState().invoiceBatchOrders()}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-sm border border-emerald-200 shadow-sm"
                      >
                        Facturar Masivo
                      </button>
                      <button 
                        onClick={() => useStore.getState().closeBatchOrders()}
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
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="p-3 font-semibold w-10 text-center">
                      <input 
                        type="checkbox"
                        disabled={sortedOrders.length === 0 || isProcessingBatch}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={sortedOrders.length > 0 && batchSelectedOrders.length === sortedOrders.length}
                        onChange={(e) => toggleAllBatchSelection(e.target.checked)}
                      />
                    </th>
                    <th className="p-3 font-semibold w-24 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('docNum')}>
                      <div className="flex items-center gap-1">
                        Nº OV
                        {sortColumn === 'docNum' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'docNum' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold w-20 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('docEntry')}>
                      <div className="flex items-center gap-1">
                        DocEntry
                        {sortColumn === 'docEntry' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'docEntry' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold w-32 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('cardCode')}>
                      <div className="flex items-center gap-1">
                        RUT / SN
                        {sortColumn === 'cardCode' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'cardCode' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold w-28 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('docDate')}>
                      <div className="flex items-center gap-1">
                        F. Documento
                        {sortColumn === 'docDate' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'docDate' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold w-24 text-center cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('sheetStatus')}>
                      <div className="flex items-center justify-center gap-1">
                        Estado
                        {sortColumn === 'sheetStatus' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'sheetStatus' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold max-w-[100px] cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('costCenter')}>
                      <div className="flex items-center gap-1">
                        C. Costo (D5)
                        {sortColumn === 'costCenter' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'costCenter' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold text-left">Ref.</th>
                    <th className="p-3 font-semibold text-left w-32 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('project')}>
                       <div className="flex items-center gap-1">
                        Proyecto
                        {sortColumn === 'project' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'project' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold text-center w-16">Divisa</th>
                    <th className="p-3 font-semibold text-right w-32 cursor-pointer hover:text-slate-700 select-none group" onClick={() => handleSort('totalNet')}>
                      <div className="flex items-center justify-end gap-1">
                        Total (Neto, CLP)
                        {sortColumn === 'totalNet' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />)}
                        {sortColumn !== 'totalNet' && <ArrowUp className="w-3 h-3 text-transparent group-hover:text-slate-300" />}
                      </div>
                    </th>
                    <th className="p-3 font-semibold text-center w-12 text-slate-400"><MoreVertical className="w-4 h-4 mx-auto" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedOrders.map(o => {
                    const isChecked = batchSelectedOrders.includes(o.docEntry);
                    const isClosed = o.documentStatus === 'bost_Close' || o.documentStatus === 'bost_Cancel' || o.isCancelled;
                    const isExpanded = selectedOrderEntry === o.docEntry;
                    
                    return (
                      <React.Fragment key={o.docEntry}>
                        <tr 
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-blue-50/30'} ${isChecked ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'} ${o.sheetStatus === 'anomaly' ? 'bg-red-50/50 hover:bg-red-50 opacity-80 border-l-red-500' : ''} ${isClosed ? 'opacity-50 grayscale bg-slate-50/50 hover:bg-slate-100/50' : ''}`}
                          onClick={() => o.sheetStatus === 'anomaly' ? null : selectOrder(isExpanded ? null : o.docEntry)}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 justify-center ml-2">
                              {o.sheetStatus !== 'anomaly' ? (
                                <button className="text-slate-400 hover:text-blue-600 focus:outline-none transition-colors" onClick={(e) => { e.stopPropagation(); selectOrder(isExpanded ? null : o.docEntry); }}>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              ) : <div className="w-4 h-4"></div>}
                              <input 
                                type="checkbox"
                                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100 cursor-pointer"
                                checked={isChecked}
                                onChange={() => toggleBatchSelection(o.docEntry)}
                                disabled={isProcessingBatch || o.sheetStatus === 'anomaly' || o.sheetStatus === 'pending' || o.sheetStatus === 'pending_te4' || isClosed}
                              />
                            </div>
                          </td>
                          <td className={`p-3 font-bold tabular-nums ${isExpanded ? 'text-blue-800' : 'text-slate-800'}`}>
                            {o.docNum}
                            <div className="text-[9px] font-mono font-normal text-slate-400 mt-0.5 tabular-nums">{o.sheetRef || ''}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[10px] tabular-nums">{o.docEntry}</td>
                          <td className="p-3 text-[11px] truncate whitespace-nowrap">{o.cardCode} <span className="font-medium text-slate-500"></span></td>
                          <td className="p-3 text-[11px] whitespace-nowrap tabular-nums">{formatDate(o.docDate)}</td>
                          <td className="p-3 text-center">
                             {isClosed ? <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">Cerrado</span> : formatSheetStatus(o.sheetStatus)}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 truncate max-w-[100px] tabular-nums">{o.documentLines[0]?.costCenter || "-"}</td>
                          <td className="p-3 text-[11px] text-slate-600 truncate max-w-[80px] font-medium italic">{o.reference || "-"}</td>
                          <td className="p-3 text-[11px] text-blue-700 truncate max-w-[120px] font-bold">
                            {o.project ? o.project : (
                              (() => {
                                const lineProj = o.documentLines.find(l => l.project && l.project.trim() !== '')?.project;
                                return lineProj ? (
                                  <span className="text-slate-400 font-normal italic flex items-center gap-1" title="Sugerencia basada en líneas">
                                    <ArrowRight className="w-2.5 h-2.5 text-blue-300" />
                                    {lineProj}
                                  </span>
                                ) : "-";
                              })()
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-center font-semibold text-slate-600">{o.currency}</td>
                          <td className="p-3 text-right font-mono font-semibold tabular-nums tracking-tight">{formatCurrency(o.totalNet)}</td>
                          <td className="p-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            {!isClosed && (
                              <>
                                <button 
                                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                                  onClick={() => setActiveMenu(activeMenu === o.docEntry ? null : o.docEntry)}
                                  disabled={isProcessingBatch}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                  {activeMenu === o.docEntry && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95, y: -5 }} 
                                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-8 top-2 bg-white shadow-xl border border-slate-200 rounded-sm py-1 z-50 w-36 flex flex-col items-stretch overflow-hidden origin-top-right text-left"
                                    >
                                      <button 
                                        className="px-4 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 text-left transition-colors"
                                        onClick={() => { setActiveMenu(null); useStore.getState().invoiceFullOrder(o.docEntry); }}
                                      >
                                        Facturar Orden
                                      </button>
                                      <button 
                                        className="px-4 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 text-left transition-colors"
                                        onClick={() => { setActiveMenu(null); setEditingOrder(o.docEntry); }}
                                      >
                                        Modificar Orden
                                      </button>
                                      <div className="h-px bg-slate-100 my-1 cursor-default"></div>
                                      <button 
                                        className="px-4 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 text-left transition-colors"
                                        onClick={() => { setActiveMenu(null); useStore.getState().closeOrder(o.docEntry); }}
                                      >
                                        Cerrar Orden
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${o.docEntry}-nested`} className="bg-slate-50/50">
                            <td colSpan={9} className="p-0 border-b border-slate-200">
                              <div className="p-4 pl-16 pr-8 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[400px]">
                                  {/* Inner JSON payload dev option */}
                                  <div className="px-4 py-2 bg-slate-800 text-white flex justify-between items-center shrink-0 h-10">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                      Líneas del Documento ({o.currency})
                                    </h3>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">JSON Sim Mode</span>
                                      <div 
                                        className={`w-7 h-3.5 rounded-full flex items-center px-0.5 shadow-inner cursor-pointer transition-colors ${isSimulating ? 'bg-blue-500' : 'bg-slate-600'}`}
                                        onClick={() => setIsSimulating(!isSimulating)}
                                      >
                                        <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isSimulating ? 'translate-x-3.5' : ''}`}></div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex-1 flex overflow-hidden min-h-0">
                                    {/* Table Content */}
                                    <div className={`flex-1 overflow-auto bg-white transition-all ${isSimulating ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>
                                      <table className="w-full text-[10px] text-left border-collapse">
                                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold tracking-tight sticky top-0 shadow-sm z-10">
                                          <tr>
                                            <th className="py-1.5 px-3 w-10 text-center font-bold">Línea</th>
                                            <th className="py-1.5 px-3 w-10 text-center">
                                              <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={o.documentLines.filter(l => l.lineStatus === 'bost_Open').length === selectedSublines.length && selectedSublines.length > 0}
                                                onChange={(e) => toggleAllSublines(e.target.checked)}
                                              />
                                            </th>
                                            <th className="py-1.5 px-3">Código</th>
                                            <th className="py-1.5 px-3">Descripción</th>
                                            <th className="py-1.5 px-3">Status</th>
                                            <th className="py-1.5 px-3">Proyecto</th>
                                            <th className="py-1.5 px-3">C.Costo</th>
                                            <th className="py-1.5 px-3 text-right">Cant.</th>
                                            <th className="py-1.5 px-3 text-right">Precio Un.</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {o.documentLines.map(line => {
                                            const isChecked = selectedSublines.includes(line.lineNum);
                                            const isOpen = line.lineStatus === 'bost_Open';
                                            const isAnomaly = o.sheetStatus === 'anomaly';
                                            
                                            // Disable logic
                                            const isLineLocked = !isOpen || isAnomaly || o.sheetStatus === 'pending' || o.sheetStatus === 'pending_te4' || (
                                              o.sheetStatus === 'ready_anticipo' && line.lineNum !== 0
                                            ) || (
                                              o.sheetStatus === 'ready_cierre' && line.lineNum !== 1
                                            ) || (
                                              o.sheetStatus === 'ready_100' && line.lineNum !== 0
                                            );

                                            return (
                                              <tr key={line.lineNum} className={`transition-colors ${isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'} ${isLineLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 hover:bg-slate-100' : ''}`} onClick={() => !isLineLocked && toggleSubline(line.lineNum)}>
                                                <td className="py-1.5 px-3 text-center">
                                                  <span className="font-mono font-bold text-slate-400 block">{line.lineNum}</span>
                                                  <span className="text-[8px] uppercase tracking-wider font-semibold text-slate-500">
                                                    {line.lineNum === 0 ? 'Anticipo' : line.lineNum === 1 ? 'Certificado' : line.lineNum === 2 ? 'Conectado' : ''}
                                                  </span>
                                                </td>
                                                <td className="py-1.5 px-3 text-center" onClick={e => !isLineLocked && e.stopPropagation()}>
                                                  <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-200"
                                                    checked={isChecked}
                                                    onChange={() => toggleSubline(line.lineNum)}
                                                    disabled={isLineLocked}
                                                  />
                                                </td>
                                                <td className="py-1.5 px-3 font-mono break-words text-slate-500">{line.itemCode}</td>
                                                <td className="py-1.5 px-3 font-medium text-slate-700 truncate max-w-[120px]">{line.dscription}</td>
                                                <td className="py-1.5 px-3 text-[9px] font-semibold">{line.lineStatus === 'bost_Open' ? 'Abierta' : 'Cerrada'}</td>
                                                <td className="py-1.5 px-3 text-slate-400">{line.project}</td>
                                                <td className="py-1.5 px-3 text-slate-400">{line.costCenter}</td>
                                                <td className="py-1.5 px-3 text-right font-semibold text-slate-600">{line.quantity}</td>
                                                <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(line.price)} {line.currency && line.currency !== 'CLP' ? `(${line.currency})` : ''}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    
                                    {/* Simulation Area */}
                                    {isSimulating && (
                                      <div className="w-1/2 bg-slate-900 text-slate-300 p-4 font-mono text-[9px] overflow-auto flex flex-col shadow-inner">
                                        <p className="text-slate-500 mb-2 font-sans font-bold uppercase tracking-widest text-[8px]">Preview: oInvoices Service Layer payload</p>
                                        {jsonPayload ? (
                                          <pre className="whitespace-pre-wrap leading-relaxed text-blue-300">
                                            {JSON.stringify(jsonPayload, null, 2)}
                                          </pre>
                                        ) : (
                                          <div className="flex-1 flex items-center justify-center text-slate-500 italic font-sans text-[10px]">
                                            Selecciona al menos una línea para generar Payload
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Footer for this Order */}
                                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                      <span className="font-bold uppercase tracking-tight">Status:</span> 
                                      {selectedSublines.length > 0 ? (
                                        <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded font-bold">{selectedSublines.length} líneas</span>
                                      ) : (
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">0 líneas seleccionadas</span>
                                      )}
                                      {selectedSublines.length > 0 && (
                                        <>
                                          <div className="w-px h-3 bg-slate-300 mx-2"></div>
                                          <span className="font-bold uppercase tracking-tight">Pagaré:</span>
                                          <span className="font-mono font-black text-slate-800 text-xs">
                                            {formatCurrency(o.documentLines.filter(l => selectedSublines.includes(l.lineNum)).reduce((sum, l) => sum + (l.price * l.quantity), 0))}
                                            {o.currency && o.currency !== 'CLP' ? ` (${o.currency})` : ''}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      {!isSimulating && (
                                        <button 
                                          onClick={() => setIsSimulating(true)}
                                          className="px-3 py-1 border border-slate-300 text-slate-600 text-[10px] font-bold rounded hover:bg-white transition-all"
                                        >
                                          SIMULAR P/L
                                        </button>
                                      )}
                                      <button 
                                        onClick={handleInvoice}
                                        disabled={!jsonPayload}
                                        className="px-5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-blue-700 transition-all font-mono disabled:opacity-50 disabled:shadow-none"
                                      >
                                        EJECUTAR (SAP)
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredOrders.length === 0 && session.isConnected && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">No hay órdenes vigentes para los filtros seleccionados (Recuerda presionar Extraer OVs).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {editingOrder !== null && (
        <EditOrderModal 
          orderEntry={editingOrder} 
          onClose={() => setEditingOrder(null)} 
        />
      )}
    </div>
  );
}

