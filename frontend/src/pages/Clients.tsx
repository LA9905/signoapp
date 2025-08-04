// src/pages/Clients.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const Clients = () => {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/clients`)
      .then(res => setClients(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Lista de Clientes</h2>
      <ul className="space-y-2">
        {clients.map((client: any) => (
          <li key={client.id} className="border p-3 rounded shadow">
            <strong>{client.name}</strong> — {client.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Clients;
