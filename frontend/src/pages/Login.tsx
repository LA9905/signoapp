import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const Login = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form)
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("name", res.data.name)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.msg || "Error al iniciar sesión")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-[60%] sm:w-3/4 md:w-1/2 max-w-md bg-[#1e1e1e] p-8 rounded-lg shadow-md text-white">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-300">Iniciar sesión</h2>

        {error && (
          <p className="text-red-500 mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-[#2a2a2a] border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="********"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-[#2a2a2a] border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-400 hover:bg-blue-500 rounded font-semibold transition-colors"
          >
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-sm text-center">
          ¿No tienes una cuenta?{" "}
          <a href="/register" className="text-blue-300 hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  )
}

export default Login
