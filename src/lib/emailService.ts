import { PurchaseInvoice } from "../types";

export const sendNominaEmail = (invoices: PurchaseInvoice[]) => {
  if (invoices.length === 0) {
    alert("No hay facturas seleccionadas para enviar en la nómina.");
    return;
  }

  const hoy = new Date().toLocaleDateString('es-CL');
  const subject = encodeURIComponent(`Nómina de Pago Proveedores - ${hoy}`);
  
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.docTotal - inv.paidToDate), 0);

  let body = `Estimados,\n\nSe adjunta el detalle de la nómina de pagos a proveedores generada el ${hoy}.\n\n`;
  body += `Total a pagar: $${totalAmount.toLocaleString('es-CL')}\n`;
  body += `Cantidad de facturas: ${invoices.length}\n\n`;
  
  body += `DETALLE DE PAGOS:\n`;
  body += `------------------------------------------------------------\n`;
  
  invoices.forEach(inv => {
    const monto = inv.docTotal - inv.paidToDate;
    body += `- Proveedor: ${inv.cardName} (RUT: ${inv.cardCode})\n`;
    body += `  Factura Nro: ${inv.docNum}\n`;
    body += `  Monto a Pagar: $${monto.toLocaleString('es-CL')}\n`;
    body += `------------------------------------------------------------\n`;
  });
  
  body += `\nSaludos cordiales,\nSistema de Facturación y Pagos Copec Flux`;

  const encodedBody = encodeURIComponent(body);
  
  // Usar mailto para levantar el cliente de correo del usuario (Outlook)
  // De esta forma el usuario puede agregar el archivo TXT descargado de forma manual al correo
  window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
};
