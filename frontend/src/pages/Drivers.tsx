import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import axios from 'axios';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [name, setName] = useState("");

  const fetchDrivers = () => {
    axios.get(`${import.meta.env.VITE_API_URL}/drivers`)
      .then(res => setDrivers(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL}/drivers`, { name }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setName("");
      fetchDrivers();
    } catch (err) {
      console.error(err);
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
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Agregar
        </button>
      </form>

      <ul className="space-y-2">
        {drivers.map((driver: any) => (
          <li key={driver.id} className="border p-3 rounded shadow">
            <strong>{driver.name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Drivers;
