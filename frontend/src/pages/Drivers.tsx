import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import axios from "axios";
import { FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";

type Driver = { id: number; name: string; created_by?: string };

const btnBase =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tmpName, setTmpName] = useState("");

  const token = localStorage.getItem("token");

  const fetchDrivers = () => {
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/drivers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => setDrivers(res.data))
      .catch((err) => console.error("Error fetching drivers:", err));
  };

  useEffect(() => {
    fetchDrivers();
    const onFocus = () => fetchDrivers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/drivers`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName("");
      fetchDrivers();
    } catch (err) {
      console.error("Error adding driver:", err);
    }
  };

  const startEdit = (d: Driver) => {
    setEditingId(d.id);
    setTmpName(d.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTmpName("");
  };

  const saveEdit = async (id: number) => {
    if (!token) return;
    const newName = tmpName.trim();
    if (!newName) {
      alert("El nombre no puede estar vacío.");
      return;
    }
    try {
      const resp = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/drivers/${id}`,
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = resp.data as Driver;
      setDrivers((prev) => prev.map((d) => (d.id === id ? updated : d)));
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating driver:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo actualizar el chofer");
    }
  };

  const deleteDriver = async (id: number) => {
    if (!token) return;
    if (!window.confirm("¿Eliminar este chofer? Esta acción es permanente.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error("Error deleting driver:", err.response?.data || err.message);
      if (err.response?.status === 409) {
        alert(err.response?.data?.error || "No se puede eliminar: chofer con despachos asociados.");
      } else {
        alert("No se pudo eliminar el chofer");
      }
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Choferes registrados</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del chofer"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="flex-1 border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Agregar
        </button>
      </form>

      <ul className="space-y-2">
        {drivers.map((driver) => {
          const isEditing = editingId === driver.id;
          return (
            <li key={driver.id} className="border p-3 rounded shadow flex items-center justify-between gap-3">
              <div className="flex-1">
                {!isEditing ? (
                  <strong>{driver.name}</strong>
                ) : (
                  <input
                    value={tmpName}
                    onChange={(e) => setTmpName(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="Nombre del chofer"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      className={`${btnBase} hover:bg-blue-600`}
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => startEdit(driver)}
                    >
                      <FiEdit2 size={20} />
                    </button>
                    <button
                      className={`${btnBase} hover:bg-red-600`}
                      title="Eliminar"
                      aria-label="Eliminar"
                      onClick={() => deleteDriver(driver.id)}
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`${btnBase} hover:bg-emerald-600`}
                      title="Guardar"
                      aria-label="Guardar"
                      onClick={() => saveEdit(driver.id)}
                    >
                      <FiCheck size={20} />
                    </button>
                    <button
                      className={`${btnBase} hover:bg-gray-600`}
                      title="Cancelar"
                      aria-label="Cancelar"
                      onClick={cancelEdit}
                    >
                      <FiX size={20} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Drivers;