import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatters
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  
  // If already DD-MM-YYYY or DD/MM/YYYY, enforce slashes
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateString)) {
    return dateString.replace(/-/g, '/');
  }

  // Handle SAP YYYY-MM-DD
  const dateParts = dateString.split('T')[0].split('-');
  if (dateParts.length === 3 && dateParts[0].length === 4) {
    const [y, m, d] = dateParts;
    return `${d}/${m}/${y}`;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  
  return `${d}/${m}/${y}`;
};

export const parseDateToSAP = (displayDate: string) => {
  if (!displayDate) return "";
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
  
  // Try DD-MM-YYYY
  const parts = displayDate.split('-');
  if (parts.length === 3) {
    // If first part is 4 digits, it's YYYY-MM-DD already
    if (parts[0].length === 4) return displayDate;
    // Otherwise assume DD-MM-YYYY
    const [d, m, y] = parts;
    return `${y}-${m}-${d}`;
  }
  
  // Try DD/MM/YYYY
  const partsSlash = displayDate.split('/');
  if (partsSlash.length === 3) {
    const [d, m, y] = partsSlash;
    return `${y}-${m}-${d}`;
  }

  return displayDate;
};
