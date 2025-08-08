import { useState, type ChangeEvent } from "react";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string; // ← NUEVO
}

interface ProductSelectorProps {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
  existingProductos: Producto[]; // puede traer category en los existentes
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

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.cantidad > 0) {
      const updatedProduct: Producto = {
        ...newProduct,
        id: newProduct.id || Date.now().toString(),
        category: selectedCategory, // ← guardar la categoría elegida
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
      // si el existente trae category, reflejarla en el selector (opcional)
      if (selectedProduct.category) {
        setSelectedCategory(selectedProduct.category);
      }
    }
  };

  const handleChangeProduct = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleChangeCategory = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const filteredProducts = existingProductos.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

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

  return (
    <div className="space-y-2">
      {productos.map((p, index) => (
        <div key={index} className="border p-2">
          {p.name} - {p.cantidad} {p.unidad}
        </div>
      ))}

      <input
        type="text"
        placeholder="Buscar producto..."
        value={searchProduct}
        onChange={(e) => setSearchProduct(e.target.value)}
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
          onClick={handleAddProduct}
          className="bg-green-500 text-white px-2 py-1"
          disabled={!newProduct.name || newProduct.cantidad <= 0}
        >
          Agregar
        </button>
      </div>

      {!showNewProduct && (
        <button
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
            onChange={handleChangeCategory}
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
            onChange={handleChangeProduct}
            className="w-1/4 border p-2"
          />
          <select
            name="unidad"
            value={newProduct.unidad}
            onChange={handleChangeProduct}
            className="w-1/4 border p-2"
          >
            <option value="unidades">Unidades</option>
            <option value="kg">Kilogramos</option>
            <option value="l">Litros</option>
          </select>
          <button onClick={handleAddProduct} className="bg-green-500 text-white px-2 py-1">
            Agregar
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;