import Papa from 'papaparse';

// URL pública del CSV de Google Sheets que nos proporcionaste
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQM5NGaz772564dCgPxfeT9n7dfaMKoxYJd0yfHS9Icp4DW3B-EPDVABbxDU0sZYq0ao52lwcViU4Q-/pub?gid=677597020&single=true&output=csv";

// Interfaz sugerida basada en los campos de tu archivo
export interface GoogleSheetRow {
  CeCo?: string;
  "Doc venta"?: string;
  "Id Pipedrive"?: string;
  "Status Pipedrive"?: string;
  Cliente?: string;
  "Estado Proyecto"?: string;
  "Tipo proyecto"?: string;
  // Agrega los campos exactos que necesitas extraer
  [key: string]: any; 
}

/**
 * Función para ir a buscar los datos a Google Sheets y parsearlos a JSON
 */
export const fetchProjectStatusesFromSheets = async (): Promise<GoogleSheetRow[]> => {
  try {
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Error al conectar con Google Sheets: ${response.statusText}`);
    }
    
    // Obtenemos el texto plano en formato CSV
    const csvText = await response.text();
    
    // Usamos PapaParse para convertir el CSV a un Array de Objetos JSON.
    // Esto es vital porque tu CSV contiene comas dentro de los textos (ej: Direcciones)
    return new Promise((resolve, reject) => {
      Papa.parse<GoogleSheetRow>(csvText, {
        header: true,         // Usa la primera fila como nombres de variables
        skipEmptyLines: true, // Ignora filas vacías
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Hubo un problema sincronizando con Google Sheets:", error);
    throw error;
  }
};
