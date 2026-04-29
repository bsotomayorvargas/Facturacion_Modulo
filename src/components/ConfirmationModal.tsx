import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, FileText, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export type ConfirmationActionType = 'invoice' | 'close' | 'batch-invoice' | 'batch-close' | 'credit-note';

export interface ConfirmationData {
  docNum?: number;
  clientName?: string;
  totalAmount?: number;
  itemCount?: number;
  affectedCount?: number;
  project?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  title: string;
  actionType: ConfirmationActionType;
  data: ConfirmationData;
  isLoading?: boolean;
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  actionType, 
  data,
  isLoading = false 
}: ConfirmationModalProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(comment);
    // Modal will be closed by the parent or when action completes
  };

  const isBatch = actionType === 'batch-invoice' || actionType === 'batch-close';
  const isDestructive = actionType === 'close' || actionType === 'batch-close' || actionType === 'credit-note';
  const isInvoice = actionType === 'invoice' || actionType === 'batch-invoice';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDestructive ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <h3 className={`font-bold text-lg ${
                  isDestructive ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {title}
                </h3>
              </div>
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  Contexto de la Operación en SAP B1
                </h4>
                
                {isBatch ? (
                  <div className="text-sm text-slate-700">
                    <p className="mb-2">Estás a punto de procesar de forma masiva <strong>{data.affectedCount}</strong> órdenes de venta.</p>
                    <p className="font-semibold text-amber-700">Esta acción interactuará directamente con el Service Layer de SAP y procesará los documentos uno a uno.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    {data.docNum && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Nº Documento (OV)</span>
                        <span className="font-bold text-slate-800 font-mono">{data.docNum}</span>
                      </div>
                    )}
                    {data.project && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Proyecto</span>
                        <span className="font-semibold text-blue-700">{data.project}</span>
                      </div>
                    )}
                    {data.clientName && (
                      <div className="col-span-2">
                        <span className="text-slate-400 text-xs block mb-0.5">Cliente</span>
                        <span className="font-medium text-slate-700">{data.clientName}</span>
                      </div>
                    )}
                    {data.totalAmount !== undefined && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Monto Neto a Procesar</span>
                        <span className="font-bold text-slate-800 font-mono tracking-tight">{formatCurrency(data.totalAmount)}</span>
                      </div>
                    )}
                    {data.itemCount !== undefined && (
                      <div>
                        <span className="text-slate-400 text-xs block mb-0.5">Líneas Afectadas</span>
                        <span className="font-medium text-slate-700">{data.itemCount} líneas</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isInvoice && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                    <span>Justificación / Comentarios</span>
                    <span className="text-slate-400 font-normal">Opcional</span>
                  </label>
                  <textarea 
                    className="w-full text-sm border border-slate-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Agrega un comentario sobre esta facturación (Se enviará copia a cdg@fluxsolar.cl)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Estos comentarios respaldarán la emisión del documento.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-5 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDestructive 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20' 
                    : 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20'
                }`}
              >
                {isLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {isDestructive ? (actionType === 'credit-note' ? 'Generar Nota de Crédito' : 'Confirmar Cierre SAP') : 'Confirmar Facturación SAP'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
