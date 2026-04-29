import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useStore } from '../../store';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DataTable } from './DataTable';
import { ArrowRight, MoreVertical, CheckCircle2, AlertTriangle, XCircle, Send, FileQuestion, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LinkOrderModal from '../LinkOrderModal';
import { ConfirmationModal } from '../ConfirmationModal';

interface InvoiceTableProps {
  data: Invoice[];
}

export function InvoiceTable({ data }: InvoiceTableProps) {
  const { generateCreditNote } = useStore();
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [linkingInvoice, setLinkingInvoice] = useState<Invoice | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const columns = useMemo<ColumnDef<Invoice>[]>(() => [
    {
      id: 'docNum',
      accessorFn: row => `${row.docNum}-${row.docEntry}`,
      header: 'Nº Documento',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-700 font-mono">{row.original.docNum}</div>
          <div className="text-[10px] text-slate-400 font-mono">DocEntry: {row.original.docEntry}</div>
        </div>
      ),
      meta: { className: "w-28" }
    },
    {
      accessorKey: 'docDate',
      header: 'F. Documento',
      cell: ({ getValue }) => <div className="text-slate-500 font-mono">{formatDate(getValue() as string)}</div>,
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
        const inv = row.original;
        const lineProj = inv.documentLines.find(l => l.project && l.project.trim() !== '')?.project;
        const firstLineCeco = inv.documentLines?.[0]?.costCenter;
        
        const finalProject = inv.project || lineProj;
        
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
      id: 'u_Orden_Venta',
      header: 'Orden Vinculada',
      cell: ({ row }) => {
        const inv = row.original;
        if (inv.u_Orden_Venta && inv.u_Orden_Venta.trim() !== '') {
           return (
             <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-700" title="Vinculación Manual/Predictiva">
               <LinkIcon className="w-3 h-3" />
               <span className="text-[11px] font-bold tracking-tight uppercase">OV-{inv.u_Orden_Venta}</span>
             </div>
           );
        }
        const baseRefs = [...new Set(inv.documentLines.map(l => l.baseRef).filter(Boolean))];
        if (baseRefs.length > 0) {
           return <div className="text-[11px] text-slate-500 truncate max-w-[100px] tabular-nums font-medium italic" title="Vínculo Nativo SAP">{baseRefs.join(", ")}</div>;
        }
        return (
          <button 
            onClick={() => setLinkingInvoice(inv)}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-blue-600 hover:text-white px-2 py-1 rounded transition-colors"
          >
            <LinkIcon className="w-3 h-3" />
            Vincular OV
          </button>
        );
      },
      meta: { className: "w-32" }
    },
    {
      accessorKey: 'currency',
      header: () => <div className="text-center w-full">Divisa</div>,
      cell: ({ getValue }) => <div className="text-center text-[11px] font-bold text-slate-500">{getValue() as string}</div>,
      meta: { className: "w-16 text-center" }
    },
    {
      accessorKey: 'totalNet',
      header: () => <div className="text-right w-full">Total Neto</div>,
      cell: ({ getValue }) => <div className="text-right font-mono font-bold text-slate-700">{formatCurrency(getValue() as number)}</div>,
      meta: { className: "w-28 text-right" }
    },
    {
      id: 'status',
      header: () => <div className="text-center w-full">Estado</div>,
      cell: ({ row }) => {
        const inv = row.original;
        
        let pLabel = 'Desconocido';
        let pClass = 'bg-slate-100 text-slate-600 border-slate-200';
        if (inv.isCancelled) { pLabel = 'Cancelada/NC'; pClass = 'bg-red-100 text-red-800 border-red-200'; }
        else if (inv.documentStatus === 'bost_Close') { pLabel = 'Cobrado'; pClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'; }
        else if (inv.documentStatus === 'bost_Open') { pLabel = 'Pdte. Cobro'; pClass = 'bg-amber-100 text-amber-800 border-amber-200'; }

        const s = inv.siiStatus?.toLowerCase() || '';
        let sLabel = "No Env."; let sClass = "bg-slate-100 text-slate-600 border-slate-200";
        if (s.includes('aceptado') && !s.includes('reparos')) { sClass = "bg-emerald-100 text-emerald-800 border-emerald-200"; sLabel = "SII: Acep."; }
        else if (s.includes('reparos')) { sClass = "bg-amber-100 text-amber-800 border-amber-200"; sLabel = "SII: Rep."; }
        else if (s.includes('rechazado') || s.includes('error')) { sClass = "bg-red-100 text-red-800 border-red-200"; sLabel = "SII: Rech."; }
        else if (s.includes('enviado') || s.includes('validado')) { sClass = "bg-blue-100 text-blue-800 border-blue-200"; sLabel = "SII: Env."; }

        return (
          <div className="flex flex-col items-center gap-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${pClass}`}>{pLabel}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${sClass}`} title={inv.siiStatus}>{sLabel}</span>
          </div>
        );
      },
      meta: { className: "w-28 text-center" }
    },
    {
      id: 'actions',
      header: () => <div className="text-center w-full">Funciones</div>,
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="relative text-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === inv.docEntry ? null : inv.docEntry);
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors inline-flex"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {activeMenu === inv.docEntry && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-sm shadow-xl z-[999] py-1 text-left"
                  onClick={e => e.stopPropagation()}
                >
                  <button 
                    onClick={() => {
                      setConfirmModal({ isOpen: true, invoice: inv });
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors"
                  >
                    Generar Nota de Crédito
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      },
      enableSorting: false,
      meta: { className: "w-16 text-center" }
    }
  ], [activeMenu]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.docEntry.toString()}
      />
      <LinkOrderModal 
        isOpen={linkingInvoice !== null}
        invoice={linkingInvoice}
        onClose={() => setLinkingInvoice(null)}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => !isProcessing && setConfirmModal({ isOpen: false, invoice: null })}
        onConfirm={async () => {
          if (confirmModal.invoice) {
            setIsProcessing(true);
            await generateCreditNote(confirmModal.invoice.docEntry);
            setIsProcessing(false);
            setConfirmModal({ isOpen: false, invoice: null });
          }
        }}
        title={`Anular Factura Nº ${confirmModal.invoice?.docNum}`}
        actionType="credit-note"
        data={{
          docNum: confirmModal.invoice?.docNum,
          clientName: confirmModal.invoice?.cardName,
          totalAmount: confirmModal.invoice?.totalNet,
          project: confirmModal.invoice?.project,
        }}
        isLoading={isProcessing}
      />
    </>
  );
}
