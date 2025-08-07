// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import NotFound from "./pages/NotFound"
import Recover from "./pages/Recover"
import ResetPassword from "./pages/ResetPassword"
import AddProduct from "./pages/AddProduct"
import ProductList from "./pages/ProductList"
import CreateDispatch from "./pages/CreateDispatch"
import Clients from "./pages/Clients"
import Drivers from "./pages/Drivers"
import Tracking from "./pages/Tracking"
import React from "react"

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/CreateDispatch" element={<CreateDispatch />} />
        <Route path="/Clients" element={<Clients />} />
        <Route path="/Drivers" element={<Drivers />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
