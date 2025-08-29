import { useEffect, useState } from "react";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
  stock: number;
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

  // NUEVO: filtro por categoría ("" = todas)
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Ajuste +/- por producto
  const [adjust, setAdjust] = useState<AdjustState>({});
  // Draft del input de "fijar stock"
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

  // FILTRADO: por nombre + (opcional) por categoría
  const filtered = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase());
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
    if (!name || !editCategory) {
      alert("Nombre y categoría son requeridos");
      return;
    }
    try {
      const resp = await api.put<Product>(`/products/${id}`, {
        name,
        category: editCategory,
      });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      // Alinear draft visible si estaba abierto
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
      // Limpiar estados asociados
      setAdjust((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setStockDrafts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err: any) {
      console.error("Error deleting product:", err?.response?.data || err?.message);
      alert(err?.response?.data?.error || "No se pudo eliminar el producto");
    }
  };

  // ----- Ajustes de stock (+/- con input y Enter) -----

  const beginAdjust = (id: number, mode: AdjustMode) => {
    setAdjust((prev) => ({ ...prev, [id]: { mode, value: "" } }));
  };

  const cancelAdjust = (id: number) => {
    setAdjust((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const commitAdjust = async (product: Product) => {
    const current = adjust[product.id];
    if (!current) return;

    const raw = current.value.replace(",", ".");
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      cancelAdjust(product.id);
      return;
    }

    const delta = current.mode === "add" ? amount : -amount;

    try {
      const resp = await api.patch<Product>(`/products/${product.id}/stock`, { delta });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      // Alinear input de stock total con el valor más reciente
      setStockDrafts((prev) => ({ ...prev, [product.id]: undefined }));
    } catch (e) {
      console.error("No se pudo ajustar stock:", e);
      alert("No se pudo ajustar el stock");
    } finally {
      cancelAdjust(product.id);
    }
  };

  // ----- Fijar stock directo (input controlado) -----

  const setStockDraft = (id: number, value: string | undefined) => {
    setStockDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const commitSetStock = async (product: Product) => {
    const draft = stockDrafts[product.id];
    const valueStr = draft ?? String(product.stock ?? 0);
    const val = Number((valueStr || "").replace(",", "."));
    if (!Number.isFinite(val)) {
      // resetear a estado "siguiendo" el store
      setStockDraft(product.id, undefined);
      return;
    }
    try {
      const resp = await api.patch<Product>(`/products/${product.id}/stock`, { set: val });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      console.error("No se pudo fijar stock:", err);
      alert("No se pudo fijar el stock");
    } finally {
      // Al terminar, el input vuelve a seguir el valor del store
      setStockDraft(product.id, undefined);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-2xl font-semibold mb-4">Listado de Productos</h2>

      <input
        type="text"
        placeholder="Buscar producto..."
        className="border p-2 rounded w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* NUEVO: selector de categoría (opcional) */}
      <select
        className="border p-2 rounded w-full mb-6"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        aria-label="Filtrar por categoría"
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-gray-500 mb-2">Cargando...</p>}

      {/* Si hay categoría seleccionada y no hay productos, mostrar mensaje */}
      {categoryFilter && Object.keys(groupedProducts).length === 0 ? (
        <p className="text-sm text-gray-400">
          La categoría “{categoryFilter}” está vacía.
        </p>
      ) : (
        Object.keys(groupedProducts).map((category) => (
          <div key={category} className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-500">{category}</h3>
            <ul className="space-y-2">
              {groupedProducts[category].map((product) => {
                const isEditing = editingId === product.id;
                const adj = adjust[product.id];

                // valor mostrado en el input de stock (controlado)
                const stockValue =
                  stockDrafts[product.id] !== undefined
                    ? stockDrafts[product.id]
                    : String(product.stock ?? 0);

                return (
                  <li
                    key={product.id}
                    className="border p-3 rounded shadow flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      {!isEditing ? (
                        <>
                          <strong>{product.name}</strong>
                          <div className="mt-1 text-sm text-gray-300">
                            Stock: <span className="font-semibold">{product.stock ?? 0}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border p-2 rounded w-full sm:w-1/2"
                            placeholder="Nombre del producto"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="border p-2 rounded w-full sm:w-1/2"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Controles de stock */}
                    <div className="flex items-center gap-2 mr-3">
                      {/* Botón "-" o input para restar */}
                      {!adj || adj.mode !== "sub" ? (
                        <button
                          className="px-2 py-1 rounded border border-gray-600 text-white hover:text-red-300"
                          title="Restar"
                          onClick={() => beginAdjust(product.id, "sub")}
                        >
                          -
                        </button>
                      ) : (
                        <input
                          autoFocus
                          inputMode="decimal"
                          type="number"
                          min={0}
                          step="any"
                          className="w-20 border p-1 rounded bg-white/5 border-white/10 text-right"
                          placeholder="cant."
                          value={adj.value}
                          onChange={(e) =>
                            setAdjust((prev) => ({
                              ...prev,
                              [product.id]: { ...prev[product.id], value: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitAdjust(product);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelAdjust(product.id);
                            }
                          }}
                          onBlur={() => commitAdjust(product)}
                        />
                      )}

                      {/* Botón "+" o input para sumar */}
                      {!adj || adj.mode !== "add" ? (
                        <button
                          className="px-2 py-1 rounded border border-gray-600 text-white hover:text-emerald-300"
                          title="Sumar"
                          onClick={() => beginAdjust(product.id, "add")}
                        >
                          +
                        </button>
                      ) : (
                        <input
                          autoFocus
                          inputMode="decimal"
                          type="number"
                          min={0}
                          step="any"
                          className="w-20 border p-1 rounded bg-white/5 border-white/10 text-right"
                          placeholder="cant."
                          value={adj.value}
                          onChange={(e) =>
                            setAdjust((prev) => ({
                              ...prev,
                              [product.id]: { ...prev[product.id], value: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitAdjust(product);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelAdjust(product.id);
                            }
                          }}
                          onBlur={() => commitAdjust(product)}
                        />
                      )}

                      {/* Set directo del stock total (controlado) */}
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-24 border p-1 rounded bg-white/5 border-white/10 text-right"
                        value={stockValue}
                        onFocus={() => setStockDraft(product.id, String(product.stock ?? 0))}
                        onChange={(e) => setStockDraft(product.id, e.target.value)}
                        onBlur={() => commitSetStock(product)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitSetStock(product);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            // cancelar y volver a seguir el store
                            setStockDraft(product.id, undefined);
                          }
                        }}
                        title="Escribe un valor total y presiona Enter o sal del campo para fijar stock"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <button
                            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
                            title="Editar"
                            aria-label="Editar"
                            onClick={() => startEdit(product)}
                          >
                            <FaRegEdit size={16} />
                          </button>
                          <button
                            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <FaTrashAlt size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-emerald-300"
                            title="Guardar"
                            aria-label="Guardar"
                            onClick={() => saveEdit(product.id)}
                          >
                            <FaSave size={16} />
                          </button>
                          <button
                            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-gray-300"
                            title="Cancelar"
                            aria-label="Cancelar"
                            onClick={cancelEdit}
                          >
                            <FaTimes size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default ProductList;