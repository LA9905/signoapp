// src/services/printService.ts
import { api } from "./http";

// Abre/descarga PDF del despacho. Usa `inline=1` para abrir en el navegador.
export const getDispatchPdf = async (dispatchId: number, inline = false) => {
  const res = await api.get(`/print/${dispatchId}`, {
    params: { inline: inline ? "1" : "0" },
    responseType: "blob",
  });
  return res.data; // Blob
};

// Helper para abrir en nueva pestaña
export const openDispatchPdf = async (dispatchId: number, inline = true) => {
  const blob = await getDispatchPdf(dispatchId, inline);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
