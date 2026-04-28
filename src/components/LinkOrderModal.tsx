import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Invoice, SalesOrder } from '../types';
import { Link, X, Calculator, Search, AlertCircle, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

interface LinkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const LinkOrderModal: React.FC<LinkOrderModalProps> = ({ isOpen, onClose, invoice }) => {
  const orders = useStore(state => state.orders);
  const linkInvoiceToOrder = useStore(state => state.linkInvoiceToOrder);

  // Derivar candidatos
  const candidates = useMemo(() => {
    if (!invoice) return [];
    
    // Filtrar por RUT de cliente y que NO estén canceladas
    const matchedOrders = orders.filter(
      o => o.cardCode === invoice.cardCode && !o.isCancelled
    );

    // Calcular la relación de montos y ordenar por proximidad de fecha
    const withStats = matchedOrders.map(ov => {
      // Porcentaje de la factura respecto a la OV
      const percentage = (invoice.totalNet / ov.totalNet) * 100;
      
      // Intentar calcular dias de diferencia (absoluto) para ordenar
      const invDate = new Date(invoice.docDate).getTime();
      const ovDate = new Date(ov.docDate).getTime();
      const diffDays = Math.abs(invDate - ovDate) / (1000 * 60 * 60 * 24);

      return {
        ...ov,
        matchPercentage: percentage,
        diffDays
      };
    });

    // Ordenar: primero los que tengan una diferencia de días menor
    withStats.sort((a, b) => a.diffDays - b.diffDays);

    return withStats;
  }, [invoice, orders]);

  if (!isOpen || !invoice) return null;

  const handleLink = async (orderDocNum: number) => {
    if (!confirm(`¿Está seguro de vincular la Factura N° ${invoice.docNum} con la OV N° ${orderDocNum}?`)) {
      return;
    }
    
    await linkInvoiceToOrder(invoice.docEntry, orderDocNum);
    onClose();
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 95 && pct <= 105) return 'bg-emerald-100 text-emerald-800 border-emerald-200'; // Full
    if ((pct >= 28 && pct <= 32) || (pct >= 48 && pct <= 52) || (pct >= 58 && pct <= 62) || (pct >= 68 && pct <= 72)) {
      // Coincidencias clásicas de anticipos (30%, 50%, 60%, 70%)
      return 'bg-amber-100 text-amber-800 border-amber-200'; 
    }
    if (pct < 10) return 'bg-slate-100 text-slate-500 border-slate-200'; // Muy bajo
    return 'bg-blue-50 text-blue-700 border-blue-200'; // Intermedio
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200/50">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
              <Link className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Vincular Factura a Orden de Venta</h2>
              <p className="text-sm text-slate-500 font-medium">Análisis de Match Histórico por Cliente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Factura Objetivo */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
            <div>
              <p className="text-xs text-slate-500 mb-1">Factura N°</p>
              <p className="text-sm font-bold text-slate-800">{invoice.docNum}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Fecha Emisión</p>
              <p className="text-sm font-bold text-slate-800">{formatDate(invoice.docDate)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1">Cliente</p>
              <p className="text-sm font-bold text-slate-800 truncate">{invoice.cardName}</p>
              <p className="text-xs text-slate-500">{invoice.cardCode}</p>
            </div>
            <div className="col-span-4 mt-2 pt-3 border-t border-blue-100/60 flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">Monto a Vincular (Total Factura):</span>
              <span className="text-lg font-black text-blue-900 tabular-nums">
                {formatCurrency(invoice.totalNet)}
              </span>
            </div>
          </div>
        </div>

        {/* Sugerencias */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            Órdenes Candidatas ({candidates.length})
          </h3>

          {candidates.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No se encontraron Órdenes de Venta abiertas para este cliente.</p>
              <p className="text-sm text-slate-400 mt-1">Intente regularizar las OV en SAP o amplíe la fecha del buscador.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((ov) => {
                const isExact = ov.matchPercentage >= 95 && ov.matchPercentage <= 105;
                const isTypicalAdvance = (ov.matchPercentage >= 28 && ov.matchPercentage <= 32) || 
                                         (ov.matchPercentage >= 48 && ov.matchPercentage <= 52) ||
                                         (ov.matchPercentage >= 58 && ov.matchPercentage <= 62) ||
                                         (ov.matchPercentage >= 68 && ov.matchPercentage <= 72);
                
                return (
                  <div key={ov.docEntry} className={`bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border transition-colors hover:border-blue-300 ${isExact ? 'border-emerald-200' : 'border-slate-200'}`}>
                    
                    <div className="flex items-start gap-4">
                      {/* OV Icon / Badge */}
                      <div className={`flex flex-col items-center justify-center p-2 rounded-md border ${isExact ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <span className="text-xs font-bold">OV</span>
                        <span className="text-lg font-black leading-none mt-1">{ov.docNum}</span>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(ov.docDate)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[200px]">{ov.project || 'Sin Proyecto'}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-slate-600">Total OV:</span>
                          <span className="font-bold tabular-nums text-slate-800">
                            {formatCurrency(ov.totalNet)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proporcion y Accion */}
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calculator className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium">Proporción del Total</span>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md border text-sm font-bold tabular-nums ${getPercentageColor(ov.matchPercentage)}`}>
                          {ov.matchPercentage.toFixed(1)}%
                        </div>
                        {isTypicalAdvance && <span className="text-[10px] text-amber-600 font-bold mt-1 uppercase">Posible Anticipo/Saldo</span>}
                        {isExact && <span className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">Match Completo</span>}
                      </div>

                      <button
                        onClick={() => handleLink(ov.docNum)}
                        className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                      >
                        <Link className="w-4 h-4" />
                        Vincular
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LinkOrderModal;
