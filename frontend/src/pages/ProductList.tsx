import { useEffect, useState } from "react";
import axios from "axios";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
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

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  const filtered = products.filter((p: Product) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedProducts = filtered.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as { [key: string]: Product[] });

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
    if (!token) return;
    try {
      const resp = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${id}`,
        { name: editName.trim(), category: editCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = resp.data as Product;
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating product:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo actualizar el producto");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!token) return;
    if (!window.confirm("¿Eliminar este producto? Esta acción es permanente.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error("Error deleting product:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo eliminar el producto");
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
      {Object.keys(groupedProducts).map((category) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{category}</h3>
          <ul className="space-y-2">
            {groupedProducts[category].map((product: Product) => {
              const isEditing = editingId === product.id;
              return (
                <li
                  key={product.id}
                  className="border p-3 rounded shadow flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    {!isEditing ? (
                      <strong>{product.name}</strong>
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