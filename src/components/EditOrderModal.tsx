import React, { useState, useEffect, useCallback } from 'react';
import { SalesOrder, Subline } from '../types';
import { useStore } from '../store';
import { X, Plus, AlertCircle, Save } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EditOrderModalProps {
  orderEntry: number;
  onClose: () => void;
}

export function EditOrderModal({ orderEntry, onClose }: EditOrderModalProps) {
  const { orders, updateSalesOrder } = useStore();
  const order = orders.find(o => o.docEntry === orderEntry);
  
  const [comments, setComments] = useState('');
  const [reference, setReference] = useState('');
  const [headerProject, setHeaderProject] = useState('');
  const [lines, setLines] = useState<(Subline & { isNew?: boolean, _id?: string })[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (order) {
      setComments(order.comments || '');
      setReference(order.reference || '');
      setHeaderProject(order.project || '');
      setLines(order.documentLines.map(l => ({ ...l })));
    }
  }, [order]);

  const checkIsDirty = useCallback(() => {
    if (!order) return false;
    if (comments !== (order.comments || '')) return true;
    if (reference !== (order.reference || '')) return true;
    if (headerProject !== (order.project || '')) return true;
    
    const hasLineChanges = lines.some((l) => {
      if (l.isNew) return true;
      const originalLine = order.documentLines.find(ol => ol.lineNum === l.lineNum);
      if (!originalLine) return true;
      
      return l.quantity !== originalLine.quantity || 
             l.price !== originalLine.price || 
             l.currency !== originalLine.currency ||
             l.itemCode !== originalLine.itemCode ||
             l.dscription !== originalLine.dscription;
    });
    
    return hasLineChanges;
  }, [order, comments, reference, headerProject, lines]);

  const handleCloseAttempt = useCallback(() => {
    if (isSaving) return;
    if (checkIsDirty()) {
      setShowWarning(true);
    } else {
      onClose();
    }
  }, [checkIsDirty, onClose, isSaving]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showWarning) {
          setShowWarning(false);
        } else {
          handleCloseAttempt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseAttempt, showWarning]);

  if (!order) return null;

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handlePriceChange = (index: number, valStr: string) => {
    const newLines = [...lines];
    const line = { ...newLines[index] } as any;
    newLines[index] = line;
    
    line.rawPriceInput = valStr;
    
    let parsedCurr = undefined;
    let parsedVal = valStr;

    // Check for format "UF 109" or "USD 100"
    const prefixMatch = valStr.trim().match(/^([A-Za-z]+)\s+([\d.,]+)$/);
    if (prefixMatch) {
      parsedCurr = prefixMatch[1].toUpperCase();
      parsedVal = prefixMatch[2];
    } else {
      // Check for format "109 UF" or "100 USD"
      const suffixMatch = valStr.trim().match(/^([\d.,]+)\s+([A-Za-z]+)$/);
      if (suffixMatch) {
        parsedVal = suffixMatch[1];
        parsedCurr = suffixMatch[2].toUpperCase();
      }
    }

    if (parsedCurr) {
      let val = parsedVal.replace(',', '.').replace(/[^\d.]/g, ''); 
      line.price = parseFloat(val) || 0;
      line.currency = parsedCurr;
    } else {
      let normalized = valStr.replace(',', '.');
      const num = parseFloat(normalized);
      line.price = isNaN(num) ? valStr : num;
    }
    
    setLines(newLines);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        lineNum: -1, // placeholder
        itemCode: '',
        dscription: 'Nuevo Producto',
        quantity: 1,
        price: 0,
        discountPercent: 0,
        taxCode: 'IVA',
        project: lines[0]?.project || '',
        costCenter: lines[0]?.costCenter || '',
        currency: order.currency,
        lineStatus: 'bost_Open',
        isNew: true,
        _id: Math.random().toString(36).substring(7)
      }
    ]);
  };
  
  const handleRemoveNewLine = (index: number) => {
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const updatedLines = lines.filter(l => {
      if (l.isNew || l.lineStatus !== 'bost_Open') return false;
      const originalLine = order.documentLines.find(ol => ol.lineNum === l.lineNum);
      if (!originalLine) return false;
      
      const isChanged = l.quantity !== originalLine.quantity || 
                        l.price !== originalLine.price || 
                        l.currency !== originalLine.currency ||
                        l.itemCode !== originalLine.itemCode ||
                        l.dscription !== originalLine.dscription;
                        
      return isChanged;
    });
       
    const newLines = lines.filter(l => l.isNew && l.itemCode.trim() !== '');

    const updates: any = {};
    if (comments !== order.comments) updates.comments = comments;
    if (reference !== order.reference) updates.reference = reference;
    if (headerProject !== order.project) updates.project = headerProject;
    if (updatedLines.length > 0) updates.updatedLines = updatedLines;
    if (newLines.length > 0) updates.newLines = newLines;

    console.log("Submitting updates:", updates);

    if (Object.keys(updates).length > 0) {
      await updateSalesOrder(orderEntry, updates);
    }
    
    setIsSaving(false);
    onClose();
  };

  // Detect if lines use a foreign currency (like UF) while header is in local currency (CLP)
  const firstLine = order.documentLines[0];
  const useLineCurrency = firstLine && firstLine.currency !== order.currency && firstLine.currency !== 'CLP';
  
  const displayCurrency = useLineCurrency ? firstLine.currency : order.currency;
  const displayRate = useLineCurrency && firstLine.rate ? firstLine.rate : order.docRate;
  
  const docRateDisplay = displayRate ? (displayCurrency === 'UF' ? formatCurrency(displayRate) : formatCurrency(displayRate)) : "N/A";
  
  // Calculate total in UF if it's UF-based
  let finalAmountDisplay = '';
  if (useLineCurrency && displayRate) {
     const totalInForeign = order.totalNet / displayRate;
     finalAmountDisplay = `${totalInForeign.toFixed(2)} ${displayCurrency} (Equiv: ${formatCurrency(order.totalNet)})`;
  } else {
     finalAmountDisplay = formatCurrency(order.totalNet);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 relative"
      >
        <AnimatePresence>
          {isSaving && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2"
              >
                <Save className="w-5 h-5 text-blue-700" />
                <p className="text-blue-800 font-bold tracking-widest text-sm uppercase">Guardando Cambios</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWarning && !isSaving && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
             >
               <motion.div 
                 initial={{ scale: 0.9, y: 10, opacity: 0 }}
                 animate={{ scale: 1, y: 0, opacity: 1 }}
                 exit={{ scale: 0.9, y: 10, opacity: 0 }}
                 transition={{ type: "spring", stiffness: 400, damping: 25 }}
                 className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full border border-slate-200"
               >
                 <div className="flex items-center gap-3 mb-3 text-amber-600">
                   <AlertCircle className="w-6 h-6" />
                   <h3 className="text-lg font-bold">Modificaciones no guardadas</h3>
                 </div>
                 <p className="text-slate-600 mb-6 text-sm">
                   Hay modificaciones en la orden que no han sido guardadas. ¿Deseas guardarlas antes de salir?
                 </p>
                 <div className="flex justify-end gap-2">
                   <button 
                     onClick={onClose}
                     className="px-4 py-2 rounded text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                   >
                     No Guardar
                   </button>
                   <div className="flex-1"></div>
                   <button 
                     onClick={() => setShowWarning(false)}
                     className="px-4 py-2 rounded text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={() => { setShowWarning(false); handleSave(); }}
                     className="px-4 py-2 rounded text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 transition-colors shadow-sm"
                   >
                     Guardar Cambios
                   </button>
                 </div>
               </motion.div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">OV {order.docNum}</h2>
            <p className="text-xs text-slate-500 font-medium">{order.cardName} • {formatDate(order.docDate)}</p>
          </div>
          <button onClick={handleCloseAttempt} className="p-2 text-slate-400 hover:text-slate-600 rounded drop-shadow-sm hover:bg-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-white">
          
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Referencia</label>
                 <input 
                   type="text"
                   className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                   placeholder="Referencia"
                   value={reference}
                   onChange={e => setReference(e.target.value)}
                 />
              </div>
              <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Proyecto Cabecera</label>
                 <input 
                   type="text"
                   className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                   placeholder="Proyecto"
                   value={headerProject}
                   onChange={e => setHeaderProject(e.target.value)}
                 />
              </div>
              <div className="col-span-3">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Comentarios</label>
                 <textarea 
                   className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24 shadow-inner"
                   value={comments}
                   onChange={e => setComments(e.target.value)}
                 />
              </div>
            </div>
            
            <div className="col-span-1 border border-slate-100 bg-slate-50/80 rounded-md p-5 space-y-4 shadow-inner">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Divisa Documento</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-slate-700">{displayCurrency}</span>
                  {useLineCurrency && <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-sm border border-blue-200">Líneas</span>}
                </div>
              </div>
              <div className="h-px bg-slate-200/60"></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Valorización del Día</p>
                <p className="font-mono font-medium text-slate-800 tabular-nums">{docRateDisplay}</p>
              </div>
              <div className="h-px bg-slate-200/60"></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Monto Final</p>
                <p className="font-mono text-xl font-bold text-blue-800 tabular-nums tracking-tight">
                   {finalAmountDisplay}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Líneas del Documento
              </h3>
              <button 
                onClick={handleAddLine}
                className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors border border-blue-200/50 shadow-sm"
               >
                <Plus className="w-3.5 h-3.5" />
                Agregar Línea
              </button>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden relative">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3 w-12 text-center">Nº</th>
                    <th className="p-3">ItemCode</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3 text-right">Cant.</th>
                    <th className="p-3 text-right">Precio Unitario</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                  {lines.map((line, idx) => {
                    const isClosed = line.lineStatus === 'bost_Close' && !line.isNew;
                    return (
                      <motion.tr 
                        key={line._id ? line._id : line.lineNum} 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, scale: 0.9 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 30, 
                          mass: 0.8,
                          delay: idx * 0.03 
                        }}
                        className={isClosed ? "bg-slate-50/50" : ""}
                      >
                        <td className="p-3 text-center font-mono text-xs text-slate-400">
                          {line.isNew ? '*' : line.lineNum + 1}
                        </td>
                        <td className="p-3">
                           {line.isNew ? (
                             <input 
                               value={line.itemCode} 
                               onChange={e => handleLineChange(idx, 'itemCode', e.target.value.toUpperCase())}
                               placeholder="Ej: VRC-000001"
                               className="w-32 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                             />
                           ) : (
                             <span className="font-mono text-xs">{line.itemCode}</span>
                           )}
                        </td>
                        <td className="p-3">
                           {line.isNew ? (
                             <input 
                               value={line.dscription} 
                               onChange={e => handleLineChange(idx, 'dscription', e.target.value)}
                               className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                             />
                           ) : (
                             <span className="text-xs max-w-[200px] truncate block">{line.dscription}</span>
                           )}
                        </td>
                        <td className="p-3 text-right">
                           {isClosed ? (
                             <span className="font-mono text-xs text-slate-500">{line.quantity}</span>
                           ) : (
                             <input 
                               type="number"
                               value={line.quantity}
                               onChange={e => handleLineChange(idx, 'quantity', parseFloat(e.target.value))}
                               className="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-right"
                             />
                           )}
                        </td>
                        <td className="p-3 text-right">
                           {isClosed ? (
                             <span className="font-mono text-xs text-slate-500">{line.currency !== order.currency ? `${line.currency} ` : ''}{line.price}</span>
                           ) : (
                             <input 
                               type="text"
                               value={(line as any).rawPriceInput !== undefined ? (line as any).rawPriceInput : `${line.currency && line.currency !== order.currency && line.currency !== 'CLP' ? line.currency + ' ' : ''}${line.price}`}
                               onChange={e => handlePriceChange(idx, e.target.value)}
                               placeholder={order.currency}
                               className="w-28 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-right"
                             />
                           )}
                        </td>
                        <td className="p-3 text-center">
                          {line.isNew ? (
                             <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">Nuevo</span>
                          ) : isClosed ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mx-auto w-fit">
                              Cerrado
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">Abierto</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {line.isNew && (
                            <button onClick={() => handleRemoveNewLine(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                  </AnimatePresence>
                </tbody>
              </table>
              {lines.some(l => l.lineStatus === 'bost_Close' && !l.isNew) && (
                <div className="bg-amber-50 p-3 border-t border-amber-100 flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-xs text-amber-800 font-medium">Nota: Las líneas en estado cerrado no pueden ser modificadas ya que tienen facturas o documentos relacionados.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={handleCloseAttempt}
            className="px-4 py-2 rounded-sm text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-sm text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
          </button>
        </div>
        
      </motion.div>
    </motion.div>
  );
}
