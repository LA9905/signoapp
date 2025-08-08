import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import axios from 'axios';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");

  const fetchClients = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => setClients(res.data))
      .catch((err) => console.error("Error fetching clients:", err));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        return;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/api/clients`, { name }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setName("");
      fetchClients();
    } catch (err) {
      console.error("Error adding client:", err);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Lista de Clientes</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del cliente"
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
        {clients.map((client: any) => (
          <li key={client.id} className="border p-3 rounded shadow">
            <strong>{client.name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Clients;