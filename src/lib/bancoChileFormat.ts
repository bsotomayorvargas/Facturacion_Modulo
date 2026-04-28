import { PurchaseInvoice } from "../types";

export const padRight = (str: string, length: number, char = ' ') => {
  if (!str) return char.repeat(length);
  return str.substring(0, length).padEnd(length, char);
};

export const padLeft = (str: string, length: number, char = '0') => {
  if (!str) return char.repeat(length);
  return str.toString().substring(0, length).padStart(length, char);
};

const formatRut = (rut: string) => {
  // Limpia puntos y guion, retorna hasta 10 chars
  const clean = String(rut).replace(/[^0-9Kk]/g, '').toUpperCase();
  return padLeft(clean, 10, '0');
};

const formatMonto = (amount: number) => {
  // 16 chars numéricos
  return padLeft(amount.toString(), 16, '0');
};

export const generateBancoChileTxt = (invoices: PurchaseInvoice[], nominaId: string = '') => {
  const lineLength = 400;
  const hoy = new Date();
  const fechaStr = hoy.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Usamos el ID de la nómina para la glosa de la cabecera. Esto es clave para que el Banco lo devuelva en la cartola.
  const descripcion = `'${nominaId || 'Nómina ' + fechaStr}'`.substring(0, 22);
  const rutEmpresa = formatRut("76172285-9"); // Copec Flux
  const convenio = "01662"; // Segun TXT base

  // Total monto
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.docTotal - inv.paidToDate), 0);

  let output = "";

  // 1. CABECERA
  let header = "01";
  header += rutEmpresa;
  header += "002"; // Código adicional?
  header += convenio;
  header += padRight(descripcion, 22, ' ');
  header += "01";
  header += fechaStr;
  header += padLeft(totalAmount.toString(), 13, '0');
  header += "   N";
  
  // Padding para llegar a 396
  header = padRight(header, 396, ' ');
  // Correlativo cabecera
  header += "0201";
  
  output += padRight(header, lineLength, ' ') + "\n";

  // 2. DETALLE
  invoices.forEach((inv, index) => {
    const correlativo = padLeft((index + 1).toString(), 6, '0');
    let detalle = "02";
    detalle += rutEmpresa;
    detalle += "002  "; 
    detalle += convenio;
    detalle += "070";
    
    // RUT Proveedor (10 chars)
    detalle += formatRut(inv.cardCode.replace('P', '')); // asumiendo que cardcode es Prut
    
    // Nombre Proveedor (51 chars)
    detalle += padRight(inv.cardName, 51, ' ');
    
    // Dirección (36 chars) -> Mock para cumplir estructura
    detalle += padRight("Avenida Providencia 1234", 36, ' ');
    
    // Comuna (15 chars)
    detalle += padRight("SANTIAGO", 15, ' ');
    
    // Ciudad (22 chars)
    detalle += padRight("SANTIAGO", 22, ' ');
    
    // Cuenta Bancaria (27 chars) -> Mock para cumplir estructura, o sacar de inv.reference
    const cuenta = inv.reference ? inv.reference : "B100000000000";
    detalle += padRight(cuenta, 27, ' ');
    
    // Monto (16 chars)
    const monto = inv.docTotal - inv.paidToDate;
    detalle += formatMonto(monto);
    
    // Padding hasta posición de "Referencia"
    detalle = padRight(detalle, 319, ' ');
    detalle += "0000N";
    
    // Referencia / Factura (14 chars)
    detalle += padRight(inv.docNum.toString(), 14, ' ');
    
    // Correlativo y N final
    detalle = padRight(detalle, 338, ' ');
    detalle += `+${correlativo}N`;
    
    // Rellenar hasta 400
    detalle = padRight(detalle, lineLength, ' ');
    output += detalle + "\n";
  });

  return output;
};

export const downloadTxt = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
};
