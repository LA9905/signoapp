import { useState, useEffect } from "react";
import axios from "axios";

interface ClientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  existingClients: string[]; // Array de strings, como estaba originalmente
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange, existingClients }) => {
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [searchClient, setSearchClient] = useState("");

  useEffect(() => {
    if (!existingClients.includes(value) && value) {
      setNewClient(value);
      setShowNewClient(true);
    }
  }, [value, existingClients]);

  const handleRegisterClient = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/clients`,
        { name: newClient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onChange(newClient);
      setShowNewClient(false);
    } catch (err) {
      console.error("Error registering client:", err);
    }
  };

  const filteredClients = existingClients.filter((client) =>
    client.toLowerCase().includes(searchClient.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={searchClient}
        onChange={(e) => setSearchClient(e.target.value)}
        className="w-full border p-2"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border p-2"
      >
        <option value="">Selecciona cliente</option>
        {filteredClients.map((client) => (
          <option key={client} value={client}>
            {client}
          </option>
        ))}
      </select>
      {showNewClient && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Nuevo cliente"
            className="w-full border p-2"
          />
          <button
            onClick={handleRegisterClient}
            className="bg-green-500 text-white px-2 py-1"
          >
            Guardar
          </button>
        </div>
      )}
      {!showNewClient && (
        <button
          onClick={() => setShowNewClient(true)}
          className="bg-blue-500 text-white px-2 py-1"
        >
          Nuevo Cliente
        </button>
      )}
    </div>
  );
};

export default ClientSelector;