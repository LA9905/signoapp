import { useEffect, useState } from "react";
import { FiSearch, FiAward, FiTrendingUp, FiFileText } from "react-icons/fi";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface ProductRecord {
  rate: number;
  fecha: string;
  operator_id: number | null;
  operator_name: string | null;
  cantidad: number;
  horas: number;
}

interface ProductRecordRow {
  id: number;
  name: string;
  category: string;
  unidad: string | null;
  record: ProductRecord | null;
}

const ProductRecords = () => {
  const [rows, setRows] = useState<ProductRecordRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string>("");

  const fetchRecords = async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<ProductRecordRow[]>("/products/records", {
        params: q ? { search: q } : {},
      });
      setRows(res.data);
      setMensaje("");
    } catch (err) {
      console.error("Error cargando récords de productos:", err);
      setMensaje("No se pudieron cargar los récords de productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchRecords(search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Syne', sans-serif; }
        .glass { background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.18); }
        .input-pr {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
        }
        .input-pr::placeholder { color: rgba(255,255,255,0.2); }
        .input-pr:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .cat-tag-pr {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 4px;
          font-size: 10px; letter-spacing: .04em; text-transform: uppercase;
          background: rgba(99,102,241,0.1); color: rgba(165,180,252,0.85);
          border: 1px solid rgba(99,102,241,0.2);
        }
        .record-box {
          background: rgba(52,211,153,0.06);
          border: 1px solid rgba(52,211,153,0.2);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .no-record-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 10px 12px;
          color: rgba(255,255,255,0.35);
          font-size: 12px;
        }
        .pr-card { transition: background .12s; }
        .pr-card:hover { background: rgba(99,102,241,0.06); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in .25s ease both; }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        <div className="mb-6 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Récords de Producción
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Busca un producto y mira cuál es la marca actual a superar por hora.
          </p>
        </div>

        <div className="relative mb-6 fade-in">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none flex">
            <FiSearch size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-pr w-full pl-9 pr-4 py-2.5"
          />
        </div>

        {mensaje && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm text-red-300 fade-in"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)" }}
          >
            {mensaje}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 justify-center py-16 text-white/30 text-sm">
            <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            Cargando récords…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="glass rounded-2xl p-14 text-center fade-in">
            <span className="flex justify-center mb-3 text-white/15">
              <FiFileText size={30} />
            </span>
            <p className="text-white/30 text-sm">No se encontraron productos.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="pr-card glass rounded-2xl p-5 fade-in"
                style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-display font-semibold text-base text-white/90 mb-1">{row.name}</div>
                    <span className="cat-tag-pr">{row.category}</span>
                  </div>
                 <span
                    style={{ color: row.record ? "#34D399" : "rgba(255,255,255,0.15)", flexShrink: 0, display: "flex" }}
                  >
                    <FiAward size={18} />
                  </span>
                </div>

                {row.record ? (
                  <div className="record-box">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span style={{ color: "#34D399", display: "flex" }}>
                        <FiTrendingUp size={13} />
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#6EE7B7" }}>
                        {row.record.rate} {row.unidad || ""}/hora
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                      Récord establecido {row.record.operator_name ? `por ${row.record.operator_name}` : ""} el{" "}
                      {row.record.fecha} — produjo {row.record.cantidad} {row.unidad || ""} en {row.record.horas}h
                    </div>
                  </div>
                ) : (
                  <div className="no-record-box">
                    Aún no tiene producción registrada — serás quien establezca la primera marca.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductRecords;