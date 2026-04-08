import { useEffect, useState } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { FiDownload, FiPackage, FiSearch, FiFilter } from "react-icons/fi";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import { me } from "../services/authService";
import * as XLSX from "xlsx";

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
  stock: number;
  usage?: number;
}

const categories = [
  "Bolsas de Basura Negras",
  "Bolsas Transparente Recuperada",
  "Bolsas Camisetas",
  "Bolsas Virgen Transparente",
  "Bolsas PEAD de Alta Densidad",
  "Bolsas Recuperada de Color",
  "Bolsas con Impresión",
  "Bolsas de Lavandería",
  "Bolsas de Polipropileno",
  "Bolsas de Cubierto",
  "Bolsas de Papel Kraft o Blancas",
  "Productos de limpieza, aseo, cocina y higiene",
  "Vasos plásticos",
  "Vasos de Poli-papel",
  "Vasos Espumados",
  "Vasos PET",
  "Tapas",
  "Envases Bowl de Alimento",
  "Porta-colaciones o envases Plumavit",
  "Film",
  "Prepicados",
  "Guantes",
  "Utensilios y platos",
  "Brochetas",
  "Pocillos de Degustación",
  "Gorros y Cofias",
  "Productos de Protección y seguridad",
  "Envases contenedores de aluminio",
  "Blondas redondas, rectangulares y capsulas",
  "Servilletas",
  "Otros",
];

type AdjustMode = "add" | "sub";
type AdjustState = Record<number, { mode: AdjustMode; value: string }>;
type StockDraftState = Record<number, string | undefined>;

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [canEditStock, setCanEditStock] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [adjust, setAdjust] = useState<AdjustState>({});
  const [stockDrafts, setStockDrafts] = useState<StockDraftState>({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get<Product[]>("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const onFocus = () => fetchProducts();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    me().then(res => setCanEditStock(!!res.data.can_edit_stock)).catch(() => setCanEditStock(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchName = normalizeSearch(p.name).includes(normalizeSearch(search));
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchName && matchCategory;
  });

  const groupedProducts = filtered.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditCategory(p.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("");
  };

  const saveEdit = async (id: number) => {
    const name = editName.trim();
    if (!name || !editCategory) { alert("Nombre y categoría son requeridos"); return; }
    try {
      const resp = await api.put<Product>(`/products/${id}`, { name, category: editCategory });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setStockDrafts((prev) => ({ ...prev, [id]: undefined }));
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating product:", err?.response?.data || err?.message);
      alert(err?.response?.data?.error || "No se pudo actualizar el producto");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm("¿Eliminar este producto? Esta acción es permanente.")) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setAdjust((prev) => { const c = { ...prev }; delete c[id]; return c; });
      setStockDrafts((prev) => { const c = { ...prev }; delete c[id]; return c; });
    } catch (err: any) {
      console.error("Error deleting product:", err?.response?.data || err?.message);
      alert(err?.response?.data?.error || "No se pudo eliminar el producto");
    }
  };

  const beginAdjust = (id: number, mode: AdjustMode) => {
    setAdjust((prev) => ({ ...prev, [id]: { mode, value: "" } }));
  };

  const cancelAdjust = (id: number) => {
    setAdjust((prev) => { const c = { ...prev }; delete c[id]; return c; });
  };

  const commitAdjust = async (product: Product) => {
    const current = adjust[product.id];
    if (!current) return;
    const raw = current.value.replace(",", ".");
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) { cancelAdjust(product.id); return; }
    const delta = current.mode === "add" ? amount : -amount;
    try {
      const resp = await api.patch<Product>(`/products/${product.id}/stock`, { delta });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      setStockDrafts((prev) => ({ ...prev, [product.id]: undefined }));
    } catch (e) {
      console.error("No se pudo ajustar stock:", e);
      alert("No se pudo ajustar el stock");
    } finally {
      cancelAdjust(product.id);
    }
  };

  const setStockDraft = (id: number, value: string | undefined) => {
    setStockDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const commitSetStock = async (product: Product) => {
    const draft = stockDrafts[product.id];
    const valueStr = draft ?? String(product.stock ?? 0);
    const val = Number((valueStr || "").replace(",", "."));
    if (!Number.isFinite(val)) { setStockDraft(product.id, undefined); return; }
    try {
      const resp = await api.patch<Product>(`/products/${product.id}/stock`, { set: val });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      console.error("No se pudo fijar stock:", err);
      alert("No se pudo fijar el stock");
    } finally {
      setStockDraft(product.id, undefined);
    }
  };

  const totalProducts = filtered.length;
  const totalStock = filtered.reduce((sum, p) => sum + (p.stock ?? 0), 0);

  return (
    <div className="bg-[#0A0D13] text-white min-h-[100dvh]" style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }
        .font-ui { font-family: 'Barlow', sans-serif; }
        .font-mono { font-family: 'DM Mono', monospace; }

        .glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .glass-hover:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
        }

        .input-dark {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-dark::placeholder { color: rgba(255,255,255,0.2); }
        .input-dark:focus {
          outline: none;
          border-color: rgba(59,130,246,0.6);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
        }

        .select-dark {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          transition: border-color 0.15s;
        }
        .select-dark:focus {
          outline: none;
          border-color: rgba(59,130,246,0.5);
        }
        .select-dark option { background: #111827; color: white; }

        .stock-chip {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.04em;
        }

        .stock-ok { color: #34D399; }
        .stock-low { color: #FBBF24; }
        .stock-zero { color: #F87171; }

        .adj-btn {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.3);
          font-size: 15px; font-weight: 600;
          transition: all 0.15s;
          cursor: pointer;
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .adj-btn-sub:hover { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.4); color: #F87171; }
        .adj-btn-add:hover { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.4); color: #34D399; }

        icon-btn {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.3); /* Borde más visible */
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.8); /* Icono más blanco */
          transition: all 0.15s;
          cursor: pointer;
          flex-shrink: 0;
        }

        .icon-btn:hover { background: rgba(255,255,255,0.65); color: white; border-color: rgba(255,255,255,0.65); }
        .icon-btn-edit { color: #60A5FA; border-color: rgba(96,165,250,0.45); }
        .icon-btn-edit:hover { background: rgba(96,165,250,0.2); border-color: #60A5FA; }
        .icon-btn-del { color: #F87171; border-color: rgba(248,113,113,0.45); }
        .icon-btn-del:hover { background: rgba(248,113,113,0.2); border-color: #F87171; }
        .icon-btn-save { color: #34D399; border-color: rgba(52,211,153,0.25); }
        .icon-btn-save:hover { background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.4); }

        .cat-tag {
          display: inline-flex; align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(59,130,246,0.1);
          color: rgba(96,165,250,0.8);
          border: 1px solid rgba(59,130,246,0.15);
        }

        .cat-header {
          font-family: 'Barlow', sans-serif;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }

        .row-product {
          transition: background 0.12s;
        }
        .row-product:hover {
          background: rgba(255,255,255,0.025);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in 0.3s ease both; }

        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        .product-name {
          word-break: break-word;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.25;
          margin-right: 8px; /* Espacio para que el texto no toque los botones */
        }

        @media (max-width: 640px) {
          .min-h-\[100dvh\] {
            min-height: 100dvh;
          }
        }

      `}</style>

      <div className="max-w-5xl mx-auto px-4 pt-4 pb-20">

        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 fade-in">
          <div>
            <h1 className="font-ui text-3xl font-extrabold tracking-tight mb-1">
              Inventario
            </h1>
            <p className="text-sm text-white/30 font-mono">
              {loading ? "Cargando…" : `${totalProducts} productos · ${totalStock.toLocaleString("es-CL")} uds. en stock`}
            </p>
          </div>

          <button
            onClick={() => {
              const dataToExport = filtered.map((p) => ({
                "Nombre": p.name,
                "Categoría": p.category,
                "Stock": p.stock,
              }));
              const now = new Date().toLocaleString("es-CL", {
                timeZone: "America/Santiago",
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", hour12: false,
              });
              dataToExport.unshift({ "Nombre": "Generado el", "Categoría": now, "Stock": 0 });
              const ws = XLSX.utils.json_to_sheet(dataToExport);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Productos");
              XLSX.writeFile(wb, "listado_productos.xlsx");
            }}
            className="font-ui flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-300 transition-all duration-150 flex-shrink-0"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(52,211,153,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(52,211,153,0.08)")}
            title="Descargar Excel de productos"
            aria-label="Descargar Excel"
          >
            <FiDownload size={15} />
            <span>Exportar</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8 fade-in">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
              <FiSearch size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar producto..."
              className="input-dark font-ui w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
              <FiFilter size={14} />
            </span>
            <select
              className="select-dark font-ui w-full pl-9 pr-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-white/30 text-sm font-mono py-8">
            <div className="w-4 h-4 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
            Cargando productos…
          </div>
        )}

        {/* Empty state */}
        {!loading && categoryFilter && Object.keys(groupedProducts).length === 0 && (
          <div className="glass rounded-2xl p-12 text-center fade-in">
            <span className="mx-auto mb-3 text-white/15">
              <FiPackage size={32} />
            </span>
            <p className="text-white/30 text-sm font-ui">
              La categoría <span className="text-white/50">"{categoryFilter}"</span> está vacía.
            </p>
          </div>
        )}

        {/* Product groups */}
        {!loading && Object.keys(groupedProducts).map((category, gi) => (
          <div key={category} className="mb-6 fade-in" style={{ animationDelay: `${gi * 0.04}s` }}>

            {/* Category header */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="cat-header">{category}</span>
              <div className="flex-1 h-px bg-white/5" />
              <span className="font-mono text-xs text-white/20">{groupedProducts[category].length}</span>
            </div>

            {/* Rows */}
            <div className="glass rounded-2xl overflow-hidden">
              {groupedProducts[category].map((product, pi) => {
                const isEditing = editingId === product.id;
                const adj = adjust[product.id];
                const stockValue =
                  stockDrafts[product.id] !== undefined
                    ? stockDrafts[product.id]
                    : String(product.stock ?? 0);

                const stockNum = product.stock ?? 0;
                const stockColorClass = stockNum <= 0 ? "stock-zero" : stockNum < 20 ? "stock-low" : "stock-ok";

                return (
                  <div
                    key={product.id}
                    className={`row-product px-4 py-3 ${pi < groupedProducts[category].length - 1 ? "border-b border-white/[0.045]" : ""}`}
                  >
                    {!isEditing ? (
                      
                      <div className="flex flex-col gap-3 px-4 py-4 border-b border-white/[0.045] last:border-0">
                        {/* Nombre del producto */}
                        <div>
                          <span className="font-ui text-base font-medium text-white leading-tight block">
                            {product.name}
                          </span>
                        </div>

                          <div className="flex items-center justify-between gap-3">
                          {/* Stock controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canEditStock && (!adj || adj.mode !== "sub") && (
                              <button className="adj-btn adj-btn-sub" title="Restar" onClick={() => beginAdjust(product.id, "sub")}>−</button>
                            )}
                            {adj?.mode === "sub" && (
                              <input
                                autoFocus
                                inputMode="decimal"
                                type="number"
                                className="input-dark font-mono w-20 px-3 py-1.5 rounded-xl text-sm text-right"
                                value={adj.value}
                                onChange={(e) => setAdjust((prev) => ({ ...prev, [product.id]: { ...prev[product.id], value: e.target.value } }))}
                                onBlur={() => commitAdjust(product)}
                              />
                            )}

                            {canEditStock ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className={`input-dark font-mono w-24 px-3 py-1.5 rounded-xl text-sm text-right ${stockColorClass}`}
                                value={stockValue}
                                onChange={(e) => setStockDraft(product.id, e.target.value)}
                                onBlur={() => commitSetStock(product)}
                              />
                            ) : (
                              <span className={`stock-chip font-mono w-24 text-right inline-block ${stockColorClass}`}>
                                Stock: {stockValue}
                              </span>
                            )}

                            {canEditStock && (!adj || adj.mode !== "add") && (
                              <button className="adj-btn adj-btn-add" title="Sumar" onClick={() => beginAdjust(product.id, "add")}>+</button>
                            )}
                            {adj?.mode === "add" && (
                              <input
                                autoFocus
                                inputMode="decimal"
                                type="number"
                                className="input-dark font-mono w-20 px-3 py-1.5 rounded-xl text-sm text-right"
                                value={adj.value}
                                onChange={(e) => setAdjust((prev) => ({ ...prev, [product.id]: { ...prev[product.id], value: e.target.value } }))}
                                onBlur={() => commitAdjust(product)}
                              />
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button className="icon-btn icon-btn-edit" onClick={() => startEdit(product)}>
                              <FaRegEdit size={14} />
                            </button>
                            <button className="icon-btn icon-btn-del" onClick={() => deleteProduct(product.id)}>
                              <FaTrashAlt size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Edit mode ── */
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-dark font-ui flex-1 w-full px-3 py-2 rounded-xl text-sm"
                          placeholder="Nombre del producto"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="select-dark font-ui flex-1 w-full px-3 py-2 rounded-xl text-sm"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="icon-btn icon-btn-save" title="Guardar" aria-label="Guardar" onClick={() => saveEdit(product.id)}>
                            <FaSave size={13} />
                          </button>
                          <button className="icon-btn" title="Cancelar" aria-label="Cancelar" onClick={cancelEdit}>
                            <FaTimes size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default ProductList;