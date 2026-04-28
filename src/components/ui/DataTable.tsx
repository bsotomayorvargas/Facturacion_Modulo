import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  getExpandedRowModel,
  ExpandedState,
  RowSelectionState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  renderSubComponent?: (props: { row: any }) => React.ReactNode;
  rowSelection?: RowSelectionState;
  setRowSelection?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  getRowCanExpand?: (row: any) => boolean;
  onRowClick?: (row: any) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  getRowClassName?: (row: any) => string;
  expanded?: ExpandedState;
  onExpandedChange?: React.Dispatch<React.SetStateAction<ExpandedState>>;
  globalFilter?: string;
  columnFilters?: ColumnFiltersState;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  renderSubComponent,
  rowSelection,
  setRowSelection,
  getRowCanExpand,
  onRowClick,
  isLoading,
  emptyMessage = "No hay resultados.",
  getRowClassName,
  expanded,
  onExpandedChange,
  globalFilter,
  columnFilters
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});

  const resolvedExpanded = expanded !== undefined ? expanded : internalExpanded;
  const resolvedOnExpandedChange = onExpandedChange || setInternalExpanded;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      expanded: resolvedExpanded,
      rowSelection: rowSelection || {},
      globalFilter,
      columnFilters,
    },
    getRowId,
    onSortingChange: setSorting,
    onExpandedChange: resolvedOnExpandedChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: getRowCanExpand,
  });

  return (
    <div className="w-full relative min-h-0 flex-1 flex flex-col bg-white">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
           <div className="text-slate-500 font-medium text-sm flex gap-2 items-center">
             <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
             Cargando...
           </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          <thead className="sticky top-0 shadow-sm z-10 bg-[#002870] text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[#001f5c]">
                {headerGroup.headers.map((header) => {
                  const meta: any = header.column.columnDef.meta;
                  const customThClass = meta?.className || '';
                  
                  return (
                    <th key={header.id} className={`p-3 font-semibold border-r border-blue-800/50 last:border-r-0 select-none ${customThClass}`}>
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer hover:text-blue-200 flex items-center gap-1 group'
                              : 'flex items-center gap-1',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ArrowUp className="w-3 h-3 text-white ml-1" />,
                            desc: <ArrowDown className="w-3 h-3 text-white ml-1" />,
                          }[header.column.getIsSorted() as string] ?? (
                            header.column.getCanSort() ? <ArrowUp className="w-3 h-3 text-transparent group-hover:text-blue-400 ml-1 transition-colors" /> : null
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => {
                const customClass = getRowClassName ? getRowClassName(row.original) : '';
                return (
                  <React.Fragment key={row.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => onRowClick?.(row.original)}
                      className={`transition-colors group hover:bg-slate-50/80 ${row.getIsExpanded() ? 'bg-blue-50/30' : ''} ${customClass} ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta: any = cell.column.columnDef.meta;
                        const customTdClass = meta?.className || '';
                        
                        return (
                          <td key={cell.id} className={`p-3 border-r border-slate-200 last:border-r-0 ${customTdClass}`}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </motion.tr>
                    
                    <AnimatePresence>
                      {row.getIsExpanded() && renderSubComponent && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-slate-50 border-b border-slate-200 overflow-hidden"
                        >
                          <td colSpan={row.getVisibleCells().length} className="p-0 border-0">
                            <div className="overflow-hidden">
                              {renderSubComponent({ row: row.original })}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
