import { useEffect, useState } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
interface MovementDetail {
  // Despacho
  cliente?: string;
  orden?: string;
  factura?: string;
  // Consumo interno
  nombre_retira?: string;
  area?: string;
  motivo?: string;
  // Proveedor
  proveedor?: string;
  // Producción
  operario?: string;
  // Nota de crédito
  nota_credito?: string;
}

interface StockMovement {
  tipo: "entrada" | "salida";
  origen: string;
  fecha: string;
  cantidad: number;
  unidad: string;
  detalle: MovementDetail;
}

interface Product {
  id: number;
  name: string;
}

const StockMovements = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productSearch, setProductSearch] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string>("");
  const [clientsList, setClientsList] = useState<{ id: number; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");

  useEffect(() => {
    api
      .get<Product[]>("/products")
      .then((res) => setProducts(res.data))
      .catch(() => setError("No se pudieron cargar los productos"));
  }, []);

  useEffect(() => {
    api
      .get<{ id: number; name: string }[]>("/clients")
      .then((res) => setClientsList(res.data))
      .catch(() => {});
  }, []);

  const filteredProducts = products.filter((p) =>
    normalizeSearch(p.name).includes(normalizeSearch(productSearch))
  );

  const handleSelectProduct = (name: string) => {
    setSelectedProduct(name);
    setProductSearch(name);
    setShowDropdown(false);
  };

  const handleSearch = async () => {
    if (!selectedProduct) {
      setError("Debes seleccionar un producto");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(false);
    try {
      const params: Record<string, string> = { product: selectedProduct };
      if (selectedClient) params.client = selectedClient;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get<StockMovement[]>("/stock-movements", { params });
      setMovements(res.data);
      setSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar los movimientos");
    } finally {
      setLoading(false);
    }
  };

  const totalEntradas = movements
    .filter((m) => m.tipo === "entrada")
    .reduce((acc, m) => acc + m.cantidad, 0);

  const totalSalidas = movements
    .filter((m) => m.tipo === "salida")
    .reduce((acc, m) => acc + m.cantidad, 0);

  const renderDetalle = (m: StockMovement) => {
    const d = m.detalle;
    if (m.origen === "Despacho") {
      return (
        <span className="text-sm text-gray-300">
          <span className="font-medium text-white">Centro de costo:</span> {d.cliente || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Orden:</span> {d.orden || "—"}{" "}
          {d.factura ? (
            <>
              &nbsp;|&nbsp;
              <span className="font-medium text-white">Factura:</span> {d.factura}
            </>
          ) : null}
        </span>
      );
    }
    if (m.origen === "Consumo Interno") {
      return (
        <span className="text-sm text-gray-300">
          <span className="font-medium text-white">Retirado por:</span> {d.nombre_retira || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Área:</span> {d.area || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Motivo:</span> {d.motivo || "—"}
        </span>
      );
    }
    if (m.origen === "Recepción Proveedor") {
      return (
        <span className="text-sm text-gray-300">
          <span className="font-medium text-white">Proveedor:</span> {d.proveedor || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Factura:</span> {d.orden || "—"}
        </span>
      );
    }
    if (m.origen === "Producción") {
      return (
        <span className="text-sm text-gray-300">
          <span className="font-medium text-white">Operario:</span> {d.operario || "—"}
        </span>
      );
    }
    if (m.origen === "Nota de Crédito") {
      return (
        <span className="text-sm text-gray-300">
          <span className="font-medium text-white">Cliente:</span> {d.cliente || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Orden:</span> {d.orden || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">Factura:</span> {d.factura || "—"}{" "}
          &nbsp;|&nbsp;
          <span className="font-medium text-white">N° Nota:</span> {d.nota_credito || "—"}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-10">
        <ArrowBackButton />
      </div>
      <h2 className="text-2xl font-bold mb-6">Movimientos de Stock por Producto</h2>

      {/* Filtros */}
      <div className="space-y-4 mb-6">
        {/* Selector de producto con autocomplete */}
        <div className="relative">
          <label className="block text-sm text-gray-300 mb-1">Producto *</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            placeholder="Escribe para buscar producto..."
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setSelectedProduct("");
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown && productSearch && filteredProducts.length > 0 && (
            <ul className="absolute z-20 bg-neutral-800 border border-gray-600 rounded mt-1 w-full max-h-48 overflow-auto text-white shadow-lg">
              {filteredProducts.map((p) => (
                <li
                  key={p.id}
                  className="p-2 hover:bg-neutral-700 cursor-pointer text-sm"
                  onMouseDown={() => handleSelectProduct(p.name)}
                >
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rango de fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Desde (opcional)</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Hasta (opcional)</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        {/* Filtro por cliente (opcional) */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Cliente (opcional)</label>
          <select
            className="w-full border p-2 rounded"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientsList.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? "Buscando..." : "Buscar movimientos"}
        </button>
      </div>

      {/* Resultados */}
      {searched && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border rounded p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total movimientos</p>
              <p className="text-xl font-bold">{movements.length}</p>
            </div>
            <div className="border rounded p-3 text-center border-emerald-700">
              <p className="text-xs text-emerald-400 mb-1">Total entradas</p>
              <p className="text-xl font-bold text-emerald-400">+{totalEntradas.toLocaleString("es-CL")}</p>
            </div>
            <div className="border rounded p-3 text-center border-red-700">
              <p className="text-xs text-red-400 mb-1">Total salidas</p>
              <p className="text-xl font-bold text-red-400">-{totalSalidas.toLocaleString("es-CL")}</p>
            </div>
          </div>

          {movements.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No se encontraron movimientos para "{selectedProduct}"
              {dateFrom || dateTo ? " en el rango de fechas indicado" : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map((m, i) => (
                <div
                  key={i}
                  className={`border rounded p-4 ${
                    m.tipo === "entrada"
                      ? "border-l-4 border-l-emerald-500"
                      : "border-l-4 border-l-red-500"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          m.tipo === "entrada"
                            ? "bg-emerald-700 text-emerald-100"
                            : "bg-red-800 text-red-100"
                        }`}
                      >
                        {m.tipo === "entrada" ? "▲ ENTRADA" : "▼ SALIDA"}
                      </span>
                      <span className="text-sm font-semibold text-gray-200">{m.origen}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-lg font-bold ${
                          m.tipo === "entrada" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {m.tipo === "entrada" ? "+" : "-"}
                        {m.cantidad} {m.unidad}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(m.fecha).toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                  <div>{renderDetalle(m)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockMovements;