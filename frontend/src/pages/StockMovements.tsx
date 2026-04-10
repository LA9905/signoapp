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

/* ── Micro-componentes de icono ── */
const IconUp = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
    <path d="M8 12V4M4 8l4-4 4 4" />
  </svg>
);
const IconDown = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
    <path d="M8 4v8M4 8l4 4 4-4" />
  </svg>
);

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

  /* ── Detalle de cada movimiento ── */
  const renderDetalle = (m: StockMovement) => {
    const d = m.detalle;

    const Item = ({ label, value }: { label: string; value?: string }) =>
      value ? (
        <span className="sm-meta-chip">
          <span style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
          <strong style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{value}</strong>
        </span>
      ) : null;

    if (m.origen === "Despacho") {
      return (
        <div className="sm-detail-row">
          <Item label="Centro de costo" value={d.cliente || "—"} />
          <Item label="Orden" value={d.orden || "—"} />
          {d.factura && <Item label="Factura" value={d.factura} />}
        </div>
      );
    }
    if (m.origen === "Consumo Interno") {
      return (
        <div className="sm-detail-row">
          <Item label="Retirado por" value={d.nombre_retira || "—"} />
          <Item label="Área" value={d.area || "—"} />
          <Item label="Motivo" value={d.motivo || "—"} />
        </div>
      );
    }
    if (m.origen === "Recepción Proveedor") {
      return (
        <div className="sm-detail-row">
          <Item label="Proveedor" value={d.proveedor || "—"} />
          <Item label="Factura" value={d.orden || "—"} />
        </div>
      );
    }
    if (m.origen === "Producción") {
      return (
        <div className="sm-detail-row">
          <Item label="Operario" value={d.operario || "—"} />
        </div>
      );
    }
    if (m.origen === "Nota de Crédito") {
      return (
        <div className="sm-detail-row">
          <Item label="Cliente" value={d.cliente || "—"} />
          <Item label="Orden" value={d.orden || "—"} />
          <Item label="Factura" value={d.factura || "—"} />
          <Item label="N° Nota" value={d.nota_credito || "—"} />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sm-font-display { font-family: 'Syne', sans-serif; }

        .sm-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
        }

        .sm-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 9px 12px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }
        .sm-input::placeholder { color: rgba(255,255,255,0.2); }
        .sm-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .sm-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          border-radius: 10px;
          font-size: 14px;
          width: 100%;
          padding: 9px 12px;
          box-sizing: border-box;
          transition: border-color .15s;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
        }
        .sm-select:focus { outline: none; border-color: rgba(99,102,241,0.5); }
        .sm-select option { background: #111827; color: white; }

        .sm-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 5px;
        }

        .sm-btn-primary {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 9px 22px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .sm-btn-primary:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }
        .sm-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .sm-dropdown-list {
          position: absolute;
          z-index: 20;
          top: 100%;
          left: 0;
          margin-top: 4px;
          width: 100%;
          border-radius: 10px;
          background: #0F172A;
          border: 1px solid rgba(99,102,241,0.25);
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
          max-height: 180px;
          overflow-y: auto;
        }
        .sm-dropdown-item {
          padding: 9px 12px;
          font-size: 13px;
          cursor: pointer;
          color: rgba(255,255,255,0.8);
          transition: background .1s;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .sm-dropdown-item:last-child { border-bottom: none; }
        .sm-dropdown-item:hover { background: rgba(99,102,241,0.15); color: white; }

        .sm-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .sm-metric {
          border-radius: 12px;
          padding: 14px 18px;
        }
        .sm-metric-neutral {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .sm-metric-entrada {
          background: rgba(52,211,153,0.07);
          border: 1px solid rgba(52,211,153,0.15);
        }
        .sm-metric-salida {
          background: rgba(248,113,113,0.07);
          border: 1px solid rgba(248,113,113,0.15);
        }
        .sm-metric-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .sm-metric-value {
          font-size: 24px;
          font-weight: 500;
          margin: 0;
        }

        .sm-card {
          border-radius: 16px;
          padding: 16px 20px;
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-left-width: 3px;
          transition: background .12s;
        }
        .sm-card:hover { background: rgba(30,40,80,0.5); }
        .sm-card.entrada { border-left-color: rgba(52,211,153,0.65); }
        .sm-card.salida  { border-left-color: rgba(248,113,113,0.65); }

        .sm-card-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sm-card-left  { display: flex; align-items: center; gap: 8px; }
        .sm-card-right { display: flex; align-items: center; gap: 14px; }

        .sm-icon-circle {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sm-icon-circle.entrada { background: rgba(52,211,153,0.12); color: #6EE7B7; }
        .sm-icon-circle.salida  { background: rgba(248,113,113,0.12); color: #FCA5A5; }

        .sm-badge {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
          padding: 3px 9px;
          border-radius: 99px;
        }
        .sm-badge.entrada {
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.2);
          color: #6EE7B7;
        }
        .sm-badge.salida {
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.2);
          color: #FCA5A5;
        }

        .sm-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 12px;
        }

        .sm-detail-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .sm-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin: 0 0 20px;
        }

        .sm-empty {
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
        }

        @keyframes sm-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sm-fade-in { animation: sm-fade-in .25s ease both; }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px" }}>

        {/* Volver */}
        <div style={{ marginBottom: 32 }}>
          <ArrowBackButton />
        </div>

        {/* Título */}
        <div className="sm-fade-in" style={{ marginBottom: 28 }}>
          <h1
            className="sm-font-display"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 4px" }}
          >
            Movimientos de Stock
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Trazabilidad por producto y cliente
          </p>
        </div>

        {/* ── Panel de filtros ── */}
        <div
          className="sm-glass sm-fade-in"
          style={{ borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Producto */}
          <div style={{ position: "relative" }}>
            <label className="sm-field-label">Producto *</label>
            <input
              type="text"
              className="sm-input"
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
              <ul className="sm-dropdown-list">
                {filteredProducts.map((p) => (
                  <li
                    key={p.id}
                    className="sm-dropdown-item"
                    onMouseDown={() => handleSelectProduct(p.name)}
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fechas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="sm-field-label">Desde (opcional)</label>
              <input
                type="date"
                className="sm-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="sm-field-label">Hasta (opcional)</label>
              <input
                type="date"
                className="sm-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="sm-field-label">Cliente (opcional)</label>
            <select
              className="sm-select"
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

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: "#FCA5A5", margin: 0 }}>{error}</p>
          )}

          {/* Botón */}
          <div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="sm-btn-primary"
            >
              {loading ? "Buscando…" : "Buscar movimientos"}
            </button>
          </div>
        </div>

        {/* ── Resultados ── */}
        {searched && (
          <div className="sm-fade-in">

            {/* Métricas */}
            <div className="sm-metrics-grid">
              <div className="sm-metric sm-metric-neutral">
                <p className="sm-metric-label" style={{ color: "rgba(255,255,255,0.35)" }}>Movimientos</p>
                <p className="sm-metric-value">{movements.length}</p>
              </div>
              <div className="sm-metric sm-metric-entrada">
                <p className="sm-metric-label" style={{ color: "rgba(52,211,153,0.65)" }}>Entradas</p>
                <p className="sm-metric-value" style={{ color: "#6EE7B7" }}>
                  +{totalEntradas.toLocaleString("es-CL")}
                </p>
              </div>
              <div className="sm-metric sm-metric-salida">
                <p className="sm-metric-label" style={{ color: "rgba(248,113,113,0.65)" }}>Salidas</p>
                <p className="sm-metric-value" style={{ color: "#FCA5A5" }}>
                  -{totalSalidas.toLocaleString("es-CL")}
                </p>
              </div>
            </div>

            <hr className="sm-divider" />

            {/* Lista o vacío */}
            {movements.length === 0 ? (
              <div className="sm-empty">
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 }}>
                  No se encontraron movimientos para "{selectedProduct}"
                  {dateFrom || dateTo ? " en el rango de fechas indicado" : ""}.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {movements.map((m, i) => {
                  const esEntrada = m.tipo === "entrada";
                  return (
                    <div
                      key={i}
                      className={`sm-card sm-fade-in ${esEntrada ? "entrada" : "salida"}`}
                      style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}
                    >
                      {/* Fila principal */}
                      <div className="sm-card-top">
                        <div className="sm-card-left">
                          <span className={`sm-icon-circle ${esEntrada ? "entrada" : "salida"}`}>
                            {esEntrada ? <IconUp /> : <IconDown />}
                          </span>
                          <span className={`sm-badge ${esEntrada ? "entrada" : "salida"}`}>
                            {esEntrada ? "entrada" : "salida"}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                            {m.origen}
                          </span>
                        </div>

                        <div className="sm-card-right">
                          <span style={{ fontSize: 15, fontWeight: 500, color: esEntrada ? "#6EE7B7" : "#FCA5A5" }}>
                            {esEntrada ? "+" : "-"}{m.cantidad.toLocaleString("es-CL")} {m.unidad}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
                            {new Date(m.fecha).toLocaleString("es-CL")}
                          </span>
                        </div>
                      </div>

                      {/* Detalle */}
                      {renderDetalle(m)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StockMovements;