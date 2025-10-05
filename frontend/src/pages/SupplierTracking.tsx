// import { useEffect, useRef, useState, useCallback } from "react";
// import type { AxiosError } from "axios";
// import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
// import SupplierSelector from "../components/SupplierSelector";
// import ArrowBackButton from "../components/ArrowBackButton";
// import { api } from "../services/http";

// interface ReceiptSummary {
//   id: number;
//   orden: string;
//   supplier: string;
//   created_by: string;
//   fecha: string;
//   status: string;
//   productos: { nombre: string; cantidad: number; unidad: string }[];
// }

// interface Product {
//   id: number;
//   name: string;
//   category: string;
//   created_by: string;
//   stock: number;
// }

// type ProductoRow = { nombre: string; cantidad: number; unidad: string };
// type ApiError = { error?: string; details?: string };

// type SearchState = {
//   supplier: string;
//   order: string;
//   user: string;
//   date_from: string;
//   date_to: string;
// };

// const btnIcon =
//   "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
//   "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

// const SupplierTracking = () => {
//   const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(true);
//   const [page, setPage] = useState(1);
//   const [mensaje, setMensaje] = useState<string>("");
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [draft, setDraft] = useState<{
//     orden: string;
//     supplier: string;
//     status: string;
//     productos: ProductoRow[];
//   } | null>(null);
//   const [productNames, setProductNames] = useState<string[]>([]);
//   const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

//   const searchRef = useRef<SearchState>({
//     supplier: "",
//     order: "",
//     user: "",
//     date_from: "",
//     date_to: "",
//   });
//   const observer = useRef<IntersectionObserver | null>(null);
//   const lastReceiptRef = useRef<HTMLDivElement | null>(null);

//   const fetchProducts = async () => {
//     try {
//       const res = await api.get<Product[]>("/products");
//       setProductNames(res.data.map((p) => p.name));
//     } catch (err) {
//       console.error("Error fetching products:", err);
//       setMensaje("Error al cargar lista de productos");
//     }
//   };

//   const fetchReceipts = useCallback(
//     async (params: SearchState, pageNum: number, append: boolean = false) => {
//       setIsLoading(true);
//       try {
//         const response = await api.get<ReceiptSummary[]>("/receipts", {
//           params: { ...params, page: pageNum, limit: 10 },
//           headers: { "Cache-Control": "no-cache" },
//         });
//         const newReceipts = response.data;
//         setReceipts((prev) => (append ? [...prev, ...newReceipts] : newReceipts));
//         setHasMore(newReceipts.length === 10);
//         setMensaje("");
//       } catch (err) {
//         const error = err as AxiosError;
//         console.error("Error fetching receipts:", error.response?.data || error.message);
//         setMensaje("Error al cargar recepciones");
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     []
//   );

//   useEffect(() => {
//     fetchReceipts(searchRef.current, 1);
//     fetchProducts();
//     const onFocus = () => {
//       fetchReceipts(searchRef.current, 1);
//       fetchProducts();
//     };
//     window.addEventListener("focus", onFocus);
//     return () => window.removeEventListener("focus", onFocus);
//   }, [fetchReceipts]);

//   useEffect(() => {
//     if (isLoading || !hasMore) return;

//     observer.current = new IntersectionObserver(
//       (entries) => {
//         if (entries[0].isIntersecting) {
//           setPage((prev) => prev + 1);
//         }
//       },
//       { threshold: 0.1 }
//     );

//     if (lastReceiptRef.current) {
//       observer.current.observe(lastReceiptRef.current);
//     }

//     return () => {
//       if (observer.current) {
//         observer.current.disconnect();
//       }
//     };
//   }, [isLoading, hasMore]);

//   useEffect(() => {
//     if (page > 1) {
//       fetchReceipts(searchRef.current, page, true);
//     }
//   }, [page, fetchReceipts]);

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     searchRef.current = { ...searchRef.current, [e.target.name]: e.target.value };
//     setPage(1);
//     fetchReceipts(searchRef.current, 1);
//   };

//   const handleSearchSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setPage(1);
//     fetchReceipts(searchRef.current, 1);
//   };

//   const startEditRow = (r: ReceiptSummary) => {
//     setEditingId(r.id);
//     setDraft({
//       orden: r.orden,
//       supplier: r.supplier,
//       status: r.status || "pendiente",
//       productos: r.productos.map((p) => ({ ...p })),
//     });
//   };

//   const cancelEditRow = () => {
//     setEditingId(null);
//     setDraft(null);
//     setSuggestions({});
//   };

//   const saveEditRow = async () => {
//     if (!draft || !editingId) return;
//     setIsLoading(true);
//     try {
//       const payload = {
//         orden: draft.orden,
//         supplier: draft.supplier,
//         productos: draft.productos.map((p) => ({
//           nombre: p.nombre,
//           cantidad: p.cantidad,
//           unidad: p.unidad,
//         })),
//       };
//       const response = await api.put<ReceiptSummary>(`/receipts/${editingId}`, payload);
//       const updated = response.data;
//       setReceipts((prev) =>
//         prev.map((r) => (r.id === editingId ? { ...r, ...updated } : r))
//       );
//       setMensaje("Recepción actualizada correctamente");
//       cancelEditRow();
//     } catch (err) {
//       const error = err as AxiosError<ApiError>;
//       console.error("Error al actualizar recepción:", error.response?.data || error.message);
//       alert(error.response?.data?.error || "No se pudo actualizar la recepción");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const deleteRow = async (id: number) => {
//     if (!window.confirm("¿Eliminar esta recepción? Esta acción es permanente y revertirá el stock.")) return;
//     setIsLoading(true);
//     try {
//       await api.delete(`/receipts/${id}`);
//       setReceipts((prev) => prev.filter((r) => r.id !== id));
//       if (editingId === id) cancelEditRow();
//       setMensaje("Recepción eliminada y stock revertido");
//     } catch (err) {
//       const error = err as AxiosError<ApiError>;
//       console.error("Error eliminando recepción:", error.response?.data || error.message);
//       alert(error.response?.data?.error || "No se pudo eliminar la recepción");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const addRow = () => {
//     if (!draft) return;
//     setDraft({
//       ...draft,
//       productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades" }],
//     });
//   };

//   const removeRow = (idx: number) => {
//     if (!draft) return;
//     setDraft({
//       ...draft,
//       productos: draft.productos.filter((_, i) => i !== idx),
//     });
//     setSuggestions((prev) => {
//       const copy = { ...prev };
//       delete copy[idx];
//       return copy;
//     });
//   };

//   const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
//     if (!draft) return;
//     setDraft({
//       ...draft,
//       productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
//     });
//   };

//   const humanStatus = (s: string) => {
//     return s.charAt(0).toUpperCase() + s.slice(1);
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6">
//       <div className="mb-12">
//         <ArrowBackButton />
//       </div>
//       <h2 className="text-xl font-bold mb-4">Seguimiento de Recepciones</h2>
//       {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

//       <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
//         <input
//           name="supplier"
//           value={searchRef.current.supplier}
//           onChange={handleSearchChange}
//           placeholder="Buscar por nombre del proveedor"
//           className="w-full border p-2 rounded"
//         />
//         <input
//           name="order"
//           value={searchRef.current.order}
//           onChange={handleSearchChange}
//           placeholder="Buscar por número de factura"
//           className="w-full border p-2 rounded"
//         />
//         <input
//           name="user"
//           value={searchRef.current.user}
//           onChange={handleSearchChange}
//           placeholder="Buscar por usuario que creó"
//           className="w-full border p-2 rounded"
//         />
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           <div>
//             <label className="block text-sm text-gray-300 mb-1">Desde</label>
//             <input
//               name="date_from"
//               type="date"
//               value={searchRef.current.date_from}
//               onChange={handleSearchChange}
//               className="w-full border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label className="block text-sm text-gray-300 mb-1">Hasta</label>
//             <input
//               name="date_to"
//               type="date"
//               value={searchRef.current.date_to}
//               onChange={handleSearchChange}
//               className="w-full border p-2 rounded"
//             />
//           </div>
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
//           disabled={isLoading}
//         >
//           Buscar
//         </button>
//       </form>

//       {isLoading && receipts.length === 0 ? (
//         <div className="text-center py-8">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
//           <p className="mt-2 text-gray-400">Cargando recepciones...</p>
//         </div>
//       ) : receipts.length === 0 ? (
//         <p className="text-center text-gray-400 py-8">No se encontraron recepciones.</p>
//       ) : (
//         <div className="space-y-4">
//           {receipts.map((r, index) => {
//             const isEditingRow = editingId === r.id;
//             const refProp = index === receipts.length - 1 ? { ref: lastReceiptRef } : {};

//             return (
//               <div key={r.id} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
//                 <div className="flex items-start justify-between gap-4">
//                   {!isEditingRow ? (
//                     <div>
//                       <p><strong>Orden:</strong> {r.orden}</p>
//                       <p><strong>Proveedor:</strong> {r.supplier}</p>
//                       <p><strong>Ingresado por:</strong> {r.created_by}</p>
//                       <p><strong>Fecha:</strong> {new Date(r.fecha).toLocaleString()}</p>
//                       <p><strong>Estado:</strong> {humanStatus(r.status)}</p>
//                     </div>
//                   ) : (
//                     <div className="w-full">
//                       <div className="grid sm:grid-cols-2 gap-3">
//                         <div>
//                           <label className="block text-sm mb-1">Orden</label>
//                           <input
//                             value={draft?.orden || ""}
//                             onChange={(e) => setDraft((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
//                             className="w-full border p-2 rounded"
//                           />
//                         </div>
//                         <div>
//                           <label className="block text-sm mb-1">Proveedor</label>
//                           <SupplierSelector
//                             value={draft?.supplier || ""}
//                             onChange={(supplier) => setDraft((prev) => (prev ? { ...prev, supplier } : prev))}
//                           />
//                         </div>
//                         <div>
//                           <label className="block text-sm mb-1">Estado</label>
//                           <select
//                             value={draft?.status || "pendiente"}
//                             onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
//                             className="w-full border p-2 rounded"
//                           >
//                             <option value="pendiente">Pendiente</option>
//                             <option value="completado">Completado</option>
//                             <option value="cancelado">Cancelado</option>
//                           </select>
//                         </div>
//                       </div>
//                       <div className="mt-4">
//                         <div className="flex items-center justify-between mb-2">
//                           <h4 className="font-bold">Productos</h4>
//                           <button
//                             className={`${btnIcon} hover:bg-blue-600`}
//                             onClick={addRow}
//                             title="Agregar producto"
//                             aria-label="Agregar producto"
//                           >
//                             <FiPlus size={18} />
//                           </button>
//                         </div>
//                         <div className="space-y-2">
//                           {draft?.productos.map((row, idx) => (
//                             <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
//                               <div className="relative sm:col-span-6">
//                                 <input
//                                   className="border p-2 rounded w-full"
//                                   placeholder="Nombre del producto"
//                                   value={row.nombre}
//                                   onChange={(e) => {
//                                     const value = e.target.value;
//                                     updateRow(idx, { nombre: value });
//                                     if (value) {
//                                       const filtered = productNames.filter((n) =>
//                                         n.toLowerCase().includes(value.toLowerCase())
//                                       );
//                                       setSuggestions((prev) => ({ ...prev, [idx]: filtered }));
//                                     } else {
//                                       setSuggestions((prev) => ({ ...prev, [idx]: [] }));
//                                     }
//                                   }}
//                                   onBlur={() => setSuggestions((prev) => ({ ...prev, [idx]: [] }))}
//                                 />
//                                 {suggestions[idx]?.length > 0 && (
//                                   <ul className="absolute z-10 bg-neutral-800 border border-gray-600 rounded mt-1 w-full max-h-40 overflow-auto text-white">
//                                     {suggestions[idx].map((sug, i) => (
//                                       <li
//                                         key={i}
//                                         className="p-2 hover:bg-neutral-700 cursor-pointer"
//                                         onMouseDown={() => {
//                                           updateRow(idx, { nombre: sug });
//                                           setSuggestions((prev) => ({ ...prev, [idx]: [] }));
//                                         }}
//                                       >
//                                         {sug}
//                                       </li>
//                                     ))}
//                                   </ul>
//                                 )}
//                               </div>
//                               <input
//                                 type="number"
//                                 className="border p-2 rounded sm:col-span-2"
//                                 placeholder="Cantidad"
//                                 value={row.cantidad}
//                                 onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })}
//                               />
//                               <select
//                                 className="border p-2 rounded sm:col-span-3"
//                                 value={row.unidad}
//                                 onChange={(e) => updateRow(idx, { unidad: e.target.value })}
//                               >
//                                 <option value="unidades">Unidades</option>
//                                 <option value="kg">Kilogramos</option>
//                                 <option value="lt">Litros</option>
//                                 <option value="cajas">Cajas</option>
//                                 <option value="PQT">Paquetes</option>
//                               </select>
//                               <div className="sm:col-span-1 flex justify-end">
//                                 <button
//                                   className={`${btnIcon} hover:bg-red-600`}
//                                   title="Quitar"
//                                   aria-label="Quitar"
//                                   onClick={() => removeRow(idx)}
//                                 >
//                                   <FiMinus size={18} />
//                                 </button>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                   <div className="flex flex-wrap items-center gap-2">
//                     {!isEditingRow ? (
//                       <>
//                         <button
//                           className={`${btnIcon} hover:bg-blue-600`}
//                           title="Editar"
//                           aria-label="Editar"
//                           onClick={() => startEditRow(r)}
//                         >
//                           <FiEdit2 size={18} />
//                         </button>
//                         <button
//                           className={`${btnIcon} hover:bg-red-600`}
//                           title="Eliminar"
//                           aria-label="Eliminar"
//                           onClick={() => deleteRow(r.id)}
//                         >
//                           <FiTrash2 size={18} />
//                         </button>
//                       </>
//                     ) : (
//                       <>
//                         <button
//                           className={`${btnIcon} hover:bg-emerald-600`}
//                           title="Guardar"
//                           aria-label="Guardar"
//                           onClick={saveEditRow}
//                         >
//                           <FiSave size={18} />
//                         </button>
//                         <button
//                           className={`${btnIcon} hover:bg-gray-600`}
//                           title="Cancelar"
//                           aria-label="Cancelar"
//                           onClick={cancelEditRow}
//                         >
//                           <FiX size={18} />
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>
//                 {!isEditingRow && (
//                   <>
//                     <p className="mt-3"><strong>Productos:</strong></p>
//                     <ul className="list-disc pl-5">
//                       {r.productos.map((p, i) => (
//                         <li key={i}>
//                           {p.nombre} - {p.cantidad} {p.unidad}
//                         </li>
//                       ))}
//                     </ul>
//                   </>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//       {hasMore && !isLoading && (
//         <div className="text-center mt-6">
//           <button
//             onClick={() => setPage((prev) => prev + 1)}
//             className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//           >
//             Cargar más
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SupplierTracking;



import { useEffect, useRef, useState, useCallback } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import SupplierSelector from "../components/SupplierSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface ReceiptSummary {
  id: number;
  orden: string;
  supplier: string;
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
  stock: number;
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string };
type ApiError = { error?: string; details?: string };

type SearchState = {
  supplier: string;
  order: string;
  user: string;
  date_from: string;
  date_to: string;
};

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const SupplierTracking = () => {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    supplier: string;
    status: string;
    productos: ProductoRow[];
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

  const searchRef = useRef<SearchState>({
    supplier: "",
    order: "",
    user: "",
    date_from: "",
    date_to: "",
  });
  const observer = useRef<IntersectionObserver | null>(null);
  const lastReceiptRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchReceipts = useCallback(
    async (params: SearchState, pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      try {
        const response = await api.get<ReceiptSummary[]>("/receipts", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
        });
        const newReceipts = response.data;
        setReceipts((prev) => (append ? [...prev, ...newReceipts] : newReceipts));
        setHasMore(newReceipts.length === 10);
        setMensaje("");
      } catch (err) {
        const error = err as AxiosError;
        console.error("Error fetching receipts:", error.response?.data || error.message);
        setMensaje("Error al cargar recepciones");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchReceipts(searchRef.current, 1);
    fetchProducts();
    const onFocus = () => {
      fetchReceipts(searchRef.current, 1);
      fetchProducts();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchReceipts]);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (lastReceiptRef.current) {
      observer.current.observe(lastReceiptRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchReceipts(searchRef.current, page, true);
    }
  }, [page, fetchReceipts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    searchRef.current = { ...searchRef.current, [e.target.name]: e.target.value };
    setPage(1);
    fetchReceipts(searchRef.current, 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts(searchRef.current, 1);
  };

  const startEditRow = (r: ReceiptSummary) => {
    setEditingId(r.id);
    setDraft({
      orden: r.orden,
      supplier: r.supplier,
      status: r.status || "pendiente",
      productos: r.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
  };

  const saveEditRow = async () => {
    if (!draft || !editingId) return;
    setIsLoading(true);
    try {
      const payload = {
        orden: draft.orden,
        supplier: draft.supplier,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      const response = await api.put<ReceiptSummary>(`/receipts/${editingId}`, payload);
      const updated = response.data;
      setReceipts((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...updated } : r))
      );
      setMensaje("Recepción actualizada correctamente");
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error al actualizar recepción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar la recepción");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar esta recepción? Esta acción es permanente y revertirá el stock.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Recepción eliminada y stock revertido");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando recepción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar la recepción");
    } finally {
      setIsLoading(false);
    }
  };

  const addRow = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades" }],
    });
  };

  const removeRow = (idx: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: draft.productos.filter((_, i) => i !== idx),
    });
    setSuggestions((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const humanStatus = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Seguimiento de Recepciones</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="supplier"
          value={searchRef.current.supplier}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del proveedor"
          className="w-full border p-2 rounded"
        />
        <input
          name="order"
          value={searchRef.current.order}
          onChange={handleSearchChange}
          placeholder="Buscar por número de factura"
          className="w-full border p-2 rounded"
        />
        <input
          name="user"
          value={searchRef.current.user}
          onChange={handleSearchChange}
          placeholder="Buscar por usuario que creó"
          className="w-full border p-2 rounded"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Desde</label>
            <input
              name="date_from"
              type="date"
              value={searchRef.current.date_from}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Hasta</label>
            <input
              name="date_to"
              type="date"
              value={searchRef.current.date_to}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
          disabled={isLoading}
        >
          Buscar
        </button>
      </form>

      {isLoading && receipts.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Cargando recepciones...</p>
        </div>
      ) : receipts.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No se encontraron recepciones.</p>
      ) : (
        <div className="space-y-4">
          {receipts.map((r, index) => {
            const isEditingRow = editingId === r.id;
            const refProp = index === receipts.length - 1 ? { ref: lastReceiptRef } : {};

            return (
              <div key={r.id} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
                <div className="flex items-start justify-between gap-4">
                  {!isEditingRow ? (
                    <div>
                      <p><strong>Orden:</strong> {r.orden}</p>
                      <p><strong>Proveedor:</strong> {r.supplier}</p>
                      <p><strong>Ingresado por:</strong> {r.created_by}</p>
                      <p><strong>Fecha:</strong> {new Date(r.fecha).toLocaleString()}</p>
                      <p><strong>Estado:</strong> {humanStatus(r.status)}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Orden</label>
                          <input
                            value={draft?.orden || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Proveedor</label>
                          <SupplierSelector
                            value={draft?.supplier || ""}
                            onChange={(supplier) => setDraft((prev) => (prev ? { ...prev, supplier } : prev))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Estado</label>
                          <select
                            value={draft?.status || "pendiente"}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="completado">Completado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold">Productos</h4>
                          <button
                            className={`${btnIcon} hover:bg-blue-600`}
                            onClick={addRow}
                            title="Agregar producto"
                            aria-label="Agregar producto"
                          >
                            <FiPlus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft?.productos.map((row, idx) => (
                            <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
                              <div className="relative sm:col-span-6">
                                <input
                                  className="border p-2 rounded w-full"
                                  placeholder="Nombre del producto"
                                  value={row.nombre}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateRow(idx, { nombre: value });
                                    if (value) {
                                      const filtered = productNames.filter((n) =>
                                        n.toLowerCase().includes(value.toLowerCase())
                                      );
                                      setSuggestions((prev) => ({ ...prev, [idx]: filtered }));
                                    } else {
                                      setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                    }
                                  }}
                                  onBlur={() => setSuggestions((prev) => ({ ...prev, [idx]: [] }))}
                                />
                                {suggestions[idx]?.length > 0 && (
                                  <ul className="absolute z-10 bg-neutral-800 border border-gray-600 rounded mt-1 w-full max-h-40 overflow-auto touch-action-auto text-white">
                                    {suggestions[idx].map((sug, i) => (
                                      <li
                                        key={i}
                                        className="p-2 hover:bg-neutral-700 cursor-pointer"
                                        onMouseDown={() => {
                                          updateRow(idx, { nombre: sug });
                                          setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                        }}
                                      >
                                        {sug}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <input
                                type="number"
                                className="border p-2 rounded sm:col-span-2"
                                placeholder="Cantidad"
                                value={row.cantidad}
                                onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                              />
                              <select
                                className="border p-2 rounded sm:col-span-3"
                                value={row.unidad}
                                onChange={(e) => updateRow(idx, { unidad: e.target.value })}
                              >
                                <option value="unidades">Unidades</option>
                                <option value="kg">Kilogramos</option>
                                <option value="lt">Litros</option>
                                <option value="cajas">Cajas</option>
                                <option value="PQT">Paquetes</option>
                              </select>
                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  className={`${btnIcon} hover:bg-red-600`}
                                  title="Quitar"
                                  aria-label="Quitar"
                                  onClick={() => removeRow(idx)}
                                >
                                  <FiMinus size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditingRow ? (
                      <>
                        <button
                          className={`${btnIcon} hover:bg-blue-600`}
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => startEditRow(r)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-red-600`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteRow(r.id)}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={`${btnIcon} hover:bg-emerald-600`}
                          title="Guardar"
                          aria-label="Guardar"
                          onClick={saveEditRow}
                        >
                          <FiSave size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-gray-600`}
                          title="Cancelar"
                          aria-label="Cancelar"
                          onClick={cancelEditRow}
                        >
                          <FiX size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!isEditingRow && (
                  <>
                    <p className="mt-3"><strong>Productos:</strong></p>
                    <ul className="list-disc pl-5">
                      {r.productos.map((p, i) => (
                        <li key={i}>
                          {p.nombre} - {p.cantidad} {p.unidad}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hasMore && !isLoading && (
        <div className="text-center mt-6">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierTracking;