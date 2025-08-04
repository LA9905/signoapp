import { useState, useEffect } from "react"
import axios from "axios"

interface Cliente {
  id: number
  nombre: string
}

interface ClientSelectorProps {
  value: string
  onChange: (value: string) => void
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange }) => {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nuevo, setNuevo] = useState("")

  useEffect(() => {
    axios.get<Cliente[]>("http://localhost:5000/api/clients").then(res => setClientes(res.data))
  }, [])

  const handleAdd = () => {
    if (!nuevo) return
    if (clientes.find(c => c.nombre === nuevo)) {
      alert("El cliente ya existe")
      return
    }
    const nuevoCliente: Cliente = { id: Date.now(), nombre: nuevo }
    setClientes([...clientes, nuevoCliente])
    onChange(nuevoCliente.id.toString())
    setNuevo("")
  }

  return (
    <div className="space-y-1">
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border p-2">
        <option value="">Selecciona cliente</option>
        {clientes.map(c => (
          <option key={c.id} value={c.id.toString()}>
            {c.nombre}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          className="border p-1 flex-1"
          placeholder="Agregar nuevo cliente"
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
        />
        <button type="button" className="bg-blue-500 text-white px-3" onClick={handleAdd}>
          +
        </button>
      </div>
    </div>
  )
}

export default ClientSelector
