import { useState, type ChangeEvent } from "react";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string; // opcional (si vino de la BD)
}

interface ProductSelectorProps {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
  existingProductos: Producto[];
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  productos,
  setProductos,
  existingProductos,
}) => {
  const [newProduct, setNewProduct] = useState<Producto>({
    id: "",
    name: "",
    cantidad: 0,
    unidad: "unidades",
  });
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Otros");

  // edición en lista del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState("");
  const [tmpCantidad, setTmpCantidad] = useState<number>(0);
  const [tmpUnidad, setTmpUnidad] = useState("unidades");

  const categories = [
    "Bolsas de Basura Negras",
    "Bolsas Transparente Recuperada",
    "Bolsas Camisetas",
    "Bolsas Virgen Transparente",
    "Bolsas Recuperada de Color",
    "Bolsas con Impresión",
    "Bolsas de Lavandería",
    "Bolsas de Polipolieno",
    "Bolsas de Cubierto",
    "Productos de limpieza, aseo y cocina",
    "Vasos plásticos",
    "Vasos de Poli-papel",
    "Vasos Espumados",
    "Vasos PET",
    "Envases Bolw de Alimento",
    "Porta-colaciones o envases Plumavit",
    "Film",
    "Prepicados",
    "Guantes",
    "Utensilios y platos",
    "Brochetas",
    "Pocillos de Degustacion",
    "Gorros y Cofias",
    "Otros",
  ];

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.cantidad > 0) {
      const updatedProduct: Producto = {
        ...newProduct,
        id: newProduct.id || Date.now().toString(),
        category: selectedCategory,
      };
      setProductos([...productos, updatedProduct]);
      setNewProduct({ id: "", name: "", cantidad: 0, unidad: "unidades" });
      setSelectedCategory("Otros");
      setShowNewProduct(false);
    }
  };

  const handleSelectProduct = (selectedId: string) => {
    const selectedProduct = existingProductos.find((p) => p.id === selectedId);
    if (selectedProduct) {
      setNewProduct({
        ...selectedProduct,
        cantidad: selectedProduct.cantidad,
      });
      if (selectedProduct.category) setSelectedCategory(selectedProduct.category);
    }
  };

  const handleChangeProduct = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? parseFloat(value) || 0 : value,
    }));
  };

  const filteredProducts = existingProductos.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // acciones sobre productos ya añadidos al formulario
  const startEdit = (p: Producto) => {
    setEditingId(p.id);
    setTmpName(p.name);
    setTmpCantidad(p.cantidad);
    setTmpUnidad(p.unidad);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTmpName("");
    setTmpCantidad(0);
    setTmpUnidad("unidades");
  };

  const saveEdit = (id: string) => {
    const updated = productos.map((p) =>
      p.id === id ? { ...p, name: tmpName.trim(), cantidad: tmpCantidad, unidad: tmpUnidad } : p
    );
    setProductos(updated);
    cancelEdit();
  };

  const removeItem = (id: string) => {
    const updated = productos.filter((p) => p.id !== id);
    setProductos(updated);
  };

  return (
    <div className="space-y-2">
      {/* Lista de productos añadidos al formulario con editar/eliminar */}
      {productos.map((p) => {
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="border p-2 rounded flex items-center justify-between gap-2">
            {!isEditing ? (
              <>
                <div className="flex-1">
                  {p.name} - {p.cantidad} {p.unidad}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-600 text-white hover:text-blue-400"
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => startEdit(p)}
                  >
                    <FaRegEdit size={16} />
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-600 text-white hover:text-red-400"
                    title="Eliminar"
                    aria-label="Eliminar"
                    onClick={() => removeItem(p.id)}
                  >
                    <FaTrashAlt size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input
                    value={tmpName}
                    onChange={(e) => setTmpName(e.target.value)}
                    className="border p-2 rounded w-full sm:w-1/2"
                    placeholder="Nombre"
                  />
                  <input
                    type="number"
                    value={tmpCantidad}
                    onChange={(e) => setTmpCantidad(parseFloat(e.target.value) || 0)}
                    className="border p-2 rounded w-full sm:w-1/4"
                    placeholder="Cantidad"
                  />
                  <select
                    value={tmpUnidad}
                    onChange={(e) => setTmpUnidad(e.target.value)}
                    className="border p-2 rounded w-full sm:w-1/4"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="kg">Kilogramos</option>
                    <option value="l">Litros</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-600 text-white hover:text-emerald-300"
                    title="Guardar"
                    aria-label="Guardar"
                    onClick={() => saveEdit(p.id)}
                  >
                    <FaSave size={16} />
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-600 text-white hover:text-gray-300"
                    title="Cancelar"
                    aria-label="Cancelar"
                    onClick={cancelEdit}
                  >
                    <FaTimes size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Buscador y selección de existentes */}
      <input
        type="text"
        placeholder="Buscar producto..."
        value={searchProduct}
        onChange={(e) => {
          const value = e.target.value;
          setSearchProduct(value);

          // 🔹 Nuevo: autoseleccionar el primer producto que coincida
          const match = existingProductos.find((p) =>
            p.name.toLowerCase().includes(value.toLowerCase())
          );
          if (match) {
            setNewProduct({
              ...match,
              cantidad: newProduct.cantidad, // mantiene cantidad actual
            });
            if (match.category) setSelectedCategory(match.category);
          } else {
            // si no hay coincidencia, limpiar id y nombre
            setNewProduct((prev) => ({ ...prev, id: "", name: value }));
          }
        }}
        className="w-full border p-2"
      />

      <select
        value={newProduct.id}
        onChange={(e) => handleSelectProduct(e.target.value)}
        className="w-full border p-2"
      >
        <option value="">Selecciona producto existente</option>
        {filteredProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="number"
          name="cantidad"
          placeholder="Cantidad"
          value={newProduct.cantidad}
          onChange={handleChangeProduct}
          className="w-1/3 border p-2"
        />
        <select
          name="unidad"
          value={newProduct.unidad}
          onChange={handleChangeProduct}
          className="w-1/3 border p-2"
        >
          <option value="unidades">Unidades</option>
          <option value="kg">Kilogramos</option>
          <option value="l">Litros</option>
        </select>
        <button
          type="button"
          onClick={handleAddProduct}
          className="bg-green-500 text-white px-2 py-1"
          disabled={!newProduct.name || newProduct.cantidad <= 0}
        >
          Agregar
        </button>
      </div>

      {!showNewProduct && (
        <button
          type="button"
          onClick={() => setShowNewProduct(true)}
          className="bg-blue-500 text-white px-2 py-1"
        >
          Nuevo Producto
        </button>
      )}

      {showNewProduct && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="w-1/4 border p-2"
          />
          <select
            name="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-1/4 border p-2"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="cantidad"
            placeholder="Cantidad"
            value={newProduct.cantidad}
            onChange={(e) =>
              setNewProduct({ ...newProduct, cantidad: parseFloat(e.target.value) || 0 })
            }
            className="w-1/4 border p-2"
          />
          <select
            name="unidad"
            value={newProduct.unidad}
            onChange={(e) => setNewProduct({ ...newProduct, unidad: e.target.value })}
            className="w-1/4 border p-2"
          >
            <option value="unidades">Unidades</option>
            <option value="kg">Kilogramos</option>
            <option value="l">Litros</option>
          </select>
          <button
            type="button"
            onClick={handleAddProduct}
            className="bg-green-500 text-white px-2 py-1"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;