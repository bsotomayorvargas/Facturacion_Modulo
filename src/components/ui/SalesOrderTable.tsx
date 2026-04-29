import React, { useMemo, useState } from 'react';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useStore } from '../../store';
import { SalesOrder } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { sendFacturacionEmail } from '../../lib/emailService';
import { DataTable } from './DataTable';
import { ArrowRight, ChevronDown, ChevronRight, MoreVertical, CheckCircle2, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmationModal, ConfirmationActionType, ConfirmationData } from '../ConfirmationModal';

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

interface SalesOrderTableProps {
  data: SalesOrder[];
  onEditOrder: (docEntry: number) => void;
}

export function SalesOrderTable({ data, onEditOrder }: SalesOrderTableProps) {
  const {
    isProcessingBatch,
    batchSelectedOrders,
    toggleBatchSelection,
    toggleAllBatchSelection,
    selectedOrderEntry,
    selectOrder,
    selectedSublines,
    toggleSubline,
    toggleAllSublines,
    getSimulationPayload,
    generateInvoice,
    closeOrder,
    invoiceFullOrder,
    invoices
  } = useStore();

  const [activeMenu, setActiveMenu] = useState<{ docEntry: number; x: number; y: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  React.useEffect(() => {
    const handleClick = () => setActiveMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    actionType: ConfirmationActionType;
    data: ConfirmationData;
    onConfirm: (comment: string) => void;
  }>({ isOpen: false, title: '', actionType: 'invoice', data: {}, onConfirm: () => {} });

  const jsonPayload = selectedOrderEntry ? getSimulationPayload() : null;

  const columns = useMemo<ColumnDef<SalesOrder>[]>(() => [
    {
      id: 'selection',
      header: ({ table }) => {
        const validOrders = table.getRowModel().rows.filter(row => {
          const o = row.original;
          return o.documentStatus !== 'bost_Close' && o.documentStatus !== 'bost_Cancel' && !o.isCancelled && o.sheetStatus !== 'anomaly';
        });
        const isAllSelected = validOrders.length > 0 && batchSelectedOrders.length >= validOrders.length;
        
        return (
          <div className="flex items-center justify-center">
            <input 
              type="checkbox"
              disabled={validOrders.length === 0 || isProcessingBatch}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={isAllSelected}
              onChange={(e) => toggleAllBatchSelection(e.target.checked)}
            />
          </div>
        );
      },
      cell: ({ row }) => {
        const o = row.original;
        const isChecked = batchSelectedOrders.includes(o.docEntry);
        const isClosed = o.documentStatus === 'bost_Close' || o.documentStatus === 'bost_Cancel' || o.isCancelled;
        const isExpanded = selectedOrderEntry === o.docEntry;
        const disabled = isProcessingBatch || o.sheetStatus === 'anomaly' || o.sheetStatus === 'pending' || o.sheetStatus === 'pending_te4' || isClosed;

        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
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
              disabled={disabled}
            />
          </div>
        );
      },
      enableSorting: false,
      meta: { className: "w-16 text-center" }
    },
    {
      id: 'docNum',
      accessorFn: row => `${row.docNum}-${row.docEntry}`,
      header: 'Nº Documento',
      cell: ({ row, getValue }) => {
        const isExpanded = selectedOrderEntry === row.original.docEntry;
        return (
          <div>
            <div className={`font-bold font-mono ${isExpanded ? 'text-blue-800' : 'text-slate-700'}`}>
              {row.original.docNum}
              {row.original.sheetRef && <span className="text-[9px] font-mono font-normal text-slate-400 ml-1">({row.original.sheetRef})</span>}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">DocEntry: {row.original.docEntry}</div>
          </div>
        );
      },
      meta: { className: "w-28" }
    },
    {
      accessorKey: 'docDate',
      header: 'F. Documento',
      cell: ({ getValue }) => <div className="text-[11px] whitespace-nowrap tabular-nums text-slate-500 font-mono">{formatDate(getValue() as string)}</div>,
      meta: { className: "w-28" }
    },
    {
      id: 'cardCode',
      accessorFn: (row) => `${row.cardCode} ${row.cardName}`,
      header: 'Cliente / SN',
      cell: ({ row }) => (
        <div>
          <div className="text-[10px] text-slate-500 tabular-nums">{row.original.cardCode}</div>
          <div className="font-medium text-slate-900 truncate max-w-[150px]" title={row.original.cardName}>{row.original.cardName}</div>
        </div>
      ),
      meta: { className: "w-48" }
    },
    {
      id: 'projectCeco',
      header: 'Proyecto / CeCo',
      cell: ({ row }) => {
        const o = row.original;
        const lineProj = o.documentLines.find(l => l.project && l.project.trim() !== '')?.project;
        const firstLineCeco = o.documentLines[0]?.costCenter;
        
        const finalProject = o.project || lineProj;
        
        return (
          <div>
            {finalProject ? (
              <div className="text-[11px] text-blue-700 truncate max-w-[120px] font-bold" title={finalProject}>{finalProject}</div>
            ) : (
              <div className="text-[11px] text-slate-400 font-normal italic">- Sin Proyecto -</div>
            )}
            <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={firstLineCeco || "Sin CeCo"}>
              CeCo: {firstLineCeco || "-"}
            </div>
          </div>
        );
      },
      meta: { className: "w-32" }
    },
    {
      accessorKey: 'comments',
      header: 'Comentarios',
      cell: ({ getValue }) => <div className="text-[11px] text-slate-500 truncate max-w-[160px] italic" title={getValue() as string}>{getValue() as string || "-"}</div>,
      meta: { className: "w-40" }
    },
    {
      accessorKey: 'currency',
      header: () => <div className="text-center w-full">Divisa</div>,
      cell: ({ getValue }) => <div className="text-[11px] text-center font-bold text-slate-500">{getValue() as string}</div>,
      meta: { className: "w-16" }
    },
    {
      accessorKey: 'totalNet',
      header: () => <div className="text-right w-full">Total Neto</div>,
      cell: ({ getValue }) => <div className="text-right font-mono font-bold text-slate-700 tabular-nums tracking-tight">{formatCurrency(getValue() as number)}</div>,
      meta: { className: "w-28 text-right" }
    },
    {
      id: 'avanceFacturacion',
      header: () => <div className="text-right w-full">Facturado / Saldo</div>,
      cell: ({ row }) => {
        const o = row.original;
        
        const sumOrderGrossDocCur = o.documentLines.reduce((acc, line) => {
           let lTotal = line.price * line.quantity;
           if (line.taxCode === 'IVA' || line.taxCode === 'IVA_19' || !line.taxCode) {
              lTotal *= 1.19;
           }
           return acc + lTotal;
        }, 0);
        const impliedDocRate = (o.currency === 'UF' && sumOrderGrossDocCur > 0 && o.totalNet > sumOrderGrossDocCur * 2) 
            ? (o.totalNet / sumOrderGrossDocCur) 
            : 1;

        const totalInvoiced = invoices.reduce((acc, inv) => {
          if (inv.isCancelled || inv.documentStatus === 'bost_Cancel') return acc;
          const matchingLines = inv.documentLines.filter(l => l.baseEntry === o.docEntry);
          return acc + matchingLines.reduce((sum, l) => {
            let lineTotalGross = l.lineTotal;
            const validRate = Math.max(inv.docRate || 0, o.docRate || 0, impliedDocRate);
            
            if (lineTotalGross !== undefined) {
               if (inv.currency === 'UF' || l.currency === 'UF') {
                  if (lineTotalGross < 500000) {
                     lineTotalGross = lineTotalGross * validRate;
                  }
               }
            } else {
               lineTotalGross = l.price * l.quantity;
               const isUF = o.currency === 'UF' || l.currency === 'UF' || inv.currency === 'UF';
               
               if (l.taxCode === 'IVA' || l.taxCode === 'IVA_19' || !l.taxCode) {
                 lineTotalGross = lineTotalGross * 1.19;
               }

               if (isUF && lineTotalGross < 500000) {
                 lineTotalGross = lineTotalGross * validRate;
               }
            }
            return sum + lineTotalGross;
          }, 0);
        }, 0);
        
        const saldo = o.totalNet - totalInvoiced;
        const pct = o.totalNet > 0 ? Math.min(100, Math.round((totalInvoiced / o.totalNet) * 100)) : 0;
        const isComplete = pct >= 100;

        return (
          <div className="flex flex-col items-end gap-1 w-full" title={`Facturado: ${formatCurrency(totalInvoiced)} | Saldo: ${formatCurrency(saldo)}`}>
             <div className="text-[10px] font-mono tabular-nums tracking-tight">
               <span className={isComplete ? "text-emerald-600 font-bold" : "text-slate-500"}>{formatCurrency(totalInvoiced)}</span>
               <span className="text-slate-300 mx-1">/</span>
               <span className={isComplete ? "text-slate-400 line-through" : "text-red-600 font-medium"}>{formatCurrency(saldo)}</span>
             </div>
             <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}></div>
             </div>
          </div>
        );
      },
      meta: { className: "w-36 text-right" }
    },
    {
      accessorKey: 'sheetStatus',
      header: () => <div className="text-center w-full">Estado</div>,
      cell: ({ row }) => {
        const o = row.original;
        const isClosed = o.documentStatus === 'bost_Close' || o.documentStatus === 'bost_Cancel' || o.isCancelled;
        return (
          <div className="flex justify-center">
             {isClosed ? <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Cerrado</span> : formatSheetStatus(o.sheetStatus)}
          </div>
        );
      },
      meta: { className: "w-24 text-center" }
    },
    {
      id: 'actions',
      header: () => <div className="flex justify-center"><MoreVertical className="w-4 h-4 text-blue-200" /></div>,
      cell: ({ row }) => {
        const o = row.original;
        const isClosed = o.documentStatus === 'bost_Close' || o.documentStatus === 'bost_Cancel' || o.isCancelled;
        
        if (isClosed) return null;

        return (
          <div className="relative text-center" onClick={(e) => e.stopPropagation()}>
            <button 
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveMenu({
                  docEntry: o.docEntry,
                  x: Math.min(rect.right - 144, window.innerWidth - 150),
                  y: rect.bottom + 4
                });
              }}
              disabled={isProcessingBatch}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        );
      },
      enableSorting: false,
      meta: { className: "w-12 text-center" }
    }
  ], [batchSelectedOrders, isProcessingBatch, selectedOrderEntry, invoices]);

  const handleInvoice = () => {
    if (selectedOrderEntry) {
      const order = data.find(o => o.docEntry === selectedOrderEntry);
      if (order) {
        setConfirmConfig({
          isOpen: true,
          title: 'Confirmar Facturación Parcial',
          actionType: 'invoice',
          data: {
            docNum: order.docNum,
            clientName: order.cardName,
            project: order.project,
            itemCount: selectedSublines.length
          },
          onConfirm: (comment) => {
            generateInvoice();
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            if (comment) {
              sendFacturacionEmail(
                order.docNum,
                order.project || "Sin Proyecto",
                order.totalNet,
                order.cardName,
                comment,
                false
              );
            }
          }
        });
      }
    }
  };

  const renderSubComponent = ({ row }: { row: SalesOrder }) => {
    const o = row;
    return (
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="flex gap-4 items-start w-full">
          <div className="w-full">
            <table className="w-full text-xs text-left table-fixed border-collapse">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-16 text-center border-r border-slate-200 border-l">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={o.documentLines.filter(l => l.lineStatus === 'bost_Open').length === selectedSublines.length && selectedSublines.length > 0}
                      onChange={(e) => toggleAllSublines(e.target.checked)}
                    />
                  </th>
                  <th className="py-2 px-3 w-24 text-center border-r border-slate-200 font-bold">LN.</th>
                  <th className="py-2 px-3 w-20 border-r border-slate-200">CÓDIGO</th>
                  <th className="py-2 px-3 w-32 border-r border-slate-200">DESCRIPCIÓN</th>
                  <th className="py-2 px-3 w-28 text-center border-r border-slate-200">STATUS</th>
                  <th className="py-2 px-3 w-24 border-r border-slate-200">PROYECTO</th>
                  <th className="py-2 px-3 w-[100px] border-r border-slate-200">C. COSTO</th>
                  <th className="py-2 px-3 w-12 text-right border-r border-slate-200">CANT.</th>
                  <th className="py-2 px-3 w-12 text-right border-r border-slate-200">FACT.</th>
                  <th className="py-2 px-3 w-12 text-right border-r border-slate-200">SALDO</th>
                  <th className="py-2 px-3 w-28 text-right border-r border-slate-200">PRECIO UN.</th>
                  <th className="py-2 px-3 w-12 text-center border-r border-slate-200">
                     <button 
                       onClick={handleInvoice}
                       disabled={!jsonPayload}
                       className="text-[10px] text-blue-600 font-bold disabled:opacity-50"
                       title="Facturar en SAP"
                     >
                       Facturar
                     </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {o.documentLines.map((line, index) => {
                  const invoicedQty = invoices.reduce((acc, inv) => {
                    if (inv.isCancelled || inv.documentStatus === 'bost_Cancel') return acc;
                    const matchingLine = inv.documentLines.find(l => l.baseEntry === o.docEntry && l.baseLine === line.lineNum);
                    return acc + (matchingLine?.quantity || 0);
                  }, 0);
                  const pendingQty = line.quantity - invoicedQty;
                  const isLineComplete = pendingQty <= 0;

                  const isChecked = selectedSublines.includes(line.lineNum);
                  const isOpen = line.lineStatus === 'bost_Open';
                  const isAnomaly = o.sheetStatus === 'anomaly';
                  
                  const isLineLocked = !isOpen || isAnomaly || o.sheetStatus === 'pending' || o.sheetStatus === 'pending_te4' || isLineComplete || (
                    o.sheetStatus === 'ready_anticipo' && line.lineNum !== 0
                  ) || (
                    o.sheetStatus === 'ready_cierre' && line.lineNum !== 1
                  ) || (
                    o.sheetStatus === 'ready_100' && line.lineNum !== 0
                  );

                  return (
                    <motion.tr 
                      key={line.lineNum} 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 30, 
                        mass: 0.8,
                        delay: index * 0.03 
                      }}
                      className={`transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'} ${isLineLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
                      onClick={() => !isLineLocked && toggleSubline(line.lineNum)}
                    >
                      <td className="py-1.5 px-3 w-16 text-center border-r border-slate-200 border-l" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                          checked={isChecked}
                          onChange={() => !isLineLocked && toggleSubline(line.lineNum)}
                          disabled={isLineLocked}
                        />
                      </td>
                      <td className="py-1.5 px-3 w-24 text-center text-slate-400 font-mono border-r border-slate-200">{line.lineNum}</td>
                      <td className="py-1.5 px-3 w-20 font-medium text-slate-700 truncate border-r border-slate-200" title={line.itemCode}>{line.itemCode}</td>
                      <td className="py-1.5 px-3 w-32 truncate border-r border-slate-200" title={line.dscription}>{line.dscription}</td>
                      <td className="py-1.5 px-3 w-28 text-center border-r border-slate-200">
                        {isOpen 
                          ? <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">Abierto</span>
                          : <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Cerrado</span>
                        }
                      </td>
                      <td className="py-1.5 px-3 w-24 text-slate-500 truncate border-r border-slate-200" title={line.project}>{line.project || "-"}</td>
                      <td className="py-1.5 px-3 w-[100px] text-slate-500 truncate border-r border-slate-200" title={line.costCenter}>{line.costCenter || "-"}</td>
                      <td className="py-1.5 px-3 w-12 text-right font-semibold text-slate-600 border-r border-slate-200 tabular-nums">{line.quantity}</td>
                      <td className="py-1.5 px-3 w-12 text-right font-semibold text-emerald-600 border-r border-slate-200 tabular-nums">{invoicedQty}</td>
                      <td className={`py-1.5 px-3 w-12 text-right font-bold border-r border-slate-200 tabular-nums ${isLineComplete ? 'text-slate-300 line-through' : 'text-red-500'}`}>{pendingQty}</td>
                      <td className="py-1.5 px-3 w-28 text-right font-mono text-slate-600 border-r border-slate-200 tabular-nums">{formatCurrency(line.price)} {o.currency && o.currency !== 'CLP' ? `(${o.currency})` : ''}</td>
                      <td className="py-1.5 px-3 w-12 text-center border-r border-slate-200">
                        <button 
                          onClick={() => setIsSimulating(!isSimulating)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded"
                          title="Simular JSON"
                        >
                          {isSimulating ? 'Ocultar' : 'Ver JSON'}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {isSimulating && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-[40%] bg-slate-900 border border-slate-800 rounded-lg text-slate-300 p-4 font-mono text-[10px] overflow-auto shadow-inner h-[400px]"
            >
              <p className="text-slate-500 mb-3 font-sans font-bold uppercase tracking-widest text-[9px] border-b border-slate-800 pb-2">Preview: oInvoices Payload</p>
              {jsonPayload ? (
                <pre className="whitespace-pre-wrap leading-relaxed text-blue-300">
                  {JSON.stringify(jsonPayload, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-20 text-slate-600 italic font-sans text-xs">
                  Selecciona una línea para generar Payload
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const getRowClassName = (o: SalesOrder) => {
    const isClosed = o.documentStatus === 'bost_Close' || o.documentStatus === 'bost_Cancel' || o.isCancelled;
    if (isClosed) return 'opacity-50 grayscale bg-slate-50/50 hover:bg-slate-100/50';
    if (o.sheetStatus === 'anomaly') return 'bg-red-50/50 hover:bg-red-50 opacity-80';
    return '';
  };

  const getRowCanExpand = (row: any) => selectedOrderEntry === row.original.docEntry;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white relative">
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar en la tabla (Doc, RUT, etc)..." 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={(columnFilters.find(f => f.id === 'sheetStatus')?.value as string) || ''}
              onChange={(e) => {
                const val = e.target.value;
                setColumnFilters(prev => {
                  const others = prev.filter(f => f.id !== 'sheetStatus');
                  return val ? [...others, { id: 'sheetStatus', value: val }] : others;
                });
              }}
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-200 text-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="ready_anticipo">Anticipo</option>
              <option value="ready_cierre">Cierre</option>
              <option value="ready_100">100% Excep.</option>
              <option value="anomaly">Bloqueado</option>
              <option value="pending">Pend. Op.</option>
              <option value="pending_te4">Pend. TE4</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-medium px-2 bg-slate-200/50 rounded-full py-1">
          {data.length} registros cargados
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          columnFilters={columnFilters}
          getRowId={(row) => row.docEntry.toString()}
          renderSubComponent={renderSubComponent}
          getRowCanExpand={getRowCanExpand}
          getRowClassName={getRowClassName}
          expanded={selectedOrderEntry ? { [selectedOrderEntry]: true } : {}}
          onRowClick={(row) => {
            if (row.sheetStatus !== 'anomaly') {
              selectOrder(selectedOrderEntry === row.docEntry ? null : row.docEntry);
            }
          }}
          onRowContextMenu={(e, row) => {
            e.preventDefault();
            if (row.sheetStatus !== 'anomaly') {
              setActiveMenu({
                docEntry: row.docEntry,
                x: Math.min(e.clientX, window.innerWidth - 150),
                y: Math.min(e.clientY, window.innerHeight - 150)
              });
            }
          }}
        />
      </div>

      <AnimatePresence>
        {activeMenu && (() => {
          const o = data.find(order => order.docEntry === activeMenu.docEntry);
          if (!o) return null;
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -5 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed bg-white shadow-xl border border-slate-200 rounded-sm py-1 z-[100] w-36 flex flex-col items-stretch overflow-hidden origin-top-left text-left"
              style={{ top: activeMenu.y, left: activeMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="px-4 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 text-left transition-colors"
                onClick={() => { 
                  setActiveMenu(null); 
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Confirmar Facturación Total',
                    actionType: 'invoice',
                    data: {
                      docNum: o.docNum,
                      clientName: o.cardName,
                      project: o.project,
                      totalAmount: o.totalNet,
                      itemCount: o.documentLines.length
                    },
                    onConfirm: (comment) => {
                      invoiceFullOrder(o.docEntry);
                      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                      if (comment) {
                        sendFacturacionEmail(
                          o.docNum,
                          o.project || "Sin Proyecto",
                          o.totalNet,
                          o.cardName,
                          comment,
                          false
                        );
                      }
                    }
                  });
                }}
              >
                Facturar Orden
              </button>
              <button 
                className="px-4 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 text-left transition-colors"
                onClick={() => { setActiveMenu(null); onEditOrder(o.docEntry); }}
              >
                Modificar Orden
              </button>
              <div className="h-px bg-slate-100 my-1 cursor-default"></div>
              <button 
                className="px-4 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 text-left transition-colors"
                onClick={() => { 
                  setActiveMenu(null); 
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Confirmar Cierre de Orden en SAP',
                    actionType: 'close',
                    data: {
                      docNum: o.docNum,
                      clientName: o.cardName,
                      project: o.project
                    },
                    onConfirm: () => {
                      closeOrder(o.docEntry);
                      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
              >
                Cerrar Orden
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <ConfirmationModal 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
        isLoading={isProcessingBatch} 
      />
    </div>
  );
}
