import { useState, type ChangeEvent } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { FiSearch, FiPlus } from "react-icons/fi";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string;
  usage?: number;
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState("");
  const [tmpCantidad, setTmpCantidad] = useState<number>(0);
  const [tmpUnidad, setTmpUnidad] = useState("unidades");

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

  const filteredProducts = existingProductos
    .filter((p) => normalizeSearch(p.name).includes(normalizeSearch(searchProduct)))
    .sort((a, b) => (b.usage || 0) - (a.usage || 0));

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
      p.id === id ? { ...p, cantidad: tmpCantidad, unidad: tmpUnidad } : p
    );
    setProductos(updated);
    cancelEdit();
  };

  const removeItem = (id: string) => {
    const updated = productos.filter((p) => p.id !== id);
    setProductos(updated);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .prd-wrap { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; }

        .prd-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s; outline: none; box-sizing: border-box;
        }
        .prd-input::placeholder { color: rgba(255,255,255,0.2); }
        .prd-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .prd-input-plain {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s; outline: none; box-sizing: border-box;
        }
        .prd-input-plain:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .prd-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8); border-radius: 10px;
          padding: 10px 12px; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s; outline: none;
          appearance: none; cursor: pointer; width: 100%; box-sizing: border-box;
        }
        .prd-select option { background: #111827; color: white; }

        /* --- ICONOS --- */
        .prd-icon-btn {
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 34px; 
          height: 34px; 
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .15s; 
          flex-shrink: 0;
          padding: 0;
          color: inherit;
        }
        .prd-icon-btn svg { 
          display: block; 
          width: 14px; 
          height: 14px; 
          fill: currentColor; 
        }

        .prd-icon-btn-edit { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.2); color: #60A5FA; }
        .prd-icon-btn-edit:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.4); color: #93C5FD; }
        
        .prd-icon-btn-del { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #F87171; }
        .prd-icon-btn-del:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #FCA5A5; }
        
        .prd-icon-btn-save { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .prd-icon-btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }
        
        .prd-icon-btn-cancel { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
        .prd-icon-btn-cancel:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        /* Ajuste para iconos en botones con texto */
        .prd-btn-add svg, .prd-btn-new svg {
          display: block;
          fill: currentColor;
          flex-shrink: 0;
        }

        .prd-item-row {
          display: flex; align-items: center; gap: 10px;
          justify-content: space-between; /* Empuja los íconos al final */
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px 12px;
          transition: border-color .15s;
        }
        .prd-item-row:hover { border-color: rgba(99,102,241,0.2); }

        .prd-item-info { 
          display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; padding: 2px 0;
        }

        .prd-item-name {
          word-break: break-word; flex: 1; line-height: 1.4;
        }

        .prd-btn-add {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #6EE7B7;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .prd-btn-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #A5B4FC;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }

        .prd-search-wrap { position: relative; }
        .prd-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none; display: flex;
        }
        .prd-select-wrap { position: relative; }
        .prd-select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none; font-size: 10px;
        }

        @media (max-width: 500px) {
          .prd-row-grid { flex-direction: column !important; }
          .prd-row-grid > * { width: 100% !important; }
        }

        @media (max-width: 500px) {
          .prd-row-grid { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; }
          .prd-row-grid .prd-input-plain { width: 80px !important; flex: 0 0 80px !important; }
          .prd-row-grid .prd-select-wrap { flex: 1 !important; }
          .prd-row-grid .prd-btn-add { width: auto !important; }
        }
      `}</style>

      <div className="prd-wrap">
        {productos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {productos.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="prd-item-row">
                  {!isEditing ? (
                    <>
                      <div className="prd-item-info">
                        <span className="prd-item-name">
                          {p.name}
                        </span>
                        <span 
                          className="prd-item-meta" 
                          style={{ whiteSpace: "nowrap", color: "rgba(99,102,241,0.8)", fontSize: "13px", fontWeight: "500" }}
                        >
                          {p.cantidad} {p.unidad}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "5px", flexShrink: 0, marginLeft: "10px" }}>
                        <button
                          type="button"
                          className="prd-icon-btn prd-icon-btn-edit"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => startEdit(p)}
                        >
                          <FaRegEdit size={13} />
                        </button>
                        <button
                          type="button"
                          className="prd-icon-btn prd-icon-btn-del"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => removeItem(p.id)}
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flex: 1, gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        className="prd-input-plain"
                        style={{
                          flex: "1 1 100%",
                          background: "rgba(255,255,255,0.02)",
                          color: "rgba(255,255,255,0.35)",
                          userSelect: "none",
                          display: "block",
                        }}
                      >
                        {tmpName}
                      </span>
                      <input
                        type="number"
                        value={tmpCantidad}
                        onChange={(e) => setTmpCantidad(parseFloat(e.target.value) || 0)}
                        className="prd-input-plain"
                        placeholder="Cantidad"
                        style={{ flex: "1", minWidth: "70px" }}
                      />
                      <select
                        value={tmpUnidad}
                        onChange={(e) => setTmpUnidad(e.target.value)}
                        className="prd-select"
                        style={{ flex: "2", minWidth: "100px" }}
                      >
                        <option value="unidades">Unidades</option>
                        <option value="kg">Kilogramos</option>
                        <option value="lt">Litros</option>
                        <option value="cajas">Cajas</option>
                        <option value="PQT">Paquetes</option>
                      </select>
                      <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                        <button
                          type="button"
                          className="prd-icon-btn prd-icon-btn-save"
                          title="Guardar"
                          aria-label="Guardar"
                          onClick={() => saveEdit(p.id)}
                        >
                          <FaSave size={13} />
                        </button>
                        <button
                          type="button"
                          className="prd-icon-btn prd-icon-btn-cancel"
                          title="Cancelar"
                          aria-label="Cancelar"
                          onClick={cancelEdit}
                        >
                          <FaTimes size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {productos.length > 0 && <div className="prd-divider" />}

        {/* Search existing */}
        <div className="prd-search-wrap">
          <span className="prd-search-icon"><FiSearch size={13} /></span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchProduct}
            onChange={(e) => {
              const value = e.target.value;
              setSearchProduct(value);
              const matches = existingProductos
                .filter((p) => normalizeSearch(p.name).includes(normalizeSearch(value)))
                .sort((a, b) => (b.usage || 0) - (a.usage || 0));
              const match = matches[0];
              if (match) {
                setNewProduct({
                  ...match,
                  cantidad: newProduct.cantidad,
                });
                if (match.category) setSelectedCategory(match.category);
              } else {
                setNewProduct((prev) => ({ ...prev, id: "", name: value }));
              }
            }}
            className="prd-input"
          />
        </div>

        {/* Select existing product */}
        <div className="prd-select-wrap">
          <select
            value={newProduct.id}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="prd-select"
          >
            <option value="">Selecciona producto existente</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="prd-select-arrow">▼</span>
        </div>

        {/* Quantity + unit + add button */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }} className="prd-row-grid">
          <input
            type="number"
            name="cantidad"
            placeholder="Cantidad"
            value={newProduct.cantidad}
            onChange={handleChangeProduct}
            className="prd-input-plain"
            style={{ flex: "0 0 110px", width: "110px" }}
          />
          <div className="prd-select-wrap" style={{ flex: "1 1 120px", minWidth: "110px" }}>
            <select
              name="unidad"
              value={newProduct.unidad}
              onChange={handleChangeProduct}
              className="prd-select"
            >
              <option value="unidades">Unidades</option>
              <option value="kg">Kilogramos</option>
              <option value="lt">Litros</option>
              <option value="cajas">Cajas</option>
              <option value="PQT">Paquetes</option>
            </select>
            <span className="prd-select-arrow">▼</span>
          </div>
          <button
            type="button"
            onClick={handleAddProduct}
            className="prd-btn-add"
            disabled={!newProduct.name || newProduct.cantidad <= 0}
            style={{ flex: "0 0 auto" }}
          >
            <FiPlus size={13} /> Agregar
          </button>
        </div>

        {/* New product creation form */}
        {!showNewProduct ? (
          <div>
            <button
              type="button"
              onClick={() => setShowNewProduct(true)}
              className="prd-btn-new"
            >
              <FiPlus size={13} /> Nuevo Producto
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="prd-input-plain"
              style={{ flex: "1 1 150px", minWidth: "130px" }}
            />
            <div className="prd-select-wrap" style={{ flex: "1 1 150px", minWidth: "130px" }}>
              <select
                name="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="prd-select"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="prd-select-arrow">▼</span>
            </div>
            <input
              type="number"
              name="cantidad"
              placeholder="Cantidad"
              value={newProduct.cantidad}
              onChange={(e) =>
                setNewProduct({ ...newProduct, cantidad: parseFloat(e.target.value) || 0 })
              }
              className="prd-input-plain"
              style={{ flex: "0 0 100px", width: "100px" }}
            />
            <div className="prd-select-wrap" style={{ flex: "0 0 120px", minWidth: "110px" }}>
              <select
                name="unidad"
                value={newProduct.unidad}
                onChange={(e) => setNewProduct({ ...newProduct, unidad: e.target.value })}
                className="prd-select"
              >
                <option value="unidades">Unidades</option>
                <option value="kg">Kilogramos</option>
                <option value="lt">Litros</option>
                <option value="cajas">Cajas</option>
                <option value="PQT">Paquetes</option>
              </select>
              <span className="prd-select-arrow">▼</span>
            </div>
            <button
              type="button"
              onClick={handleAddProduct}
              className="prd-btn-add"
              style={{ flex: "0 0 auto" }}
            >
              <FiPlus size={13} /> Agregar
            </button>
            <button
              type="button"
              onClick={() => setShowNewProduct(false)}
              className="prd-icon-btn prd-icon-btn-cancel"
              style={{ width: "auto", padding: "9px 12px", borderRadius: "9px" }}
            >
              <FaTimes size={13} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductSelector;