import { useEffect, useState } from "react";
import axios from "axios";

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
}

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token"); // Obtener el token almacenado
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`, // Incluir el token en el encabezado
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        console.log("Productos recibidos:", res.data); // Depuración
        setProducts(res.data);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  const filtered = products.filter((p: Product) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
      <ul className="space-y-2">
        {filtered.map((product: Product) => (
          <li key={product.id} className="border p-3 rounded shadow">
            <strong>{product.name}</strong> — {product.category} (Creado por: {product.created_by})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductList;