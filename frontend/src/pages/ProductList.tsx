import { useEffect, useState } from "react";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { api } from "../services/http";

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
  stock: number; // NUEVO
}

const categories = [
  "Bolsas Negras",
  "Bolsas Transparente Recuperada",
  "Bolsas Camisetas",
  "Bolsas Virgen Transparente",
  "Productos de limpieza, aseo y cocina",
  "Vasos plásticos",
  "Vasos de Poli-papel",
  "Vasos Espumados",
  "Vasos PET",
  "Envases de Alimento",
  "Porta-colaciones",
  "Otros",
];

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [loading, setLoading] = useState(false);

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

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
        // no tocamos stock aquí (se maneja con controles dedicados)
      });
      const updated = resp.data;
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
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
    } catch (err: any) {
      console.error("Error deleting product:", err?.response?.data || err?.message);
      alert(err?.response?.data?.error || "No se pudo eliminar el producto");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Listado de Productos</h2>

      <input
        type="text"
        placeholder="Buscar producto..."
        className="border p-2 rounded w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-500 mb-2">Cargando...</p>}

      {Object.keys(groupedProducts).map((category) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{category}</h3>
          <ul className="space-y-2">
            {groupedProducts[category].map((product) => {
              const isEditing = editingId === product.id;
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
                    <button
                      className="px-2 py-1 rounded border border-gray-600 text-white hover:text-red-300"
                      title="Restar 1"
                      onClick={async () => {
                        try {
                          const resp = await api.patch<Product>(`/products/${product.id}/stock`, { delta: -1 });
                          setProducts((prev) => prev.map(p => p.id === product.id ? resp.data : p));
                        } catch {}
                      }}
                    >
                      -1
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-gray-600 text-white hover:text-emerald-300"
                      title="Sumar 1"
                      onClick={async () => {
                        try {
                          const resp = await api.patch<Product>(`/products/${product.id}/stock`, { delta: 1 });
                          setProducts((prev) => prev.map(p => p.id === product.id ? resp.data : p));
                        } catch {}
                      }}
                    >
                      +1
                    </button>
                    <input
                      type="number"
                      className="w-24 border p-1 rounded bg-white/5 border-white/10"
                      defaultValue={product.stock ?? 0}
                      onBlur={async (e) => {
                        const val = Number(e.target.value);
                        if (!Number.isFinite(val)) return;
                        try {
                          const resp = await api.patch<Product>(`/products/${product.id}/stock`, { set: val });
                          setProducts((prev) => prev.map(p => p.id === product.id ? resp.data : p));
                        } catch {}
                      }}
                      title="Escribe un valor y sal del campo para fijar stock"
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
      ))}
    </div>
  );
};

export default ProductList;