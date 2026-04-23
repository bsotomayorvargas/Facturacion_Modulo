import { create } from 'zustand';
import { SalesOrder, Session, Filters, MasterData, ODataV2InvoicePayload, SheetAnomaly, SheetStatus } from './types';

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
  connect: (url: string, companyDb: string, user: string, pass: string) => Promise<void>;
  disconnect: () => void;

  // Master Data
  masterData: MasterData;
  syncMasterData: () => Promise<void>;

  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;

  // Transactions
  orders: SalesOrder[];
  selectedOrderEntry: number | null;
  selectedSublines: number[]; // stored by lineNum of the selected order
  
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
  
  selectOrder: (docEntry: number | null) => void;
  fetchOrders: () => Promise<void>;
  toggleSubline: (lineNum: number) => void;
  toggleAllSublines: (selectAll: boolean) => void;
  
  closeOrder: (docEntry: number) => Promise<void>;
  invoiceFullOrder: (docEntry: number) => Promise<void>;
  generateInvoice: () => Promise<void>;

  // Computed Simulators (exposed as getters/functions or just derived in React component for better state management, 
  // but keeping simple helper here for simulation parsing)
  getSimulationPayload: () => ODataV2InvoicePayload | null;
}

export const useStore = create<AppState>((set, get) => ({
  session: {
    url: "https://hanapro-01.local:50000/b1s/v2",
    companyDb: "SBOFLUXSOLAR",
    user: "analista_ventas",
    token: null,
    isConnected: false,
    bplid: null,
  },

  connect: async (url, companyDb, user, pass) => {
    // Real POST to Service Layer Login via proxy
    console.log(`Authenticating ${user} against ${url} for DB ${companyDb}`);
    
    const response = await fetch('/api/sap/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        url: `${url}/Login`,
        body: { CompanyDB: companyDb, UserName: user, Password: pass }
      })
    });
    
    if (!response.ok) {
      let errValue = "Error Auth API";
      try { const err = await response.json(); errValue = err?.error?.message?.value || JSON.stringify(err); } catch(e) { }
      throw new Error(errValue);
    }
    
    const data = await response.json();
    set({ session: { url, companyDb, user, token: data.SessionId, isConnected: true, bplid: "1" } }); // Default BPLId to "1" until synched
  },

  disconnect: () => {
    set({ session: { url: "", companyDb: "", user: "", token: null, isConnected: false, bplid: null }, orders: [] });
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
      if (!session.url || !session.token) throw new Error("No hay sesi\u00f3n activa");

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          url: `${session.url}/BusinessPlaces?$filter=Disabled eq 'tNO'`,
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
    dateFrom: "2026-04-01",
    dateTo: "2026-04-30"
  },

  setFilters: (newFilters) => set((state) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    
    // Auto-fetch if dates change could be added here, leaving for "Consultar SBO" button manually
    
    // If BPLid changes, reset selection
    const resetSelection = newFilters.bplid !== undefined && newFilters.bplid !== state.filters.bplid;
    return { 
      filters: updatedFilters,
      selectedOrderEntry: resetSelection ? null : state.selectedOrderEntry,
      selectedSublines: resetSelection ? [] : state.selectedSublines
    };
  }),

  // Function to load the orders from the Service Layer with Pagination Support
  fetchOrders: async () => {
    const { session, filters, masterData } = get();
    const dateFrom = filters.dateFrom;
    const dateTo = filters.dateTo;
    
    const initialOdataQuery = `Orders()?$select=DocEntry,DocNum,DocType,DocDate,DocDueDate,TaxDate,CardCode,DocTotal,DocCurrency,DocRate,Reference1,Comments,JournalMemo,BPLName,Cancelled,DocumentStatus,DocumentLines&$filter=DocDate ge '${dateFrom}' and DocDate le '${dateTo}'`;
    console.log(`[Service Layer Request]: Initializing Extraction: ${initialOdataQuery}`);
    
    // Reset selection before extraction
    set({ selectedOrderEntry: null, selectedSublines: [] });

    try {
      if (!session.url || !session.token) throw new Error("No hay sesi\u00f3n para descargar transacciones");

      let allSapOrders: any[] = [];
      let currentPath = initialOdataQuery;
      let hasNextPage = true;

      // Loop to fetch paginated results using @odata.nextLink
      while (hasNextPage) {
        // Clean paths to prevent double slashes (e.g. /b1s/v2//Orders...)
        const cleanPath = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
        const baseUrl = session.url.endsWith('/') ? session.url.slice(0, -1) : session.url;
        const targetUrl = `${baseUrl}/${cleanPath}`;

        const response = await fetch('/api/sap/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'GET',
            url: targetUrl,
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
        cardName: sapOrder.CardCode, 
        docDate: sapOrder.DocDate,
        docDueDate: sapOrder.DocDueDate,
        currency: sapOrder.DocCurrency,
        totalNet: sapOrder.DocTotal,
        isCancelled: sapOrder.Cancelled === "tYES",
        documentStatus: sapOrder.DocumentStatus,
        comments: sapOrder.Comments,
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
          lineStatus: line.LineStatus
        }))
      }));

      set({ orders: mappedOrders });
    } catch(error: any) {
      console.error(error);
      alert(`Error extrayendo transacciones: ${error.message}`);
    }
  },

  orders: MOCK_ORDERS,
  selectedOrderEntry: null,
  selectedSublines: [],
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
    if (!session.url || !session.token) {
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
              url: `${session.url}/Orders(${docEntry})`,
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
              url: `${session.url}/Orders(${docEntry})/Close`,
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
    if (!session.url || !session.token) {
      alert("No hay sesión activa para facturar masivamente.");
      return;
    }

    set({ isProcessingBatch: true, batchProgress: { current: 0, total: batchSelectedOrders.length } });

    let successCount = 0;
    const errors: { docNum: number, error: string }[] = [];
    const today = new Date().toISOString().split('T')[0];
    const user = session.user || "UnknownUser";
    const comments = `Facturado masivamente desde Portal por ${user} el ${today}`;

    for (let i = 0; i < batchSelectedOrders.length; i++) {
       const docEntry = batchSelectedOrders[i];
       const order = state.orders.find(o => o.docEntry === docEntry);
       const docNum = order?.docNum || docEntry;
       
       set({ batchProgress: { current: i + 1, total: batchSelectedOrders.length } });

       try {
         if (!order) throw new Error("Datos de orden no encontrados en UI");

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
           DocumentLines: order.documentLines.map(l => ({
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
              url: `${session.url}/Invoices`,
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
      if (!session.url || !session.token) throw new Error("No hay sesión activa");
      
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
          url: `${session.url}/Orders(${docEntry})`,
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
          url: `${session.url}/Orders(${docEntry})/Close`,
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
      if (!session.url || !session.token) throw new Error("No hay sesión para facturar");

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
        DocumentLines: order.documentLines.map(l => ({
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
          url: `${session.url}/Invoices`,
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
      if (!session.url || !session.token) throw new Error("No hay sesi\u00f3n para facturar");

      const response = await fetch('/api/sap/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          url: `${session.url}/Invoices`,
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
  }
}));
