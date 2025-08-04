import React from "react";

const categorias = [
  "Bolsas Negras",
  "Bolsas Transparente Recuperada",
  "Bolsas Camisetas",
  "Bolsas Virgen Transparente",
  "Productos de limpieza",
  "Aseo y cocina",
  "Vasos plásticos",
  "Vasos de Poli-papel",
  "Vasos Espumados",
  "Vasos PET",
  "Envases de Alimento",
  "Porta-colaciones",
  "Otros",
];

interface Producto {
  nombre: string;
  cantidad: number;
  categoria: string;
}

interface ProductSelectorProps {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ productos, setProductos }) => {
  const handleAdd = () => {
    setProductos([...productos, { nombre: "", cantidad: 1, categoria: "" }]);
  };

  const handleChange = (i: number, field: keyof Producto, value: string | number) => {
    const newList = [...productos];
    if (field === "cantidad") {
      newList[i].cantidad = Number(value); // Asignación directa a 'cantidad' (number)
    } else if (field === "nombre" || field === "categoria") {
      newList[i][field] = value as string; // Asignación a 'nombre' o 'categoria' (string)
    }
    setProductos(newList);
  };

  return (
    <div className="space-y-2">
      <p className="font-semibold">Productos</p>
      {productos.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Nombre"
            className="border p-1 flex-1"
            value={p.nombre}
            onChange={e => handleChange(i, "nombre", e.target.value)}
          />
          <input
            type="number"
            className="border p-1 w-20"
            value={p.cantidad}
            onChange={e => handleChange(i, "cantidad", e.target.value)}
          />
          <select
            className="border p-1"
            value={p.categoria}
            onChange={e => handleChange(i, "categoria", e.target.value)}
          >
            <option value="">Categoría</option>
            {categorias.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button type="button" onClick={handleAdd} className="text-blue-600 hover:underline">
        + Agregar producto
      </button>
    </div>
  );
};

export default ProductSelector;