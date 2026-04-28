import React, { useState } from 'react';
import { useStore } from '../store';
import { Search, Filter, Loader2, Download, CheckSquare, Square, Mail, Banknote } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { generateBancoChileTxt, downloadTxt } from '../lib/bancoChileFormat';
import { sendNominaEmail } from '../lib/emailService';

export const PurchaseInvoicesView: React.FC = () => {
  const {
    purchaseInvoices,
    isFetchingPurchases,
    selectedPurchases,
    togglePurchaseSelection,
    toggleAllPurchaseSelection,
    fetchPurchaseInvoices,
    paySelectedInvoices,
    filters,
    setFilters
  } = useStore();

  const [transferAccount, setTransferAccount] = useState('_SYS00000000100'); // Cuenta de ejemplo default
  const [isPaying, setIsPaying] = useState(false);
  const [nominaId, setNominaId] = useState(`N-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);

  // Derive visible purchases (only open ones basically)
  const visiblePurchases = purchaseInvoices.filter(o => o.documentStatus !== 'bost_Close' && o.documentStatus !== 'bost_Cancel');
  const allSelected = visiblePurchases.length > 0 && selectedPurchases.length === visiblePurchases.length;

  const handleDownloadTxt = () => {
    if (selectedPurchases.length === 0) {
      alert("Seleccione al menos una factura para exportar.");
      return;
    }
    const selectedData = purchaseInvoices.filter(p => selectedPurchases.includes(p.docEntry));
    const txtContent = generateBancoChileTxt(selectedData, nominaId);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    downloadTxt(txtContent, `NOM_${nominaId}_${dateStr}.txt`);
  };

  const handleSendEmail = () => {
    const selectedData = purchaseInvoices.filter(p => selectedPurchases.includes(p.docEntry));
    sendNominaEmail(selectedData);
  };

  const handlePayInSAP = async () => {
    if (selectedPurchases.length === 0) return;
    if (!confirm(`¿Está seguro de generar el pago efectuado en SAP para ${selectedPurchases.length} facturas?`)) return;
    
    setIsPaying(true);
    await paySelectedInvoices(transferAccount, nominaId);
    setIsPaying(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Top Action Bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-slate-800">Cuentas por Pagar (Proveedores)</span>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
            {purchaseInvoices.length} registros
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {selectedPurchases.length > 0 && (
            <div className="flex items-center space-x-2 border-r border-slate-200 pr-3">
              <span className="text-xs text-slate-600 font-medium">
                {selectedPurchases.length} seleccionadas
              </span>
              <button
                onClick={handleDownloadTxt}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                title="Generar TXT Banco de Chile"
              >
                <Download className="w-3.5 h-3.5" />
                <span>TXT Banco Chile</span>
              </button>
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-sm bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Nómina</span>
              </button>
              <div className="flex items-center space-x-1 pl-2">
                 <input 
                   type="text" 
                   value={nominaId}
                   onChange={(e) => setNominaId(e.target.value)}
                   placeholder="ID Nómina"
                   className="h-8 text-xs border border-slate-300 bg-amber-50 rounded-sm px-2 w-28 focus:outline-none focus:border-blue-600 font-mono"
                   title="ID de la nómina para conciliación (Reference1)"
                 />
                 <input 
                   type="text" 
                   value={transferAccount}
                   onChange={(e) => setTransferAccount(e.target.value)}
                   placeholder="Cta Mayor Transferencia"
                   className="h-8 text-xs border border-slate-300 rounded-sm px-2 w-32 focus:outline-none focus:border-blue-600"
                   title="Cuenta contable o bancaria de origen en SAP (ej. _SYS00000000100)"
                 />
                 <button
                    onClick={handlePayInSAP}
                    disabled={isPaying}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-sm bg-blue-950 text-white hover:bg-blue-900 transition-colors disabled:opacity-50"
                 >
                    {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                    <span>Pagar en SAP</span>
                 </button>
              </div>
            </div>
          )}
          <button 
            onClick={() => fetchPurchaseInvoices()}
            disabled={isFetchingPurchases}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-sm bg-blue-950 text-white hover:bg-blue-900 transition-colors"
          >
            {isFetchingPurchases ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Buscar Facturas</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vencimiento</label>
            <select
              value={filters.daysToDue !== undefined ? filters.daysToDue : ''}
              onChange={(e) => setFilters({ daysToDue: e.target.value === '' ? '' : Number(e.target.value) })}
              className="h-8 text-xs border border-slate-300 rounded-sm px-2 bg-slate-50 hover:bg-white focus:border-blue-600 focus:outline-none w-40"
            >
              <option value="">Cualquier fecha</option>
              <option value={0}>Vencen Hoy (o vencidas)</option>
              <option value={3}>Vencen en &le; 3 días</option>
              <option value={7}>Vencen en &le; 7 días</option>
              <option value={15}>Vencen en &le; 15 días</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Búsqueda rápida</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                placeholder="RUT, Nombre o N° Factura..."
                className="h-8 pl-8 pr-3 text-xs border border-slate-300 rounded-sm w-64 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                onKeyDown={(e) => e.key === 'Enter' && fetchPurchaseInvoices()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Data Dense */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-3 py-2 w-10 border-b border-slate-200">
                <button 
                  onClick={() => toggleAllPurchaseSelection(!allSelected)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 whitespace-nowrap">Doc Num</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">Proveedor</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 whitespace-nowrap">F. Emisión</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 whitespace-nowrap">Vencimiento</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 text-right">Saldo a Pagar</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 text-right">Total Factura</th>
              <th className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">Referencia</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {visiblePurchases.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Filter className="w-8 h-8 text-slate-300 mb-2" />
                    <p>No se encontraron facturas de proveedores pendientes.</p>
                    <p className="text-[10px] mt-1 text-slate-400">Ajuste los filtros o presione Buscar Facturas.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visiblePurchases.map((inv) => {
                const isSelected = selectedPurchases.includes(inv.docEntry);
                const saldo = inv.docTotal - inv.paidToDate;
                
                // Color alert for due dates
                const today = new Date();
                const dueDate = new Date(inv.docDueDate);
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let dueDateColor = "text-slate-700";
                if (diffDays < 0) dueDateColor = "text-red-600 font-semibold";
                else if (diffDays <= 3) dueDateColor = "text-amber-600 font-semibold";

                return (
                  <tr 
                    key={inv.docEntry} 
                    className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                    onClick={(e) => {
                       // prevent toggling if user clicks a button inside row (though there are none currently)
                       togglePurchaseSelection(inv.docEntry);
                    }}
                  >
                    <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => togglePurchaseSelection(inv.docEntry)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium text-slate-700">
                      {inv.docNum}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900 truncate max-w-xs" title={inv.cardName}>{inv.cardName}</div>
                      <div className="text-[10px] text-slate-500 tabular-nums">{inv.cardCode}</div>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {formatDate(inv.docDate)}
                    </td>
                    <td className={`px-3 py-2 tabular-nums ${dueDateColor}`}>
                      {formatDate(inv.docDueDate)}
                      {diffDays < 0 && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1 rounded-sm">Vencida</span>}
                      {diffDays >= 0 && diffDays <= 3 && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded-sm">¡Pronto!</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-slate-900 text-right">
                      {inv.currency} {saldo.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-500 text-right">
                      {inv.currency} {inv.docTotal.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]" title={inv.reference}>
                      {inv.reference || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
