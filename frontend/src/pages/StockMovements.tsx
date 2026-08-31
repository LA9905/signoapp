import { useEffect, useState } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
  const [clientSearch, setClientSearch] = useState<string>("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [suppliersList, setSuppliersList] = useState<{ id: number; name: string }[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [supplierSearch, setSupplierSearch] = useState<string>("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

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

  useEffect(() => {
    api
      .get<{ id: number; name: string }[]>("/suppliers")
      .then((res) => setSuppliersList(res.data))
      .catch(() => {});
  }, []);

  const filteredProducts = products
  .filter((p) => normalizeSearch(p.name).includes(normalizeSearch(productSearch)))
  .sort((a, b) => ((b as any).usage || 0) - ((a as any).usage || 0));

  const handleSelectProduct = (name: string) => {
    setSelectedProduct(name);
    setProductSearch(name);
    setShowDropdown(false);
  };

  const filteredClients = clientsList.filter((c) =>
    normalizeSearch(c.name).includes(normalizeSearch(clientSearch))
  );

  const handleSelectClient = (name: string) => {
    setSelectedClient(name);
    setClientSearch(name);
    setShowClientDropdown(false);
  };

  const handleClearClient = () => {
    setSelectedClient("");
    setClientSearch("");
  };

  const filteredSuppliers = suppliersList.filter((s) =>
    normalizeSearch(s.name).includes(normalizeSearch(supplierSearch))
  );

  const handleSelectSupplier = (name: string) => {
    setSelectedSupplier(name);
    setSupplierSearch(name);
    setShowSupplierDropdown(false);
  };

  const handleClearSupplier = () => {
    setSelectedSupplier("");
    setSupplierSearch("");
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
      if (selectedSupplier) params.supplier = selectedSupplier;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

    const res = await api.get<StockMovement[]>("/stock-movements", { params });
      setMovements(res.data);
      setSearched(true);
      setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(movements.length / ITEMS_PER_PAGE));
  const pagedMovements = movements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  /* ── Detalle de cada movimiento (columnas de la tabla) ── */
  const renderDetalleCell = (m: StockMovement) => {
    const d = m.detalle;

    const Chip = ({ label, value }: { label: string; value?: string }) =>
      value ? (
        <span className="sm-meta-chip">
          <span style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.45)" }}>{label}</span>
          <strong style={{ color: isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)", fontWeight: 500 }}>{value}</strong>
        </span>
      ) : null;

    if (m.origen === "Despacho") {
      return (
        <>
          <Chip label="Centro de costo" value={d.cliente || "—"} />
          <Chip label="Orden" value={d.orden || "—"} />
          {d.factura && <Chip label="Factura" value={d.factura} />}
        </>
      );
    }
    if (m.origen === "Consumo Interno") {
      return (
        <>
          <Chip label="Retirado por" value={d.nombre_retira || "—"} />
          <Chip label="Área" value={d.area || "—"} />
          <Chip label="Motivo" value={d.motivo || "—"} />
        </>
      );
    }
    if (m.origen === "Recepción Proveedor") {
      return (
        <>
          <Chip label="Proveedor" value={d.proveedor || "—"} />
          <Chip label="Factura" value={d.orden || "—"} />
        </>
      );
    }
    if (m.origen === "Producción") {
      return <Chip label="Operario" value={d.operario || "—"} />;
    }
    if (m.origen === "Nota de Crédito") {
      return (
        <>
          <Chip label="Cliente" value={d.cliente || "—"} />
          <Chip label="Orden" value={d.orden || "—"} />
          <Chip label="Factura" value={d.factura || "—"} />
          <Chip label="N° Nota" value={d.nota_credito || "—"} />
        </>
      );
    }
    return null;
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: isDark ? "#080C14" : "#F4F6FD", color: isDark ? "white" : "#0F172A", fontFamily: "'DM Sans', sans-serif" }}
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

        .sm-search-wrap { position: relative; }
        .sm-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.06);
          border: none;
          color: rgba(255,255,255,0.5);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .15s;
        }
        .sm-clear-btn:hover { background: rgba(255,255,255,0.14); color: white; }

        .sm-table-wrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(99,102,241,0.18);
          background: rgba(30,40,80,0.2);
        }
        .sm-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .sm-table thead th {
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          padding: 12px 16px;
          border-bottom: 1px solid rgba(99,102,241,0.18);
          white-space: nowrap;
        }
        .sm-table tbody td {
          padding: 12px 16px;
          font-size: 13px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: top;
        }
        .sm-table tbody tr:last-child td { border-bottom: none; }
        .sm-table tbody tr { transition: background .12s; }
        .sm-table tbody tr:hover { background: rgba(99,102,241,0.06); }
        .sm-table tbody tr.entrada { border-left: 3px solid rgba(52,211,153,0.65); }
        .sm-table tbody tr.salida { border-left: 3px solid rgba(248,113,113,0.65); }

        .sm-td-fecha { white-space: nowrap; color: rgba(255,255,255,0.55); }
        .sm-td-cantidad { white-space: nowrap; font-weight: 600; }
        .sm-td-detalle { display: flex; flex-wrap: wrap; gap: 6px; max-width: 420px; }

        .sm-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .sm-page-btn {
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all .15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sm-page-btn:hover:not(:disabled) { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); color: white; }
        .sm-page-btn:disabled { opacity: .35; cursor: not-allowed; }
        .sm-page-btn.active {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-color: transparent;
          color: white;
        }
        .sm-page-ellipsis {
          color: rgba(255,255,255,0.25);
          font-size: 13px;
          padding: 0 4px;
        }

        .sm-results-count {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin: 0 0 12px;
        }

        .sm-mobile-card {
          border-radius: 12px;
          padding: 12px 14px;
          background: rgba(30,40,80,0.3);
          border: 1px solid rgba(99,102,241,0.15);
          border-left-width: 3px;
        }
        .sm-mobile-card.entrada { border-left-color: rgba(52,211,153,0.65); }
        .sm-mobile-card.salida { border-left-color: rgba(248,113,113,0.65); }
        .sm-mobile-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sm-mobile-card-fecha {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin: 6px 0 10px;
        }

        .sm-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 8px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .sm-metrics-grid { gap: 6px; }
          .sm-metric { padding: 10px 10px; }
          .sm-metric-value { font-size: 18px; }
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

        /* ─── Modo claro ─── */
        body[data-theme="light"] .sm-glass {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.18);
        }
        body[data-theme="light"] .sm-input {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: #0F172A;
        }
        body[data-theme="light"] .sm-input::placeholder { color: rgba(15,23,42,0.3); }
        body[data-theme="light"] .sm-input:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        body[data-theme="light"] .sm-select {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: rgba(15,23,42,0.75);
        }
        body[data-theme="light"] .sm-select option {
          background: #FFFFFF;
          color: #0F172A;
        }
        body[data-theme="light"] .sm-field-label {
          color: rgba(15,23,42,0.5);
        }
        body[data-theme="light"] .sm-dropdown-list {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.25);
          box-shadow: 0 16px 40px rgba(15,23,42,0.15);
        }
        body[data-theme="light"] .sm-dropdown-item {
          color: rgba(15,23,42,0.75);
          border-bottom: 1px solid rgba(15,23,42,0.06);
        }
        body[data-theme="light"] .sm-dropdown-item:hover {
          background: rgba(99,102,241,0.1);
          color: #0F172A;
        }
        body[data-theme="light"] .sm-clear-btn {
          background: rgba(15,23,42,0.06);
          color: rgba(15,23,42,0.5);
        }
        body[data-theme="light"] .sm-clear-btn:hover {
          background: rgba(15,23,42,0.12);
          color: #0F172A;
        }
        body[data-theme="light"] .sm-table-wrap {
          border: 1px solid rgba(99,102,241,0.18);
          background: #FFFFFF;
        }
        body[data-theme="light"] .sm-table thead th {
          color: rgba(15,23,42,0.5);
          border-bottom: 1px solid rgba(99,102,241,0.18);
        }
        body[data-theme="light"] .sm-table tbody td {
          border-bottom: 1px solid rgba(15,23,42,0.06);
        }
        body[data-theme="light"] .sm-table tbody tr:hover {
          background: rgba(99,102,241,0.05);
        }
        body[data-theme="light"] .sm-td-fecha {
          color: rgba(15,23,42,0.5);
        }
        body[data-theme="light"] .sm-results-count {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .sm-mobile-card {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.15);
        }
        body[data-theme="light"] .sm-mobile-card-fecha {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .sm-metric-neutral {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sm-card {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.18);
        }
        body[data-theme="light"] .sm-card:hover {
          background: rgba(99,102,241,0.04);
        }
        body[data-theme="light"] .sm-meta-chip {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sm-detail-row {
          border-top: 1px solid rgba(15,23,42,0.06);
        }
        body[data-theme="light"] .sm-divider {
          border-top: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sm-empty {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.18);
        }
        body[data-theme="light"] .sm-page-btn {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.1);
          color: rgba(15,23,42,0.6);
        }
        body[data-theme="light"] .sm-page-btn:hover:not(:disabled) {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.25);
          color: #0F172A;
        }
        body[data-theme="light"] .sm-page-ellipsis {
          color: rgba(15,23,42,0.3);
        }
      `}</style>

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px" }}>
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
          <p style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.5)", margin: 0 }}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
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
          <div style={{ position: "relative" }}>
            <label className="sm-field-label">Cliente (opcional)</label>
            <div className="sm-search-wrap">
              <input
                type="text"
                className="sm-input"
                placeholder="Todos los clientes (escribe para buscar)..."
                value={clientSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setClientSearch(val);
                  setSelectedClient("");
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
              />
              {clientSearch && (
                <button
                  type="button"
                  className="sm-clear-btn"
                  onClick={handleClearClient}
                  title="Ver todos los clientes"
                  aria-label="Limpiar filtro de cliente"
                >
                  ×
                </button>
              )}
            </div>
            {showClientDropdown && clientSearch && filteredClients.length > 0 && (
              <ul className="sm-dropdown-list">
                {filteredClients.map((c) => (
                  <li
                    key={c.id}
                    className="sm-dropdown-item"
                    onMouseDown={() => handleSelectClient(c.name)}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Proveedor */}
          <div style={{ position: "relative" }}>
            <label className="sm-field-label">Proveedor (opcional)</label>
            <div className="sm-search-wrap">
              <input
                type="text"
                className="sm-input"
                placeholder="Todos los proveedores (escribe para buscar)..."
                value={supplierSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setSupplierSearch(val);
                  setSelectedSupplier("");
                  setShowSupplierDropdown(true);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 150)}
              />
              {supplierSearch && (
                <button
                  type="button"
                  className="sm-clear-btn"
                  onClick={handleClearSupplier}
                  title="Ver todos los proveedores"
                  aria-label="Limpiar filtro de proveedor"
                >
                  ×
                </button>
              )}
            </div>
            {showSupplierDropdown && supplierSearch && filteredSuppliers.length > 0 && (
              <ul className="sm-dropdown-list">
                {filteredSuppliers.map((s) => (
                  <li
                    key={s.id}
                    className="sm-dropdown-item"
                    onMouseDown={() => handleSelectSupplier(s.name)}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
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
                <p className="sm-metric-label" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.5)" }}>Movimientos</p>
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

            {/* Tabla o vacío */}
            {movements.length === 0 ? (
              <div className="sm-empty">
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 }}>
                  No se encontraron movimientos para "{selectedProduct}"
                  {dateFrom || dateTo ? " en el rango de fechas indicado" : ""}.
                </p>
              </div>
            ) : (
              <>
                <p className="sm-results-count">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, movements.length)} de {movements.length} movimientos · más reciente primero
                </p>

                <div className="sm-table-wrap hidden md:block">
                  <table className="sm-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Origen</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedMovements.map((m, i) => {
                        const esEntrada = m.tipo === "entrada";
                        return (
                          <tr key={i} className={esEntrada ? "entrada" : "salida"}>
                            <td className="sm-td-fecha">{new Date(m.fecha).toLocaleString("es-CL")}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className={`sm-icon-circle ${esEntrada ? "entrada" : "salida"}`} style={{ width: 22, height: 22 }}>
                                  {esEntrada ? <IconUp /> : <IconDown />}
                                </span>
                                {m.origen}
                              </div>
                            </td>
                            <td>
                              <span className={`sm-badge ${esEntrada ? "entrada" : "salida"}`}>
                                {esEntrada ? "entrada" : "salida"}
                              </span>
                            </td>
                            <td className="sm-td-cantidad" style={{ color: esEntrada ? "#6EE7B7" : "#FCA5A5" }}>
                              {esEntrada ? "+" : "-"}{m.cantidad.toLocaleString("es-CL")} {m.unidad}
                            </td>
                            <td>
                              <div className="sm-td-detalle">{renderDetalleCell(m)}</div>
                            </td>
                          </tr>
                        );
                      })}
                                        </tbody>
                  </table>
                </div>

                {/* Vista móvil: tarjetas apiladas, sin scroll horizontal */}
                <div className="md:hidden flex flex-col gap-3">
                  {pagedMovements.map((m, i) => {
                    const esEntrada = m.tipo === "entrada";
                    return (
                      <div key={i} className={`sm-mobile-card ${esEntrada ? "entrada" : "salida"}`}>
                        <div className="sm-mobile-card-top">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className={`sm-icon-circle ${esEntrada ? "entrada" : "salida"}`} style={{ width: 24, height: 24 }}>
                              {esEntrada ? <IconUp /> : <IconDown />}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                              {m.origen}
                            </span>
                            <span className={`sm-badge ${esEntrada ? "entrada" : "salida"}`}>
                              {esEntrada ? "entrada" : "salida"}
                            </span>
                          </div>
                          <span className="sm-td-cantidad" style={{ color: esEntrada ? "#6EE7B7" : "#FCA5A5" }}>
                            {esEntrada ? "+" : "-"}{m.cantidad.toLocaleString("es-CL")} {m.unidad}
                          </span>
                        </div>
                        <p className="sm-mobile-card-fecha">{new Date(m.fecha).toLocaleString("es-CL")}</p>
                        <div className="sm-td-detalle" style={{ maxWidth: "none" }}>
                          {renderDetalleCell(m)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="sm-pagination">
                    <button
                      type="button"
                      className="sm-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <FiChevronLeft size={14} /> Anterior
                    </button>
                    {getPageNumbers().map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="sm-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className={`sm-page-btn ${currentPage === p ? "active" : ""}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      className="sm-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Siguiente <FiChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StockMovements;