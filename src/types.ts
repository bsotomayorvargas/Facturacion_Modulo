export interface Session {
  companyDb: string;
  user: string;
  token: string | null;
  isConnected: boolean;
  bplid: string | null; // e.g. "1" for Santiago
}

export interface MasterData {
  bplids: Array<{ id: string; name: string }>;
  isSyncing: boolean;
  lastSync: string | null;
}

export interface Filters {
  bplid: string;
  rut: string;
  project: string;
  cc: string; // OcrCode5
  dateFrom: string; // Add date filtering YYYY-MM-DD
  dateTo: string;
  searchQuery: string;
  daysToDue?: number | ''; // Nuevo filtro para facturas de compras
}

// Representing the flat fact table subline architecture
export interface Subline {
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  price: number;
  lineTotal?: number; // Added to get SAP's exact calculated total for the line
  discountPercent: number;
  taxCode: string;
  project: string; // ProjectCode from SAP
  costCenter: string; // CostingCode5 from SAP
  currency: string; // Currency
  rate?: number; // Line Rate
  lineStatus: string; // "bost_Open" or "bost_Close"
  baseType?: number;
  baseEntry?: number;
  baseLine?: number;
  baseRef?: string;
}

export type SheetStatus = 'ready_anticipo' | 'ready_cierre' | 'ready_100' | 'anomaly' | 'pending' | 'pending_te4';

export interface SheetAnomaly {
  docNum: number;
  docEntry: number;
  reason: string;
  sheetRef: string;
}

// Representing the aggregated/grouped Header for rendering
export interface SalesOrder {
  docEntry: number;
  docNum: number;
  cardCode: string;
  cardName: string; // Keep cardName falling back to code if not provided
  docDate: string;
  docDueDate: string;
  bplid: string; // Associated branch ID derived from BPLName
  currency: string; // CLP, UF
  docRate?: number;
  documentLines: Subline[];
  // Derived or summary data for grid
  totalNet: number;
  isCancelled: boolean;
  documentStatus: string; // e.g. "bost_Open", "bost_Close", "bost_Cancel"
  comments?: string; // SBO order comments
  reference?: string; // Reference1
  project?: string; // Project
  
  // Sheet Integration Fields
  sheetStatus?: SheetStatus;
  fechaGanado?: string;
  fechaTE4?: string;
  sheetRef?: string;
}

// Payload target for OData v2
export interface ODataV2InvoicePayload {
  BPL_IDAssignedToInvoice: number; // Maps to user's BPLId
  DocType: string;                 // "dDocument_Items" (I)
  HandWritten: string;             // "tNO" (N)
  DocDate: string;
  DocDueDate: string;
  TaxDate: string;
  DocCurrency: string;             // User's DocCur
  CardCode: string;
  Comments: string;
  JournalMemo?: string;
  Indicator: string;               // "33"
  U_Orden_Venta: string;           // Custom field addition
  DocumentLines: Array<{
    BaseType: number;              // 17 (Sales Order indicator for mapping)
    BaseEntry: number;             // Mapping source OV
    BaseLine: number;              // User's LineNum
    ItemCode: string;
    Quantity: number;              // User's NumPerMsr
    ProjectCode: string;           // User's Project
    TaxCode: string;               // "IVA"
    CostingCode5: string;          // User's OcrCode5
    U_Orden_Venta: string;         // Custom field addition
  }>;
}

export interface SLBusinessPlace {
  BPLID: number;
  BPLName: string;
  Disabled: "tYES" | "tNO";
  // Ignoring other fields as requested
}

export interface SLBusinessPlacesResponse {
  value: SLBusinessPlace[];
}

// Representing the aggregated/grouped Header for Invoice
export interface Invoice {
  docEntry: number;
  docNum: number;
  folioNum?: number;
  cardCode: string;
  cardName: string;
  docDate: string;
  docDueDate: string;
  bplid: string;
  currency: string;
  docRate?: number;
  documentLines: Subline[];
  totalNet: number;
  isCancelled: boolean;
  documentStatus: string;
  comments?: string;
  reference?: string;
  project?: string;
  siiStatus: string; // Maps to U_EXX_FE_DESERR
  indicator: string; // Document Indicator e.g. "33"
  u_Orden_Venta?: string; // U_Orden_Venta UDF
}

// Payload target for Credit Notes
export interface CreditNotePayload {
  DocType: string;
  DocDate: string;
  DocDueDate: string;
  TaxDate: string;
  DocCurrency: string;
  CardCode: string;
  Comments: string;
  Indicator: string;
  BPL_IDAssignedToInvoice: number;
  U_EXX_FE_TpoRef: number;
  U_EXX_FE_Folio: string;
  U_EXX_FE_Fecha: string;
  U_EXX_FE_CodRef: number;
  DocumentLines: Array<{
    BaseType: number;      // 13 for Invoice
    BaseEntry: number;     // Mapping source Invoice DocEntry
    BaseLine: number;      // Invoice LineNum
    Quantity: number;
  }>;
}

// Representing the aggregated/grouped Header for Purchase Invoices (Proveedores)
export interface PurchaseInvoice {
  docEntry: number;
  docNum: number;
  cardCode: string;
  cardName: string;
  docDate: string;
  docDueDate: string;
  bplid: string;
  currency: string;
  docTotal: number;
  paidToDate: number; // For knowing if there's an open balance
  documentStatus: string;
  project?: string;
  reference?: string;
}

// Payload for Outgoing Payments (Pagos Efectuados a Proveedores)
export interface VendorPaymentPayload {
  DocType: "rSupplier";
  HandWritten: "tNO";
  DocDate: string;
  CardCode: string;
  BPLID: number;
  TransferAccount: string; // The GL Account / Bank Account code to pay from
  TransferSum: number;
  TransferDate: string;
  Reference1: string;
  JournalRemarks?: string;
  PaymentInvoices: Array<{
    DocEntry: number; // DocEntry of the Purchase Invoice
    SumApplied: number;
    InvoiceType: "it_PurchaseInvoice";
  }>;
}

