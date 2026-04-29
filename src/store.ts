import { create } from 'zustand';
import { formatDate, parseDateToSAP } from './lib/utils';
import { SalesOrder, Session, Filters, MasterData, ODataV2InvoicePayload, SheetAnomaly, SheetStatus, Subline, Invoice, CreditNotePayload, PurchaseInvoice, VendorPaymentPayload } from './types';

// The requested raw JSON payload for /BusinessPlaces
const RAW_BPL_RESPONSE = {
  "@odata.context": "https://195.201.189.77:50042/b1s/v2/$metadata#BusinessPlaces",
  "value": [
      { "BPLID": 1, "BPLName": "COPEC FLUX SPA", "Disabled": "tNO" },
      { "BPLID": 2, "BPLName": "Principal", "Disabled": "tYES" },
      { "BPLID": 3, "BPLName": "PUELCHE FLUX SPHERA SPA", "Disabled": "tNO" },
      { "BPLID": 4, "BPLName": "PARQUE FULGOR SPA", "Disabled": "tNO" },
      { "BPLID": 5, "BPLName": "EL OLIVAR SOLAR SPA", "Disabled": "tNO" },
      { "BPLID": 6, "BPLName": "FOTOVOLTAICA SANTA ROSARIO SPA", "Disabled": "tNO" },
      { "BPLID": 7, "BPLName": "FOTOVOLTAICA PUEBLO HUNDIDO SPA", "Disabled": "tNO" },
      { "BPLID": 8, "BPLName": "PER PARINACOTA SPA", "Disabled": "tNO" },
      { "BPLID": 9, "BPLName": "LA INDEPENDENCIA SOLAR SPA", "Disabled": "tNO" },
      { "BPLID": 10, "BPLName": "TEDLAR DIEMOS SPA", "Disabled": "tNO" },
      { "BPLID": 11, "BPLName": "TEDLAR MERCURIO SPA", "Disabled": "tNO" },
      { "BPLID": 12, "BPLName": "TEDLAR JUPITER SPA", "Disabled": "tNO" },
      { "BPLID": 13, "BPLName": "PARQUE SOLAR ALPHA SPA", "Disabled": "tYES" },
      { "BPLID": 14, "BPLName": "PARQUE FOTOVOLTAICO IDAHUILLO SPA", "Disabled": "tNO" },
      { "BPLID": 15, "BPLName": "PARQUE FOTOVOLTAICO DON MATIAS SPA", "Disabled": "tNO" },
      { "BPLID": 16, "BPLName": "PARQUE FOTOVOLTAICO DONA IGNA SPA", "Disabled": "tNO" },
      { "BPLID": 17, "BPLName": "PARQUE FOTOVOLTAICO EL LORETO SPA", "Disabled": "tNO" },
      { "BPLID": 18, "BPLName": "TEDLAR FOBOS SPA", "Disabled": "tYES" },
      { "BPLID": 19, "BPLName": "TEDLAR LUNA SPA", "Disabled": "tNO" },
      { "BPLID": 20, "BPLName": "FAROL SOLAR SPA", "Disabled": "tNO" }
  ]
};

// Remove MOCK_ORDERS completely or leave empty array for intialization
const MOCK_ORDERS: SalesOrder[] = [];

interface AppState {
  // Session
  session: Session;
  connect: (companyDb: string, user: string, pass: string) => Promise<void>;
  disconnect: () => void;

  // Master Data
  masterData: MasterData;
  syncMasterData: () => Promise<void>;

  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;

  // Transactions
  orders: SalesOrder[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  activeTab: 'OVs' | 'Facturas' | 'Compras';
  setActiveTab: (tab: 'OVs' | 'Facturas' | 'Compras') => void;
  isFetchingInvoices: boolean;
  isFetchingPurchases: boolean;
  selectedOrderEntry: number | null;
  selectedSublines: number[]; // stored by lineNum of the selected order
  selectedPurchases: number[]; // stored docEntries for massive pay
  
  // Sheet Integration (Data Quality Center)
  sheetAnomalies: SheetAnomaly[];
  syncSheetsData: (parsedData: any[]) => void;
  
  // Batch Operations
  batchSelectedOrders: number[]; // Array of DocEntries
  isProcessingBatch: boolean;
  batchProgress: { current: number; total: number } | null;
  toggleBatchSelection: (docEntry: number) => void;
  toggleAllBatchSelection: (selectAll: boolean) => void;
  closeBatchOrders: () => Promise<void>;
  invoiceBatchOrders: () => Promise<void>;
  regularizeProjects: (targetOrders?: SalesOrder[]) => Promise<void>;
  
  selectOrder: (docEntry: number | null) => void;
  updateSalesOrder: (docEntry: number, updates: { comments?: string, reference?: string, project?: string, newLines?: Partial<Subline>[], updatedLines?: Partial<Subline>[] }) => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  toggleSubline: (lineNum: number) => void;
  toggleAllSublines: (selectAll: boolean) => void;
  
  togglePurchaseSelection: (docEntry: number) => void;
  toggleAllPurchaseSelection: (selectAll: boolean) => void;
  
  closeOrder: (docEntry: number) => Promise<void>;
  invoiceFullOrder: (docEntry: number) => Promise<void>;
  generateInvoice: () => Promise<void>;
  generateCreditNote: (docEntry: number) => Promise<void>;
  
  fetchPurchaseInvoices: () => Promise<void>;
  paySelectedInvoices: (transferAccount: string, reference: string) => Promise<void>;
  linkInvoiceToOrder: (invoiceDocEntry: number, orderDocNum: number) => Promise<void>;

  // Computed Simulators (exposed as getters/functions or just derived in React component for better state management, 
  // but keeping simple helper here for simulation parsing)
  getSimulationPayload: () => ODataV2InvoicePayload | null;
}

export const useStore = create<AppState>((set, get) => ({
  session: {
    companyDb: "SBOFLUXSOLAR",
    user: "analista_ventas",
    token: null,
    isConnected: false,
    bplid: null,
  },

  activeTab: 'OVs',
  setActiveTab: (tab) => set({ activeTab: tab }),

  orders: [],
  invoices: [],
  purchaseInvoices: [],
  isFetchingInvoices: false,
  isFetchingPurchases: false,
  selectedOrderEntry: null,
  selectedSublines: [],
  selectedPurchases: [],

  connect: async (companyDb, user, pass) => {
    console.log(`Authenticating ${user} for DB ${companyDb}`);
    
    try {
      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: '/Login',
          body: { CompanyDB: companyDb, UserName: user, Password: pass }
        })
      });
      
      if (!response.ok) {
        let errValue = "Error al intentar conectar con el servidor SAP.";
        try { 
          const err = await response.json(); 
          const sapMessage = err?.error?.message?.value || err?.error || JSON.stringify(err);
          
          if (sapMessage.toLowerCase().includes('logon') || sapMessage.toLowerCase().includes('password') || sapMessage.toLowerCase().includes('user')) {
            errValue = "Usuario o contraseña incorrectos, o base de datos inválida.";
          } else if (response.status === 502 || response.status === 503 || response.status === 504 || response.status === 500) {
            errValue = "El servidor SAP (Service Layer) se encuentra caído o inaccesible en este momento.";
          } else {
            errValue = `Error SAP: ${sapMessage}`;
          }
        } catch(e) { 
          if (response.status >= 500) {
            errValue = "El servidor de integración no está respondiendo (Servidor caído).";
          }
        }
        throw new Error(errValue);
      }
      
      const data = await response.json();
      set({ session: { companyDb, user, token: data.SessionId, isConnected: true, bplid: "1" } }); // Default BPLId to "1" until synched
      
      // Sincronizar automáticamente los datos maestros al iniciar sesión
      get().syncMasterData().catch(console.error);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error("No se pudo establecer conexión. El servidor proxy o el servidor SAP B1 está inactivo.");
      }
      throw error;
    }
  },

  disconnect: () => {
    set({ session: { companyDb: "", user: "", token: null, isConnected: false, bplid: null }, orders: [] });
  },

  masterData: {
    bplids: [], // Start empty, force user to sync
    isSyncing: false,
    lastSync: null
  },

  syncMasterData: async () => {
    set((state) => ({ masterData: { ...state.masterData, isSyncing: true } }));
    try {
      const { session } = get();
      if (!session.token) throw new Error("No hay sesi\u00f3n activa");

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path: `/BusinessPlaces?$filter=Disabled eq 'tNO'`,
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error Fetching BPLIds";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(errValue);
      }

      const data = await response.json();
      const activeBusinessPlaces = data.value.map((bp: any) => ({
        id: String(bp.BPLID),
        name: bp.BPLName
      }));

      set((state) => {
        const currentSelectedBplid = state.filters.bplid;
        const newBplid = (!currentSelectedBplid || currentSelectedBplid === "1" && activeBusinessPlaces.length > 0)
          ? activeBusinessPlaces[0].id 
          : currentSelectedBplid;

        return { 
          masterData: { 
            ...state.masterData, 
            bplids: activeBusinessPlaces,
            isSyncing: false, 
            lastSync: new Date().toISOString() 
          },
          filters: {
            ...state.filters,
            bplid: newBplid
          }
        };
      });
    } catch (error: any) {
      console.error(error);
      alert(`Error sincronizando Datos Maestros: ${error.message}`);
      set((state) => ({ masterData: { ...state.masterData, isSyncing: false } }));
    }
  },

  filters: {
    bplid: "1",
    rut: "",
    project: "",
    cc: "",
    dateFrom: formatDate(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]),
    dateTo: formatDate(new Date().toISOString().split('T')[0]),
    searchQuery: "",
    daysToDue: 3
  },

  setFilters: (newFilters) => set((state) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    
    // Auto-fetch if dates change could be added here, leaving for "Consultar SBO" button manually
    
    // If BPLid changes, reset selection
    const resetSelection = newFilters.bplid !== undefined && newFilters.bplid !== state.filters.bplid;
    return { 
      filters: updatedFilters,
      selectedOrderEntry: resetSelection ? null : state.selectedOrderEntry,
      selectedSublines: resetSelection ? [] : state.selectedSublines,
      selectedPurchases: resetSelection ? [] : state.selectedPurchases
    };
  }),

  // Function to load the orders from the Service Layer with Pagination Support
  fetchOrders: async () => {
    const { session, filters, masterData } = get();
    const { dateFrom, dateTo, rut, searchQuery, bplid, project, cc } = filters;
    
    // Parse dates to SAP format YYYY-MM-DD
    const sapDateFrom = parseDateToSAP(dateFrom);
    const sapDateTo = parseDateToSAP(dateTo);
    
    let filterClauses = [`DocDate ge '${sapDateFrom}' and DocDate le '${sapDateTo}'` || ""];
    
    if (bplid) {
      filterClauses.push(`BPL_IDAssignedToInvoice eq ${bplid}`);
    }
    
    if (rut) {
      filterClauses.push(`contains(CardCode, '${rut}')`);
    }
    
    if (project) {
      filterClauses.push(`Project eq '${project}'`);
    }

    if (cc) {
      // CC usually only at line level, if we can't search line any, we might have to remove this or use header cc if available.
      // Assuming user only wants project in header for now.
    }

    if (searchQuery) {
      if (!isNaN(Number(searchQuery))) {
        filterClauses.push(`DocNum eq ${searchQuery}`);
      } else {
        filterClauses.push(`(contains(Reference1, '${searchQuery}') or contains(Project, '${searchQuery}'))`);
      }
    }

    const filter = filterClauses.filter(Boolean).join(' and ');
    
    const initialOdataQuery = `Orders()?$select=DocEntry,DocNum,DocType,DocDate,DocDueDate,TaxDate,CardCode,DocTotal,DocCurrency,DocRate,Reference1,Comments,Project,JournalMemo,BPLName,Cancelled,DocumentStatus,DocumentLines&$filter=${filter}`;
    console.log(`[Service Layer Request]: Querying SAP with filter: ${filter}`);
    
    // Reset selection before extraction
    set({ selectedOrderEntry: null, selectedSublines: [] });

    try {
      if (!session.token) throw new Error("No hay sesi\u00f3n para descargar transacciones");

      let allSapOrders: any[] = [];
      let currentPath = initialOdataQuery;
      let hasNextPage = true;

      // Loop to fetch paginated results using @odata.nextLink
      while (hasNextPage) {
        // Clean paths to ensure it starts with /
        const cleanPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

        const response = await fetch('/api/sap/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GET',
            path: cleanPath,
            token: session.token
          })
        });

        if (!response.ok) {
          let errValue = "Error descargando OVs";
          try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
          throw new Error(errValue);
        }
        
        const data = await response.json();
        
        if (data.value && Array.isArray(data.value)) {
          allSapOrders = allSapOrders.concat(data.value);
        }

        // Check if SAP B1 provides a next page link
        if (data['@odata.nextLink']) {
          currentPath = data['@odata.nextLink'];
          console.log(`[SAP API Pagination] Fetching next batch: ${currentPath} (Loaded so far: ${allSapOrders.length})`);
        } else {
          hasNextPage = false;
        }
      }

      console.log(`[SAP API Response] Extraction Complete. Total Records: ${allSapOrders.length}`);

      // Flatten Architecture transformation:
      const bplDict = masterData.bplids.reduce((acc, curr) => {
        acc[curr.name] = curr.id;
        return acc;
      }, {} as Record<string, string>);

      const mappedOrders: SalesOrder[] = allSapOrders.map((sapOrder: any) => ({
        docEntry: sapOrder.DocEntry,
        docNum: sapOrder.DocNum,
        cardCode: sapOrder.CardCode,
        cardName: sapOrder.CardName || sapOrder.CardCode, 
        docDate: sapOrder.DocDate,
        docDueDate: sapOrder.DocDueDate,
        currency: sapOrder.DocCurrency,
        docRate: sapOrder.DocRate,
        totalNet: sapOrder.DocTotal,
        isCancelled: sapOrder.Cancelled === "tYES",
        documentStatus: sapOrder.DocumentStatus,
        comments: sapOrder.Comments,
        reference: sapOrder.Reference1,
        project: sapOrder.Project,
        // Force match by name, if it fails, fallback to UI BplId "1"
        bplid: bplDict[sapOrder.BPLName] || "1", 
        documentLines: sapOrder.DocumentLines.map((line: any) => ({
          lineNum: line.LineNum,
          itemCode: line.ItemCode,
          dscription: line.ItemDescription,
          quantity: line.Quantity,
          price: line.Price,
          discountPercent: line.DiscountPercent,
          taxCode: line.TaxCode,
          project: line.ProjectCode || "",
          costCenter: line.CostingCode5 || "",
          currency: line.Currency,
          rate: line.Rate,
          lineStatus: line.LineStatus
        }))
      }));

      // Deduplicate by docEntry in case API pagination returns duplicate objects
      const oldOrders = get().orders;
      
      const uniqueOrders = mappedOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.docEntry === order.docEntry)
      ).map(order => {
        const oldOrder = oldOrders.find(o => o.docEntry === order.docEntry);
        if (oldOrder) {
          return {
            ...order,
            sheetStatus: oldOrder.sheetStatus,
            sheetRef: oldOrder.sheetRef,
            fechaGanado: oldOrder.fechaGanado,
            fechaTE4: oldOrder.fechaTE4,
          };
        }
        return order;
      });

      set({ orders: uniqueOrders });
    } catch(error: any) {
      console.error(error);
      alert(`Error extrayendo transacciones: ${error.message}`);
    }
  },


  sheetAnomalies: [],

  syncSheetsData: (parsedData: any[]) => set((state) => {
    const anomalies: SheetAnomaly[] = [];
    
    // Helper para normalizar strings: quitar espacios, tildes y pasar a minusculas
    const normalizeKey = (str: string) => 
      String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");

    const updatedOrders = state.orders.map(ov => {
      const docNumStr = String(ov.docNum);
      
      const matchRow = parsedData.find(row => {
        // Encontrar clave (Doc Venta) robustamente
        const keys = Object.keys(row);
        const docVentaKey = keys.find(k => normalizeKey(k).includes('docventa')) || keys[1]; // fallback index 1
        
        if (!docVentaKey) return false;

        const docVenta = String(row[docVentaKey] || "").trim().replace(/\s/g, '').toUpperCase();
        return docVenta.includes(docNumStr) || docVenta.includes(`OV${docNumStr}`);
      });

      if (!matchRow) return { ...ov, sheetStatus: 'pending' as const };

      // Búsqueda de llaves robusta
      const rowKeys = Object.keys(matchRow);
      const cecoKey = rowKeys.find(k => normalizeKey(k).includes('ceco')) || rowKeys[0];
      const docVentaKey = rowKeys.find(k => normalizeKey(k).includes('docventa')) || rowKeys[1];
      const ganadoKey = rowKeys.find(k => normalizeKey(k).includes('ganado')) || rowKeys[2];
      const te4Key = rowKeys.find(k => normalizeKey(k).includes('te4')) || rowKeys[3];

      const docVenta = String(matchRow[docVentaKey] || "");
      const ceco = matchRow[cecoKey] ? String(matchRow[cecoKey]) : null;
      const fechaGanado = matchRow[ganadoKey] || null;
      const fechaTE4 = matchRow[te4Key] || null;
      
      const is21007 = docVenta.includes('21007');

      let status: SheetStatus = 'pending';

      const hasGanadoVal = fechaGanado && String(fechaGanado).trim() !== "";
      const hasTE4Val = fechaTE4 && String(fechaTE4).trim() !== "";

      // Árbol de decisión de Cuadratura EPM
      if (hasTE4Val && !hasGanadoVal) {
        status = 'anomaly';
        anomalies.push({
          docNum: ov.docNum,
          docEntry: ov.docEntry,
          reason: "Incongruencia: Presenta fecha TE4 Inscrito, pero carece de Fecha de Ganado.",
          sheetRef: docVenta
        });
      } else if (is21007 && hasGanadoVal) {
        status = 'ready_100';
      } else if (!is21007 && hasGanadoVal && hasTE4Val) {
        status = 'ready_cierre';
      } else if (!is21007 && hasGanadoVal && !hasTE4Val) {
        status = 'ready_anticipo';
      }

      if (status === 'ready_anticipo') {
        const line0 = ov.documentLines.find(l => l.lineNum === 0);
        if (line0 && line0.lineStatus === 'bost_Close') {
          status = 'pending_te4';
        }
      } else if (status === 'ready_cierre') {
        const line1 = ov.documentLines.find(l => l.lineNum === 1);
        if (line1 && line1.lineStatus === 'bost_Close') {
          status = 'pending';
        }
      } else if (status === 'ready_100') {
         const line0 = ov.documentLines.find(l => l.lineNum === 0);
         if (line0 && line0.lineStatus === 'bost_Close') {
           status = 'pending';
         }
      }

      return {
        ...ov,
        sheetStatus: status,
        fechaGanado: hasGanadoVal ? String(fechaGanado) : undefined,
        fechaTE4: hasTE4Val ? String(fechaTE4) : undefined,
        sheetRef: docVenta
      };
    });

    return { 
      orders: updatedOrders, 
      sheetAnomalies: anomalies,
      selectedOrderEntry: null,
      selectedSublines: []
    };
  }),

  selectOrder: (docEntry) => set({ selectedOrderEntry: docEntry, selectedSublines: [] }),
  
  // Order operations
  updateSalesOrder: async (docEntry, updates) => {
    const { session } = get();
    if (!session.token) {
      alert("No hay sesión activa para actualizar OV.");
      return;
    }
    
    const order = get().orders.find(o => o.docEntry === docEntry);

    // Construct payload
    const payload: any = {};
    if (updates.comments !== undefined) {
      payload.Comments = updates.comments;
    }
    if (updates.reference !== undefined) {
      payload.Reference1 = updates.reference;
    }
    if (updates.project !== undefined) {
      payload.Project = updates.project;
    }
    
    if (updates.updatedLines || updates.newLines) {
      const docLines: any[] = [];
      let docCurrency = undefined;

      if (updates.updatedLines) {
        updates.updatedLines.forEach(l => {
          if (l.currency && l.currency !== 'CLP') docCurrency = l.currency;
          docLines.push({
            LineNum: l.lineNum,
            Quantity: l.quantity,
            Price: l.price,
            UnitPrice: l.price,
            Currency: l.currency
          });
        });
      }
      if (updates.newLines) {
        updates.newLines.forEach(l => {
          if (l.currency && l.currency !== 'CLP') docCurrency = l.currency;
          docLines.push({
            ItemCode: l.itemCode,
            Quantity: l.quantity,
            Price: l.price,
            UnitPrice: l.price,
            Currency: l.currency,
            ProjectCode: l.project,
            CostingCode5: l.costCenter,
            TaxCode: "IVA",
            U_Orden_Venta: String(order?.docNum || "")
          });
        });
      }
      if (docLines.length > 0) {
        payload.DocumentLines = docLines;
      }
      if (docCurrency) {
        payload.DocCurrency = docCurrency;
      }
    }
    
    console.log("updateSalesOrder payload:", payload);

    const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: `/Orders(${docEntry})`,
          body: payload,
          token: session.token
        })
    });
    
    if (!response.ok) {
       let errorDetails = "";
       try { const err = await response.json(); errorDetails = err?.error?.message?.value || JSON.stringify(err); } catch(e) {}
       alert("Error actualizando OV: " + errorDetails);
       return;
    }
    
    // Refresh orders after successful update
    await get().fetchOrders();
  },
  
  // Batch Implementation
  batchSelectedOrders: [],
  isProcessingBatch: false,
  batchProgress: null,
  
  toggleBatchSelection: (docEntry) => set((state) => {
    const isSelected = state.batchSelectedOrders.includes(docEntry);
    return {
      batchSelectedOrders: isSelected
        ? state.batchSelectedOrders.filter(e => e !== docEntry)
        : [...state.batchSelectedOrders, docEntry]
    };
  }),

  toggleAllBatchSelection: (selectAll) => set((state) => {
    if (!selectAll) return { batchSelectedOrders: [] };
    // Select all currently visible in filtered list, MINUS ANOMALIES to maintain security
    // ALSO MINUS CLOSED or CANCELLED to prevent operating on already-closed orders
    const visibleOrders = state.orders.filter(o => 
      o.documentStatus !== 'bost_Close' && 
      o.documentStatus !== 'bost_Cancel' &&
      !o.isCancelled && // double lock 
      o.bplid === state.filters.bplid &&
      o.sheetStatus !== 'anomaly' &&
      (state.filters.rut ? o.cardCode.includes(state.filters.rut) : true) &&
      (state.filters.project ? o.documentLines.some(l => l.project?.includes(state.filters.project)) : true) &&
      (state.filters.cc ? o.documentLines.some(l => l.costCenter?.includes(state.filters.cc)) : true)
    );
    return { batchSelectedOrders: visibleOrders.map(o => o.docEntry) };
  }),

  closeBatchOrders: async () => {
    const state = get();
    const { session, batchSelectedOrders } = state;
    
    if (batchSelectedOrders.length === 0) return;
    if (!session.token) {
      alert("No hay sesión activa para realizar cierres masivos.");
      return;
    }

    set({ isProcessingBatch: true, batchProgress: { current: 0, total: batchSelectedOrders.length } });

    let successCount = 0;
    const errors: { docNum: number, error: string }[] = [];

    for (let i = 0; i < batchSelectedOrders.length; i++) {
       const docEntry = batchSelectedOrders[i];
       const orderInfo = state.orders.find(o => o.docEntry === docEntry);
       const docNum = orderInfo?.docNum || docEntry;
       
       set({ batchProgress: { current: i + 1, total: batchSelectedOrders.length } });

       try {
         // Step 1: Try Patch Comments
         const existingComments = orderInfo?.comments || "";
         let newComments = existingComments ? `${existingComments} - Cerrada por Sistema APP` : "Cerrada por Sistema APP";
         if (newComments.length > 254) newComments = newComments.substring(0, 254);
         
         await fetch('/api/sap/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'PATCH',
              path: `/Orders(${docEntry})`,
              token: session.token,
              body: { Comments: newComments }
            })
         }); // Ignore failure on patch for batch close

         // Step 2: Close
         const response = await fetch('/api/sap/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'POST',
              path: `/Orders(${docEntry})/Close`,
              token: session.token
            })
         });

         if (!response.ok) {
           let errValue = `Error SBO`;
           try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
           throw new Error(errValue);
         }
         successCount++;
       } catch (error: any) {
         console.error(`Error closing OV ${docNum}:`, error);
         errors.push({ docNum, error: error.message });
       }
       
       await new Promise(resolve => setTimeout(resolve, 200));
    }

    set({ 
      isProcessingBatch: false, 
      batchProgress: null, 
      batchSelectedOrders: errors.length > 0 ? get().batchSelectedOrders : []
    });

    if (errors.length > 0) {
      const errorMsg = errors.map(e => `OV ${e.docNum}: ${e.error}`).join('\n');
      alert(`Finalizado. Éxitos: ${successCount}. Hubo ${errors.length} errores:\n\n${errorMsg}`);
    } else {
      alert(`¡Cierre masivo completado! Órdenes cerradas: ${successCount}.`);
    }

    await get().fetchOrders();
  },

  invoiceBatchOrders: async () => {
    const state = get();
    const { session, batchSelectedOrders } = state;
    if (batchSelectedOrders.length === 0) return;
    if (!session.token) {
      alert("No hay sesión activa para facturar masivamente.");
      return;
    }

    set({ isProcessingBatch: true, batchProgress: { current: 0, total: batchSelectedOrders.length } });

    let successCount = 0;
    const errors: { docNum: number, error: string }[] = [];
    const today = new Date().toISOString().split('T')[0];
    const user = session.user || "UnknownUser";
    const jrlMemoBase = `Facturado masivamente desde Portal por ${user.split('@')[0]} el ${today}`;

    for (let i = 0; i < batchSelectedOrders.length; i++) {
       const docEntry = batchSelectedOrders[i];
       const order = state.orders.find(o => o.docEntry === docEntry);
       const docNum = order?.docNum || docEntry;
       
       set({ batchProgress: { current: i + 1, total: batchSelectedOrders.length } });

       try {
         if (!order) throw new Error("Datos de orden no encontrados en UI");

         const hitoName = order.sheetStatus === 'ready_anticipo' ? 'Anticipo' : (order.sheetStatus === 'ready_cierre' ? 'Certificacion' : 'Venta Carga Electrica');
         const isUF = order.currency === 'UF';
         const docTotalUF = isUF ? order.totalNet : (order.docRate && order.docRate > 1 ? (order.totalNet / order.docRate).toFixed(2) : order.totalNet);
         const clientComments = `Proyecto Fotovoltaico Flux\nContrato ${docTotalUF} UF\nFacturacion Hito ${hitoName}`;

         const payload: ODataV2InvoicePayload = {
           BPL_IDAssignedToInvoice: parseInt(order.bplid, 10),
           DocType: "dDocument_Items",
           HandWritten: "tNO",
           DocDate: today,
           DocDueDate: today,
           TaxDate: today,
           DocCurrency: order.currency,
           CardCode: order.cardCode,
           Comments: clientComments,
           JournalMemo: `Factura de Venta 33 - OV ${docNum} - ${order.cardCode}`,
           Indicator: "33",
           U_Orden_Venta: String(order.docNum),
           DocumentLines: order.documentLines
             .filter(l => {
                if (order.sheetStatus === 'ready_anticipo') return l.lineNum === 0;
                if (order.sheetStatus === 'ready_cierre') return l.lineNum === 1;
                if (order.sheetStatus === 'ready_100') return l.lineNum === 0;
                return l.lineStatus === 'bost_Open'; // default safe open lines
             })
             .map(l => ({
               BaseType: 17,
               BaseEntry: order.docEntry,
               BaseLine: l.lineNum,
               ItemCode: l.itemCode,
               Quantity: l.quantity,
               ProjectCode: l.project,
               TaxCode: "IVA",
               CostingCode5: l.costCenter,
               U_Orden_Venta: String(order.docNum)
             }))
         };

         const response = await fetch('/api/sap/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'POST',
              path: `/Invoices`,
              body: payload,
              token: session.token
            })
         });

         if (!response.ok) {
           let errValue = `Error SBO Al facturar`;
           try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
           throw new Error(errValue);
         }
         successCount++;
       } catch (error: any) {
         console.error(`Error invoicing OV ${docNum}:`, error);
         errors.push({ docNum, error: error.message });
       }
       
       await new Promise(resolve => setTimeout(resolve, 200));
    }

    set({ 
      isProcessingBatch: false, 
      batchProgress: null, 
      batchSelectedOrders: errors.length > 0 ? get().batchSelectedOrders : []
    });

    if (errors.length > 0) {
      const errorMsg = errors.map(e => `OV ${e.docNum}: ${e.error}`).join('\n');
      alert(`Finalizado. Éxitos: ${successCount}. Hubo ${errors.length} errores:\n\n${errorMsg}`);
    } else {
      alert(`¡Facturación masiva completada! Facturas generadas: ${successCount}.`);
    }

    await get().fetchOrders();
  },

  regularizeProjects: async (targetOrders?: SalesOrder[]) => {
    const state = get();
    const { session, orders } = state;
    
    // Si no se pasan órdenes, usamos todas las del store
    const sourceOrders = targetOrders || orders;
    
    if (!session.token) {
      alert("No hay sesión activa para regularizar.");
      return;
    }

    // Identificar órdenes que necesitan regularización
    const ordersToUpdate = sourceOrders.filter(o => {
      const hasHeaderProject = o.project && String(o.project).trim() !== "";
      if (hasHeaderProject) return false;

      // Solo órdenes que NO estén cerradas ni canceladas
      const status = String(o.documentStatus || "").toLowerCase();
      if (status.includes('close') || status.includes('cancel') || o.isCancelled) return false;
      
      // Debe tener al menos una línea con proyecto para poder copiarlo
      const lineWithProject = o.documentLines.find(l => l.project && String(l.project).trim() !== "");
      return !!lineWithProject;
    });

    if (ordersToUpdate.length === 0) {
      alert('🔍 No se encontraron órdenes pendientes de regularización en el listado actual.\n\nEsto significa que las OVs visibles ya tienen Proyecto en cabecera o no tienen información de proyecto en sus líneas.');
      return;
    }

    const message = `Se han detectado ${ordersToUpdate.length} órdenes que tienen Proyecto en sus líneas pero NO en el encabezado.\n\nEl sistema copiará el Código de Proyecto de la primera línea al encabezado de cada OV.\n\n¿Desea corregir estas ${ordersToUpdate.length} órdenes ahora?`;
    
    if (!confirm(message)) {
      return;
    }

    set({ isProcessingBatch: true, batchProgress: { current: 0, total: ordersToUpdate.length } });

    let successCount = 0;
    const errors: { docNum: number, error: string }[] = [];

    for (let i = 0; i < ordersToUpdate.length; i++) {
      const order = ordersToUpdate[i];
      set({ batchProgress: { current: i + 1, total: ordersToUpdate.length } });

      try {
        const firstLineWithProject = order.documentLines.find(l => l.project && String(l.project).trim() !== "");
        if (!firstLineWithProject) continue;

        const response = await fetch('/api/sap/proxy', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             method: 'PATCH',
             path: `/Orders(${order.docEntry})`,
             body: { Project: firstLineWithProject.project },
             token: session.token
           })
        });

        if (!response.ok) {
           let errValue = `Error SAP`;
           try { 
             const err = await response.json(); 
             errValue = err?.error?.message?.value || JSON.stringify(err); 
           } catch(e) { }
           throw new Error(errValue);
        }
        successCount++;
      } catch (error: any) {
        console.error(`Error regularizing OV ${order.docNum}:`, error);
        errors.push({ docNum: order.docNum, error: error.message });
      }
      
      // Delay preventivo
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    set({ isProcessingBatch: false, batchProgress: null });

    if (errors.length > 0) {
      const errorMsg = errors.map(e => `OV ${e.docNum}: ${e.error}`).join('\n');
      alert(`⚠️ Proceso finalizado con observaciones.\n\nÉxitos: ${successCount}\nErrores: ${errors.length}\n\nDetalle de errores:\n${errorMsg}`);
    } else {
      alert(`✅ ¡Regularización exitosa!\n\nSe han actualizado ${successCount} órdenes. Ahora el campo Proyecto aparecerá correctamente en los listados y búsquedas.`);
    }

    // Refrescar para ver los cambios
    await get().fetchOrders();
  },

  toggleSubline: (lineNum) => set((state) => {
    const isSelected = state.selectedSublines.includes(lineNum);
    return {
      selectedSublines: isSelected 
        ? state.selectedSublines.filter(l => l !== lineNum)
        : [...state.selectedSublines, lineNum]
    };
  }),

  toggleAllSublines: (selectAll) => set((state) => {
    if (!selectAll) return { selectedSublines: [] };
    const order = state.orders.find(o => o.docEntry === state.selectedOrderEntry);
    if (!order) return { selectedSublines: [] };
    return { selectedSublines: order.documentLines.map(l => l.lineNum) };
  }),

  closeOrder: async (docEntry) => {
    try {
      const { session } = get();
      if (!session.token) throw new Error("No hay sesión activa");
      
      const orderToClose = get().orders.find(o => o.docEntry === docEntry);
      const docNumLabel = orderToClose ? orderToClose.docNum : docEntry;
      
      // Compute new comments value
      const existingComments = orderToClose?.comments || "";
      let newComments = existingComments ? `${existingComments} - Cerrada por Sistema APP` : "Cerrada por Sistema APP";
      if (newComments.length > 254) {
        newComments = newComments.substring(0, 254);
      }

      // Step 1: Update comments via PATCH (Best Effort)
      let commentsUpdated = true;
      const patchResponse = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: `/Orders(${docEntry})`,
          token: session.token,
          body: { Comments: newComments }
        })
      });

      if (!patchResponse.ok) {
        commentsUpdated = false;
        let errValue = "";
        try { const err = await patchResponse.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        console.warn(`[SAP API] No se pudo actualizar el comentario previo a cierre. Error: ${errValue}. Procediendo con el cierre directamente...`);
      }

      // Step 2: Close Order via POST to /Close
      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: `/Orders(${docEntry})/Close`,
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error cerrando orden";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(`Fallo cerrando: ${errValue}`);
      }

      set((state) => ({
        orders: state.orders.map(o => o.docEntry === docEntry ? { ...o, documentStatus: 'bost_Close', comments: commentsUpdated ? newComments : o.comments } : o),
        selectedOrderEntry: state.selectedOrderEntry === docEntry ? null : state.selectedOrderEntry,
        selectedSublines: state.selectedOrderEntry === docEntry ? [] : state.selectedSublines
      }));

      // Feedback for user
      if (commentsUpdated) {
        alert(`✅ ¡Éxito Confirmado por SAP API! La Orden de Venta N° ${docNumLabel} fue cerrada. Se registró el comentario.`);
      } else {
        alert(`✅ ¡Éxito! La Orden de Venta N° ${docNumLabel} fue cerrada. (Nota: No se pudo actualizar el comentario debido a validaciones internas de SAP, por ejemplo, códigos de proyecto inactivos).`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error cerrando orden: ${error.message}`);
    }
  },

  invoiceFullOrder: async (docEntry) => {
    try {
      const state = get();
      const { session } = state;
      if (!session.token) throw new Error("No hay sesión para facturar");

      const order = state.orders.find(o => o.docEntry === docEntry);
      if (!order) return;

      const today = new Date().toISOString().split('T')[0];
      const user = session.user || "UnknownUser";
      const comments = `Facturado desde Portal por ${user} el ${today}`;

      const payload: ODataV2InvoicePayload = {
        BPL_IDAssignedToInvoice: parseInt(order.bplid, 10),
        DocType: "dDocument_Items",
        HandWritten: "tNO",
        DocDate: today,
        DocDueDate: today,
        TaxDate: today,
        DocCurrency: order.currency,
        CardCode: order.cardCode,
        Comments: comments,
        Indicator: "33",
        U_Orden_Venta: String(order.docNum),
        DocumentLines: order.documentLines.filter(l => l.lineStatus === 'bost_Open').map(l => ({
            BaseType: 17,
            BaseEntry: order.docEntry,
            BaseLine: l.lineNum,
            ItemCode: l.itemCode,
            Quantity: l.quantity,
            ProjectCode: l.project,
            TaxCode: "IVA",
            CostingCode5: l.costCenter,
            U_Orden_Venta: String(order.docNum)
          }))
      };

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: `/Invoices`,
          body: payload,
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error al generar factura";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(errValue);
      }

      set((state) => ({
        orders: state.orders.map(o => o.docEntry === docEntry ? { ...o, documentStatus: 'bost_Close' } : o),
        selectedOrderEntry: state.selectedOrderEntry === docEntry ? null : state.selectedOrderEntry,
        selectedSublines: state.selectedOrderEntry === docEntry ? [] : state.selectedSublines
      }));
      alert(`✅ ¡Factura generada con éxito para la Orden N° ${order.docNum}!`);
    } catch(error: any) {
      console.error(error);
      alert(`Fallo en factura/API: ${error.message}`);
    }
  },

  generateInvoice: async () => {
    const payload = get().getSimulationPayload();
    if (!payload) return;
    
    console.log("Generating invoice via UI Service Layer Adapter: ", payload);
    
    try {
      const { session } = get();
      if (!session.token) throw new Error("No hay sesi\u00f3n para facturar");

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: `/Invoices`,
          body: payload,
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error generating invoice based on payload";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(errValue);
      }

      // On success, we generally remove or flag the order lines as closed.
      const orderEntry = get().selectedOrderEntry;
      set((state) => ({
        orders: state.orders.filter(o => o.docEntry !== orderEntry),
        selectedOrderEntry: null,
        selectedSublines: []
      }));
      alert("Factura generada con \u00E9xito en SAP Business One!");
    } catch(error: any) {
      console.error(error);
      alert(`Fallo en factura/API: ${error.message}`);
    }
  },

  getSimulationPayload: () => {
    const state = get();
    if (!state.selectedOrderEntry || state.selectedSublines.length === 0) return null;
    
    const order = state.orders.find(o => o.docEntry === state.selectedOrderEntry);
    if (!order) return null;

    const today = new Date().toISOString().split('T')[0];
    const user = state.session.user || "UnknownUser";
    const comments = `Facturado desde Portal por ${user} el ${today}`;

    const payload: ODataV2InvoicePayload = {
      BPL_IDAssignedToInvoice: parseInt(order.bplid, 10),
      DocType: "dDocument_Items", // Corresponds to type "I"
      HandWritten: "tNO", // Corresponds to "N"
      DocDate: today,
      DocDueDate: today,
      TaxDate: today,
      DocCurrency: order.currency, // Preserving UF vs CLP logic
      CardCode: order.cardCode,
      Comments: comments,
      Indicator: "33", // Factura Electronica standard code
      U_Orden_Venta: String(order.docNum),
      DocumentLines: order.documentLines
        .filter(l => state.selectedSublines.includes(l.lineNum))
        .map(l => ({
          BaseType: 17, // Base object type for Sales Order mapping
          BaseEntry: order.docEntry,
          BaseLine: l.lineNum, // Original line location
          ItemCode: l.itemCode,
          Quantity: l.quantity, // User's NumPerMsr
          ProjectCode: l.project,
          TaxCode: "IVA", // Siempre IVA
          CostingCode5: l.costCenter,
          U_Orden_Venta: String(order.docNum)
        }))
    };
    
    return payload;
  },

  fetchInvoices: async () => {
    const { session, filters, masterData } = get();
    const { dateFrom, dateTo, rut, searchQuery, bplid, project } = filters;
    
    // Parse dates to SAP format YYYY-MM-DD
    const sapDateFrom = parseDateToSAP(dateFrom);
    const sapDateTo = parseDateToSAP(dateTo);
    
    let filterClauses = [`DocDate ge '${sapDateFrom}' and DocDate le '${sapDateTo}'` || ""];
    
    if (bplid) {
      filterClauses.push(`BPL_IDAssignedToInvoice eq ${bplid}`);
    }
    
    if (rut) {
      filterClauses.push(`contains(CardCode, '${rut}')`);
    }
    
    if (project) {
      filterClauses.push(`Project eq '${project}'`);
    }

    if (searchQuery) {
      if (!isNaN(Number(searchQuery))) {
        filterClauses.push(`DocNum eq ${searchQuery}`);
      } else {
        filterClauses.push(`(contains(Reference1, '${searchQuery}') or contains(Project, '${searchQuery}'))`);
      }
    }

    const filter = filterClauses.filter(Boolean).join(' and ');
    
    const initialOdataQuery = `Invoices()?$select=DocEntry,DocNum,FolioNumber,DocType,DocDate,DocDueDate,TaxDate,CardCode,DocTotal,DocCurrency,DocRate,Reference1,Comments,Project,JournalMemo,BPLName,Cancelled,DocumentStatus,DocumentLines,U_EXX_FE_DESERR,Indicator&$filter=${filter}`;
    console.log(`[Service Layer Request]: Querying SAP Facturas with filter: ${filter}`);
    
    // Reset selection before extraction
    set({ selectedOrderEntry: null, selectedSublines: [], isFetchingInvoices: true });

    try {
      if (!session.token) throw new Error("No hay sesi\u00f3n para descargar transacciones");

      let allSapInvoices: any[] = [];
      let currentPath = initialOdataQuery;
      let hasNextPage = true;

      // Loop to fetch paginated results using @odata.nextLink
      while (hasNextPage) {
        const cleanPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

        const response = await fetch('/api/sap/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GET',
            path: cleanPath,
            token: session.token
          })
        });

        if (!response.ok) {
          let errValue = "Error descargando Facturas";
          try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
          throw new Error(errValue);
        }
        
        const data = await response.json();
        
        if (data.value && Array.isArray(data.value)) {
          allSapInvoices = allSapInvoices.concat(data.value);
        }

        if (data['@odata.nextLink']) {
          currentPath = data['@odata.nextLink'];
        } else {
          hasNextPage = false;
        }
      }

      console.log(`[SAP API Response] Extraction Complete. Total Records: ${allSapInvoices.length}`);

      const bplDict = masterData.bplids.reduce((acc, curr) => {
        acc[curr.name] = curr.id;
        return acc;
      }, {} as Record<string, string>);

      const mappedInvoices: Invoice[] = allSapInvoices.map((sapInvoice: any) => ({
        docEntry: sapInvoice.DocEntry,
        docNum: sapInvoice.DocNum,
        folioNum: sapInvoice.FolioNumber,
        cardCode: sapInvoice.CardCode,
        cardName: sapInvoice.CardName || sapInvoice.CardCode, 
        docDate: sapInvoice.DocDate,
        docDueDate: sapInvoice.DocDueDate,
        bplid: bplDict[sapInvoice.BPLName] || "1",
        currency: sapInvoice.DocCurrency,
        docRate: sapInvoice.DocRate,
        isCancelled: sapInvoice.Cancelled === "tYES" || sapInvoice.Cancelled === "Y",
        documentStatus: sapInvoice.DocumentStatus,
        comments: sapInvoice.Comments,
        reference: sapInvoice.Reference1,
        project: sapInvoice.Project,
        siiStatus: sapInvoice.U_EXX_FE_DESERR || 'No Enviado',
        indicator: sapInvoice.Indicator || '',
        u_Orden_Venta: sapInvoice.U_Orden_Venta,

        totalNet: sapInvoice.DocTotal,
        documentLines: (sapInvoice.DocumentLines || []).map((line: any) => ({
          lineNum: line.LineNum,
          itemCode: line.ItemCode,
          dscription: line.ItemDescription,
          quantity: line.Quantity,
          price: line.Price,
          discountPercent: line.DiscountPercent,
          taxCode: line.TaxCode,
          project: line.ProjectCode,
          costCenter: line.CostingCode5,
          currency: line.Currency,
          rate: line.Rate,
          lineStatus: line.LineStatus,
          baseType: line.BaseType,
          baseEntry: line.BaseEntry,
          baseLine: line.BaseLine,
          baseRef: line.BaseRef
        }))
      }));

      // In case we want to sort
      mappedInvoices.sort((a, b) => b.docNum - a.docNum);

      set({ invoices: mappedInvoices, isFetchingInvoices: false });
    } catch(error: any) {
      console.error(error);
      alert(`Error extrayendo facturas: ${error.message}`);
      set({ isFetchingInvoices: false });
    }
  },

  generateCreditNote: async (docEntry: number) => {
    try {
      const { session, invoices } = get();
      if (!session.token) throw new Error("No hay sesi\u00f3n para interactuar con SAP");

      const invoice = invoices.find(inv => inv.docEntry === docEntry);
      if (!invoice) throw new Error("Factura no encontrada en el estado");

      const payload: CreditNotePayload = {
        DocType: "dDocument_Items",
        DocDate: parseDateToSAP(formatDate(new Date().toISOString().split('T')[0])),
        DocDueDate: parseDateToSAP(formatDate(new Date().toISOString().split('T')[0])),
        TaxDate: parseDateToSAP(formatDate(new Date().toISOString().split('T')[0])),
        DocCurrency: invoice.currency,
        CardCode: invoice.cardCode,
        Comments: `Nota de Crédito basada en Factura Nro: ${invoice.docNum}`,
        Indicator: "61", // Typically 61 is Note of Credit in Chilean Localization, adjust if needed
        BPL_IDAssignedToInvoice: parseInt(invoice.bplid, 10),
        U_EXX_FE_TpoRef: 33,
        U_EXX_FE_Folio: String(invoice.folioNum),
        U_EXX_FE_Fecha: parseDateToSAP(invoice.docDate),
        U_EXX_FE_CodRef: 1,
        DocumentLines: invoice.documentLines.map(line => ({
          BaseType: 13,
          BaseEntry: invoice.docEntry,
          BaseLine: line.lineNum,
          Quantity: line.quantity
        }))
      };

      console.log(`[POST /CreditNotes Payload]:`, payload);

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: `/CreditNotes`,
          body: payload,
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error generando Nota de Crédito";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(errValue);
      }

      const responseData = await response.json();
      console.log("Nota de Crédito creada:", responseData);
      alert(`¡Nota de Crédito generada exitosamente! DocNum NC: ${responseData.DocNum}`);
      
      // Refresh Invoices to show potential updates (e.g. invoice closed)
      await get().fetchInvoices();
    } catch (error: any) {
      console.error("Error Credit Note:", error);
      alert(error.message);
    }
  },

  togglePurchaseSelection: (docEntry: number) => set((state) => {
    const isSelected = state.selectedPurchases.includes(docEntry);
    return {
      selectedPurchases: isSelected
        ? state.selectedPurchases.filter(e => e !== docEntry)
        : [...state.selectedPurchases, docEntry]
    };
  }),

  toggleAllPurchaseSelection: (selectAll: boolean) => set((state) => {
    if (!selectAll) return { selectedPurchases: [] };
    const visiblePurchases = state.purchaseInvoices.filter(o => o.documentStatus !== 'bost_Close' && o.documentStatus !== 'bost_Cancel');
    return { selectedPurchases: visiblePurchases.map(o => o.docEntry) };
  }),

  fetchPurchaseInvoices: async () => {
    const { session, filters, masterData } = get();
    const { dateFrom, dateTo, rut, searchQuery, bplid, daysToDue } = filters;
    
    // Parse dates to SAP format YYYY-MM-DD
    const sapDateFrom = parseDateToSAP(dateFrom);
    const sapDateTo = parseDateToSAP(dateTo);
    
    // Base filter: Open Purchase Invoices
    let filterClauses = [`DocumentStatus eq 'bost_Open'`];
    
    if (bplid) {
      filterClauses.push(`BPL_IDAssignedToInvoice eq ${bplid}`);
    }
    
    if (rut) {
      filterClauses.push(`contains(CardCode, '${rut}')`);
    }

    if (daysToDue !== '' && daysToDue !== undefined) {
       // Filter by DocDueDate <= today + daysToDue
       const targetDate = new Date();
       targetDate.setDate(targetDate.getDate() + Number(daysToDue));
       const formattedTargetDate = targetDate.toISOString().split('T')[0];
       filterClauses.push(`DocDueDate le '${formattedTargetDate}'`);
    } else {
       // Si no hay filtro de días, usamos el dateFrom y dateTo sobre la fecha contable
       filterClauses.push(`DocDate ge '${sapDateFrom}' and DocDate le '${sapDateTo}'`);
    }

    if (searchQuery) {
      if (!isNaN(Number(searchQuery))) {
        filterClauses.push(`DocNum eq ${searchQuery}`);
      } else {
        filterClauses.push(`(contains(Reference1, '${searchQuery}') or contains(CardName, '${searchQuery}'))`);
      }
    }

    const filter = filterClauses.filter(Boolean).join(' and ');
    
    // OData Query for OPCH (Purchase Invoices)
    const initialOdataQuery = `PurchaseInvoices?$select=DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocCurrency,DocTotal,PaidToDate,DocumentStatus,Project,Reference1,BPLName&$filter=${filter}`;
    
    set({ isFetchingPurchases: true, selectedPurchases: [] });

    try {
      if (!session.token) throw new Error("No hay sesi\u00f3n para descargar transacciones");

      let allSapPurchases: any[] = [];
      let currentPath = initialOdataQuery;
      let hasNextPage = true;

      while (hasNextPage) {
        const cleanPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

        const response = await fetch('/api/sap/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GET',
            path: cleanPath,
            token: session.token
          })
        });

        if (!response.ok) {
          let errValue = "Error descargando Facturas de Compra";
          try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
          throw new Error(errValue);
        }
        
        const data = await response.json();
        
        if (data.value && Array.isArray(data.value)) {
          allSapPurchases = allSapPurchases.concat(data.value);
        }

        if (data['@odata.nextLink']) {
          currentPath = data['@odata.nextLink'];
        } else {
          hasNextPage = false;
        }
      }

      const bplDict = masterData.bplids.reduce((acc, curr) => {
        acc[curr.name] = curr.id;
        return acc;
      }, {} as Record<string, string>);

      const mappedPurchases: PurchaseInvoice[] = allSapPurchases.map((sapInv: any) => ({
        docEntry: sapInv.DocEntry,
        docNum: sapInv.DocNum,
        cardCode: sapInv.CardCode,
        cardName: sapInv.CardName || sapInv.CardCode, 
        docDate: sapInv.DocDate,
        docDueDate: sapInv.DocDueDate,
        currency: sapInv.DocCurrency,
        docTotal: sapInv.DocTotal,
        paidToDate: sapInv.PaidToDate,
        documentStatus: sapInv.DocumentStatus,
        project: sapInv.Project,
        reference: sapInv.Reference1,
        bplid: bplDict[sapInv.BPLName] || "1", 
      }));

      set({ purchaseInvoices: mappedPurchases, isFetchingPurchases: false });
    } catch(error: any) {
      console.error(error);
      alert(`Error extrayendo compras: ${error.message}`);
      set({ isFetchingPurchases: false });
    }
  },

  linkInvoiceToOrder: async (invoiceDocEntry: number, orderDocNum: number) => {
    const { session } = get();
    if (!session.token) {
      alert("No hay sesión activa.");
      return;
    }

    try {
      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: `/Invoices(${invoiceDocEntry})`,
          body: { U_Orden_Venta: String(orderDocNum) },
          token: session.token
        })
      });

      if (!response.ok) {
        let errValue = "Error al vincular OV en SAP";
        try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
        throw new Error(errValue);
      }

      set((state) => ({
        invoices: state.invoices.map(inv => inv.docEntry === invoiceDocEntry ? { ...inv, u_Orden_Venta: String(orderDocNum) } : inv)
      }));
      
      alert("¡Vinculación Exitosa! La factura ahora hace referencia a la Orden de Venta.");
    } catch(error: any) {
      console.error(error);
      alert(`Fallo al intentar vincular la factura: ${error.message}`);
    }
  },

  paySelectedInvoices: async (transferAccount: string, reference: string) => {
    const { session, selectedPurchases, purchaseInvoices, filters } = get();
    if (selectedPurchases.length === 0) return;
    if (!session.token) {
      alert("No hay sesión activa para pagar.");
      return;
    }
    
    // Validate we have a transfer account
    if (!transferAccount) {
      alert("Debe proveer una cuenta de transferencia válida.");
      return;
    }

    try {
      const today = parseDateToSAP(formatDate(new Date().toISOString().split('T')[0]));
      
      // We will group by Provider to generate one payment per provider, OR one payment per invoice depending on rules.
      // Usually SAP allows grouping invoices of the SAME provider in ONE payment document.
      const selectedDocs = purchaseInvoices.filter(p => selectedPurchases.includes(p.docEntry));
      
      const providerGroups = selectedDocs.reduce((acc, curr) => {
         if (!acc[curr.cardCode]) acc[curr.cardCode] = [];
         acc[curr.cardCode].push(curr);
         return acc;
      }, {} as Record<string, PurchaseInvoice[]>);

      let successCount = 0;
      let errorCount = 0;

      for (const cardCode in providerGroups) {
         const invoicesToPay = providerGroups[cardCode];
         const transferSum = invoicesToPay.reduce((sum, inv) => sum + (inv.docTotal - inv.paidToDate), 0);

         const payload: VendorPaymentPayload = {
            DocType: "rSupplier",
            HandWritten: "tNO",
            DocDate: today,
            TransferDate: today,
            CardCode: cardCode,
            BPLID: parseInt(filters.bplid, 10),
            TransferAccount: transferAccount,
            TransferSum: transferSum,
            Reference1: reference || "Nómina Portal",
            PaymentInvoices: invoicesToPay.map(inv => ({
               DocEntry: inv.docEntry,
               SumApplied: inv.docTotal - inv.paidToDate,
               InvoiceType: "it_PurchaseInvoice"
            }))
         };

         console.log("Creating VendorPayment:", payload);

         const response = await fetch('/api/sap/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'POST',
              path: `/VendorPayments`,
              body: payload,
              token: session.token
            })
         });

         if (!response.ok) {
           errorCount++;
           console.error("Failed Payment Response", await response.text());
         } else {
           successCount++;
         }
      }

      if (errorCount > 0) {
        alert(`Pagos procesados con ${errorCount} errores y ${successCount} aciertos. Revise consola.`);
      } else {
        alert(`¡Se generaron ${successCount} Pagos Efectuados correctamente en SAP!`);
      }
      
      // Refresh list
      await get().fetchPurchaseInvoices();
      
    } catch(e: any) {
       alert("Error general procesando pago masivo: " + e.message);
    }
  }
}));
