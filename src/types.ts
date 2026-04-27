export interface Session {
  url: string;
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
}

// Representing the flat fact table subline architecture
export interface Subline {
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  price: number;
  discountPercent: number;
  taxCode: string;
  project: string; // ProjectCode from SAP
  costCenter: string; // CostingCode5 from SAP
  currency: string; // Currency
  rate?: number; // Line Rate
  lineStatus: string; // "bost_Open" or "bost_Close"
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

// Service Layer BusinessPlaces (Sucursales) Payload
export interface SLBusinessPlace {
  BPLID: number;
  BPLName: string;
  Disabled: "tYES" | "tNO";
  // Ignoring other fields as requested
}

export interface SLBusinessPlacesResponse {
  value: SLBusinessPlace[];
}
