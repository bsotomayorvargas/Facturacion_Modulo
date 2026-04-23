import { useState, useMemo } from 'react';
import { useStore } from './store';
import { formatCurrency, formatDate } from './lib/utils';
import { Database, LogOut, CheckCircle2, UploadCloud, AlertCircle } from 'lucide-react';

const formatSheetStatus = (status?: string) => {
  switch(status) {
    case 'ready_anticipo': return <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">Anticipo</span>;
    case 'ready_cierre': return <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-0.5">Cierre <CheckCircle2 className="w-2.5 h-2.5" /></span>;
    case 'ready_100': return <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">100% Excep.</span>;
    case 'anomaly': return <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">Bloqueado</span>;
    case 'pending': return <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Pend. Op.</span>;
    default: return <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">N/A</span>;
  }
};

export default function App() {
  const { 
    session, filters, masterData, orders, selectedOrderEntry, selectedSublines,
    setFilters, selectOrder, toggleSubline, toggleAllSublines, connect, disconnect,
    syncMasterData, cancelOrder, generateInvoice, getSimulationPayload, fetchOrders,
    batchSelectedOrders, isProcessingBatch, batchProgress, toggleBatchSelection, toggleAllBatchSelection, closeBatchOrders
  } = useStore();

  const [inputUrl, setInputUrl] = useState(session.url);
  const [inputCompanyDb, setInputCompanyDb] = useState(session.companyDb);
  const [inputUser, setInputUser] = useState(session.user);
  const [inputPass, setInputPass] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  // Derived state: filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      !o.isCancelled &&
      o.bplid === filters.bplid &&
      (filters.rut ? o.cardCode.includes(filters.rut) : true) &&
      (filters.project ? o.documentLines.some(l => l.project?.includes(filters.project)) : true) &&
      (filters.cc ? o.documentLines.some(l => l.costCenter?.includes(filters.cc)) : true)
    );
  }, [orders, filters]);

  const selectedOrder = orders.find(o => o.docEntry === selectedOrderEntry);
  const jsonPayload = getSimulationPayload();

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
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs shadow-inner shadow-blue-400">S1</div>
              <h1 className="text-sm font-semibold tracking-tight uppercase">SBO Portal Analista</h1>
            </div>
            {session.isConnected && (
              <button onClick={disconnect} className="text-slate-400 hover:text-white" title="Desconectar">
                <LogOut className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4 flex-1 space-y-4 overflow-y-auto">
          {/* Credentials Panel */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              Credenciales Service Layer
              {session.isConnected && <CheckCircle2 className="w-3 h-3 text-green-500" />}
            </label>
            <input 
              type="text" 
              placeholder="https://sbo-server:50000/b1s/v2" 
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm disabled:opacity-50" 
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="text" 
              placeholder="CompanyDB (Ej: SBOFLUXSOLAR)" 
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded shadow-sm disabled:opacity-50" 
              value={inputCompanyDb}
              onChange={e => setInputCompanyDb(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="text" 
              placeholder="Usuario" 
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded shadow-sm disabled:opacity-50" 
              value={inputUser}
              onChange={e => setInputUser(e.target.value)}
              disabled={session.isConnected}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded shadow-sm disabled:opacity-50" 
              value={inputPass}
              onChange={e => setInputPass(e.target.value)}
              disabled={session.isConnected}
            />
            {!session.isConnected && (
              <button 
                onClick={handleConnect}
                className="w-full py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 transition-colors shadow-md disabled:bg-slate-400"
                disabled={!inputUrl || !inputUser || !inputPass}
              >
                Conectar Sistema
              </button>
            )}
          </div>

          <div className="h-px bg-slate-200"></div>

          {/* Master Data Button */}
          <button 
            onClick={syncMasterData}
            disabled={!session.isConnected || masterData.isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2 border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
          >
            <Database className={`w-3.5 h-3.5 ${masterData.isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar Datos Maestros
          </button>

          {/* Active Filters */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros de Búsqueda</label>
            <select 
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
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
                <label className="text-[9px] font-bold text-slate-400 uppercase">F. Desde</label>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" 
                  value={filters.dateFrom}
                  onChange={e => setFilters({ dateFrom: e.target.value })}
                  disabled={!session.isConnected}
                />
              </div>
              <div className="w-1/2">
                <label className="text-[9px] font-bold text-slate-400 uppercase">F. Hasta</label>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" 
                  value={filters.dateTo}
                  onChange={e => setFilters({ dateTo: e.target.value })}
                  disabled={!session.isConnected}
                />
              </div>
            </div>

            <input 
              type="text" 
              placeholder="RUT / CardCode" 
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" 
              value={filters.rut}
              onChange={e => setFilters({ rut: e.target.value })}
              disabled={!session.isConnected || masterData.bplids.length === 0}
            />
            <input 
              type="text" 
              placeholder="Proyecto (ProjectCode)" 
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" 
              value={filters.project}
              onChange={e => setFilters({ project: e.target.value })}
              disabled={!session.isConnected || masterData.bplids.length === 0}
            />
            <input 
              type="text" 
              placeholder="Centro Costo (CostingCode5)" 
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" 
              value={filters.cc}
              onChange={e => setFilters({ cc: e.target.value })}
              disabled={!session.isConnected || masterData.bplids.length === 0}
            />
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="text-[10px] text-slate-400">
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
            <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${session.isConnected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              Service Layer: {session.isConnected ? 'Online' : 'Offline'}
            </span>
            <div className="h-4 w-px bg-slate-300"></div>
            {session.isConnected ? (
              <div 
                className="text-[10px] text-slate-500 font-mono truncate bg-slate-50 px-2 py-1 rounded border border-slate-200 max-w-2xl cursor-help"
                title={`/Orders()?$select=DocEntry,DocNum,DocType,DocDate,DocDueDate,TaxDate,CardCode,DocTotal,DocCurrency,DocRate,Reference1,Comments,JournalMemo,BPLName,Cancelled,DocumentLines&$filter=DocDate ge '${filters.dateFrom}' and DocDate le '${filters.dateTo}'`}
              >
                GET /Orders()?$select=DocEntry,DocNum...&$filter=DocDate ge '{filters.dateFrom}' and DocDate le '{filters.dateTo}'
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Esperando credenciales...</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 ml-4">
            <div className="relative overflow-hidden inline-[block]">
              <input 
                type="file" 
                accept=".csv"
                id="csvUpload"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (typeof event.target?.result === 'string') {
                        import('papaparse').then(Papa => {
                          Papa.parse(event.target!.result as string, {
                            header: true,
                            complete: (results: any) => {
                              useStore.getState().syncSheetsData(results.data);
                              alert("¡Planilla Sheets (CSV) cruzada exitosamente con las Órdenes de SAP B1!");
                            }
                          });
                        });
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
              <button 
                className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 pointer-events-none"
                disabled={!session.isConnected}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Sincronizar Sheets (CSV)
              </button>
            </div>
            <button 
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2" 
              onClick={handleFetchOrders}
              disabled={!session.isConnected || isFetchingOrders}
            >
              <Database className={`w-3.5 h-3.5 ${isFetchingOrders ? 'animate-spin' : ''}`} />
              {isFetchingOrders ? 'Extrayendo...' : 'Extraer OVs SBO'}
            </button>
          </div>
        </header>

        {/* Tables Container (Split Layout) */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col relative z-0">
          
          {/* Batch Floating Header */}
          {batchSelectedOrders.length > 0 && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-5 py-2.5 rounded-full font-sans shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-top-4 fade-in">
              <span className="text-xs font-semibold">{batchSelectedOrders.length} OVs seleccionadas para lote</span>
              <div className="h-4 w-px bg-slate-600"></div>
              {isProcessingBatch ? (
                <span className="text-xs font-medium text-amber-400 flex items-center gap-2">
                   <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                   Procesando {batchProgress?.current || 0} de {batchProgress?.total || 0}...
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={closeBatchOrders}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest bg-red-950/50 px-3 py-1 rounded"
                  >
                    Cerrar OVs en SBO
                  </button>
                  <button 
                    onClick={() => toggleAllBatchSelection(false)}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    (Desmarcar Todo)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Data Quality Center */}
          {useStore(state => state.sheetAnomalies).length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-lg shadow-sm p-4 animate-in fade-in slide-in-from-top-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-800">Calidad de Datos: Anomalías Detectadas</h3>
                <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">
                  {useStore(state => state.sheetAnomalies).length} Casos
                </span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Las siguientes Órdenes muestran incongruencias en la planilla operativa (Bd_Trabajada) y su facturación ha sido bloqueada.
              </p>
              <div className="max-h-32 overflow-y-auto border border-amber-200 rounded">
                <table className="w-full text-left text-[11px] bg-white">
                  <thead className="bg-amber-100/50 sticky top-0 text-amber-800">
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
          <section className="flex-[3] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden min-h-0 relative">
            
            {/* Loading Overlay */}
            {isFetchingOrders && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                 <div className="text-slate-500 font-medium text-sm flex gap-2 items-center">
                   <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                   Descargando transacciones de SAP...
                 </div>
              </div>
            )}
            
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Órdenes de Ventas Vigentes</h2>
              <span className="text-[10px] font-medium text-slate-400">{filteredOrders.length} registros encontrados</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="p-3 font-semibold w-10 text-center">
                      <input 
                        type="checkbox"
                        disabled={filteredOrders.length === 0 || isProcessingBatch}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={filteredOrders.length > 0 && batchSelectedOrders.length === filteredOrders.length}
                        onChange={(e) => toggleAllBatchSelection(e.target.checked)}
                      />
                    </th>
                    <th className="p-3 font-semibold w-24">Nº OV (DocNum)</th>
                    <th className="p-3 font-semibold w-20">DocEntry</th>
                    <th className="p-3 font-semibold w-32">RUT / SN</th>
                    <th className="p-3 font-semibold w-28">F. Documento</th>
                    <th className="p-3 font-semibold w-24 text-center">Estado Operativo</th>
                    <th className="p-3 font-semibold max-w-[120px]">C. Costo (Ej)</th>
                    <th className="p-3 font-semibold text-right w-28">Total (Neto)</th>
                    <th className="p-3 font-semibold text-center w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(o => {
                    const isChecked = batchSelectedOrders.includes(o.docEntry);
                    return (
                    <tr 
                      key={o.docEntry} 
                      className={`cursor-pointer transition-colors ${selectedOrderEntry === o.docEntry ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'} ${isChecked ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'} ${o.sheetStatus === 'anomaly' ? 'bg-red-50 hover:bg-red-100 opacity-60 border-l-red-500' : ''}`}
                      onClick={() => o.sheetStatus === 'anomaly' ? null : selectOrder(o.docEntry === selectedOrderEntry ? null : o.docEntry)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-200 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleBatchSelection(o.docEntry)}
                          disabled={isProcessingBatch || o.sheetStatus === 'anomaly'}
                        />
                      </td>
                      <td className={`p-3 font-bold ${selectedOrderEntry === o.docEntry ? 'text-blue-700' : 'text-slate-700'}`}>
                        {o.docNum}
                        <div className="text-[9px] font-mono font-normal text-slate-400 mt-0.5">{o.sheetRef || ''}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{o.docEntry}</td>
                      <td className="p-3 text-[11px] truncate whitespace-nowrap">{o.cardCode} <span className="font-medium text-slate-500"></span></td>
                      <td className="p-3 text-[11px] whitespace-nowrap">{formatDate(o.docDate)}</td>
                      <td className="p-3 text-center">{formatSheetStatus(o.sheetStatus)}</td>
                      <td className="p-3 text-[11px] text-slate-500 truncate max-w-[120px]">{o.documentLines[0]?.costCenter || "-"}</td>
                      <td className="p-3 text-right font-mono font-semibold">{o.currency === 'CLP' ? formatCurrency(o.totalNet) : `${o.totalNet} UF`}</td>
                      <td className="p-3 text-center">
                        <button 
                          className="text-red-500 hover:text-red-700 font-medium hover:underline text-[11px] px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          onClick={(e) => { e.stopPropagation(); cancelOrder(o.docEntry); }}
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  )})}
                  {filteredOrders.length === 0 && session.isConnected && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">No hay órdenes vigentes para los filtros seleccionados (Recuerda presionar Extraer OVs).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sublines / Detail Section */}
          <section className={`transition-all duration-300 ease-in-out bg-slate-100 border border-slate-200 rounded-lg flex flex-col overflow-hidden shrink-0 ${selectedOrderEntry ? 'h-64' : 'h-12'}`}>
            <div className="px-4 py-2 bg-slate-800 text-white flex justify-between items-center shrink-0 h-12">
              <h3 className="text-[11px] font-bold uppercase tracking-wider">
                {selectedOrderEntry ? `Líneas del Documento #${selectedOrderEntry} (${selectedOrder?.currency})` : 'Seleccione una Orden para ver detalles'}
              </h3>
              {selectedOrderEntry && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider">JSON Simulation Mode</span>
                  <div 
                    className={`w-8 h-4 rounded-full flex items-center px-1 shadow-inner cursor-pointer transition-colors ${isSimulating ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => setIsSimulating(!isSimulating)}
                  >
                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isSimulating ? 'translate-x-3.5' : ''}`}></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Split Panel inside bottom section depending on Simulation toggle */}
            {selectedOrderEntry && (
              <div className="flex-1 flex overflow-hidden">
                {/* Table Portion */}
                <div className={`flex-1 overflow-auto bg-white transition-all ${isSimulating ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-tight sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-2 w-10 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedOrder?.documentLines.filter(l => l.lineStatus === 'bost_Open').length === selectedSublines.length && selectedSublines.length > 0}
                            onChange={(e) => toggleAllSublines(e.target.checked)}
                          />
                        </th>
                        <th className="p-2">ItemCode</th>
                        <th className="p-2">Descripción</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Proyecto</th>
                        <th className="p-2">C.Costo</th>
                        <th className="p-2 text-right">Cant.</th>
                        <th className="p-2 text-right">Precio Un.</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder?.documentLines.map(line => {
                        const isChecked = selectedSublines.includes(line.lineNum);
                        const isOpen = line.lineStatus === 'bost_Open';
                        const isAnomaly = selectedOrder.sheetStatus === 'anomaly';
                        
                        // Disable specific lines based on new policy if a sheet status is present, but keep open if manual overide is expected 
                        // But for anomaly, we lock completely
                        const isLineLocked = !isOpen || isAnomaly || (
                          selectedOrder.sheetStatus === 'ready_anticipo' && line.lineNum !== 0
                        ) || (
                          selectedOrder.sheetStatus === 'ready_cierre' && line.lineNum !== 1
                        );

                        return (
                          <tr key={line.lineNum} className={`transition-colors ${isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'} ${isLineLocked && 'opacity-50 cursor-not-allowed bg-slate-100 hover:bg-slate-100'}`} onClick={() => !isLineLocked && toggleSubline(line.lineNum)}>
                            <td className="p-2 text-center" onClick={e => !isLineLocked && e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-200"
                                checked={isChecked}
                                onChange={() => toggleSubline(line.lineNum)}
                                disabled={isLineLocked}
                              />
                            </td>
                            <td className="p-2 font-mono break-words">{line.itemCode}</td>
                            <td className="p-2 font-medium text-slate-700 truncate max-w-[150px]">{line.dscription}</td>
                            <td className="p-2 text-xs font-semibold">{line.lineStatus === 'bost_Open' ? 'Abierta' : 'Cerrada'}</td>
                            <td className="p-2 text-slate-500">{line.project}</td>
                            <td className="p-2 text-slate-500">{line.costCenter}</td>
                            <td className="p-2 text-right font-semibold">{line.quantity}</td>
                            <td className="p-2 text-right font-mono">{line.currency === 'CLP' ? formatCurrency(line.price) : `${line.price} UF`}</td>
                            <td className="p-2 text-right font-mono font-medium text-slate-800">{line.currency === 'CLP' ? formatCurrency(line.price * line.quantity) : `${line.price * line.quantity} UF`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Simulation Portion */}
                {isSimulating && (
                  <div className="w-1/2 bg-slate-900 text-slate-300 p-4 font-mono text-[10px] overflow-auto flex flex-col shadow-inner">
                    <p className="text-slate-500 mb-2 font-sans font-bold uppercase tracking-widest text-[9px]">Preview: oInvoices Service Layer payload</p>
                    {jsonPayload ? (
                      <pre className="whitespace-pre-wrap leading-relaxed text-blue-300">
                        {JSON.stringify(jsonPayload, null, 2)}
                      </pre>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 italic font-sans text-xs">
                        Selecciona al menos una línea para generar Payload
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Action Footer */}
            {selectedOrderEntry && (
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-tight">Status:</span> 
                  {selectedSublines.length > 0 ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{selectedSublines.length} líneas preparadas</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Borrador inicial</span>
                  )}
                  {selectedSublines.length > 0 && selectedOrder && (
                    <>
                      <div className="w-px h-4 bg-slate-300 mx-2"></div>
                      <span className="font-semibold uppercase tracking-tight">Total Factura:</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {selectedOrder.currency === 'CLP' 
                          ? formatCurrency(selectedOrder.documentLines.filter(l => selectedSublines.includes(l.lineNum)).reduce((sum, l) => sum + (l.price * l.quantity), 0))
                          : `${selectedOrder.documentLines.filter(l => selectedSublines.includes(l.lineNum)).reduce((sum, l) => sum + (l.price * l.quantity), 0)} UF`
                        }
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isSimulating && (
                    <button 
                      onClick={() => setIsSimulating(true)}
                      className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-all focus:ring-2 focus:ring-slate-200"
                    >
                      Simular Facturación
                    </button>
                  )}
                  <button 
                    onClick={handleInvoice}
                    disabled={!jsonPayload}
                    className="px-6 py-1.5 bg-blue-700 text-white text-xs font-bold rounded shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:shadow-none"
                  >
                    GENERAR FACTURA (Deudores)
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

