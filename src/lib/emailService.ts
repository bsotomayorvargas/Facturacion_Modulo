import { PurchaseInvoice } from "../types";

export const sendNominaEmail = async (invoices: PurchaseInvoice[]) => {
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

  const emailDestino = prompt("Ingrese el correo donde desea recibir la nómina de pago (para pruebas):", "cdg@fluxsolar.cl");
  if (!emailDestino) return;

  try {
    const response = await fetch('/api/email/nomina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: decodeURIComponent(subject),
        body: body,
        destinatario: emailDestino
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      alert(`Error enviando correo: ${errorData.error || 'Desconocido'}`);
      console.error("Error enviando nómina:", errorData);
    } else {
      alert("✅ ¡Correo de nómina enviado exitosamente a " + emailDestino + "!");
    }
  } catch (error) {
    console.error("Error de red al intentar enviar nómina:", error);
    alert("Error de red al intentar enviar el correo de nómina.");
  }
};

export const sendFacturacionEmail = async (docNum: number | string, projectName: string, totalAmount: number, clientName: string, comments: string, isBatch: boolean = false) => {
  const destinatario = "cdg@fluxsolar.cl";
  
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docNum,
        projectName,
        totalAmount,
        clientName,
        comments,
        isBatch,
        destinatario
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error enviando correo de facturación:", errorData);
    } else {
      console.log("Correo de facturación enviado exitosamente a", destinatario);
    }
  } catch (error) {
    console.error("Error de red al intentar enviar el correo:", error);
  }
};
