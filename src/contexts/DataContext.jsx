"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./AuthContext"
import { productService } from "../services/productService"
import { plantillaService } from "../services/plantillaService"
import { conteoService } from "../services/conteoService"
import { userService } from "../services/userService"
import { Snackbar, Alert } from "@mui/material"

const DataContext = createContext(null)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData debe ser usado dentro de DataProvider")
  }
  return context
}

export const DataProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()

  const [products, setProducts] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [conteos, setConteos] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" })

  const [isLoadingData, setIsLoadingData] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !isLoadingData) {
      loadData()
    }
  }, [isAuthenticated])

  const showNotification = (message, severity = "success") => {
    setNotification({ open: true, message, severity })
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  const loadData = async () => {
    if (isLoadingData) return

    try {
      setIsLoadingData(true)
      setLoading(true)

      const [productsData, plantillasData, conteosData, usersData] = await Promise.all([
        productService.getAll().catch(() => []),
        plantillaService.getAll().catch(() => []),
        conteoService.getAll().catch(() => []),
        userService.getAll().catch(() => []),
      ])

      setProducts(productsData)
      setPlantillas(plantillasData)
      setConteos(conteosData)
      setUsers(usersData)
    } catch (error) {
      console.error("[v0] Error cargando datos:", error)
      showNotification("Error al cargar los datos", "error")
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  // Productos
  const addProduct = async (product) => {
    try {
      const newProduct = await productService.create(product)
      // Recargar todos los productos para asegurar consistencia
      const updatedProducts = await productService.getAll()
      setProducts(updatedProducts)
      showNotification("Producto agregado exitosamente")
      return newProduct
    } catch (error) {
      console.error("[v0] Error agregando producto:", error)
      const message = error.response?.data?.message || "Error al agregar producto"
      showNotification(message, "error")
      throw error
    }
  }

  const updateProduct = async (id, data) => {
    try {
      const updated = await productService.update(id, data)
      // Recargar todos los productos para asegurar consistencia
      const updatedProducts = await productService.getAll()
      setProducts(updatedProducts)
      showNotification("Producto actualizado exitosamente")
      return updated
    } catch (error) {
      console.error("[v0] Error actualizando producto:", error)
      const message = error.response?.data?.message || "Error al actualizar producto"
      showNotification(message, "error")
      throw error
    }
  }

  const deleteProduct = async (id) => {
    try {
      await productService.delete(id)
      setProducts(products.filter((p) => p.id !== id))
      showNotification("Producto eliminado exitosamente")
    } catch (error) {
      console.error("[v0] Error eliminando producto:", error)
      const message = error.response?.data?.message || "Error al eliminar producto"
      showNotification(message, "error")
      throw error
    }
  }

  const importProducts = async (file) => {
    try {
      const imported = await productService.importFromExcel(file)
      setProducts(imported)
      showNotification(`${imported.length} productos importados exitosamente`)
      return imported
    } catch (error) {
      console.error("[v0] Error importando productos:", error)
      const message = error.response?.data?.message || "Error al importar productos"
      showNotification(message, "error")
      throw error
    }
  }

  // Plantillas — tras mutación se vuelve a cargar la lista para mantener consistencia con el servidor
  const addPlantilla = async (plantilla) => {
    try {
      await plantillaService.create(plantilla)
      const fresh = await plantillaService.getAll()
      setPlantillas(fresh)
      showNotification("Plantilla creada exitosamente")
      return fresh
    } catch (error) {
      console.error("[v0] Error agregando plantilla:", error)
      throw error
    }
  }

  const updatePlantilla = async (id, data) => {
    try {
      await plantillaService.update(id, data)
      const fresh = await plantillaService.getAll()
      setPlantillas(fresh)
      showNotification("Plantilla actualizada exitosamente")
      return fresh
    } catch (error) {
      console.error("[v0] Error actualizando plantilla:", error)
      throw error
    }
  }

  const deletePlantilla = async (id) => {
    try {
      await plantillaService.delete(id)
      const fresh = await plantillaService.getAll()
      setPlantillas(fresh)
      showNotification("Plantilla eliminada exitosamente")
    } catch (error) {
      console.error("[v0] Error eliminando plantilla:", error)
      throw error
    }
  }

  // Conteos
  const addConteo = async (conteo) => {
    try {
      const newConteo = await conteoService.create(conteo)
      setConteos([newConteo, ...conteos])
      showNotification("Conteo guardado exitosamente")
      return newConteo
    } catch (error) {
      console.error("[v0] Error agregando conteo:", error)
      const message = error.response?.data?.message || "Error al guardar conteo"
      showNotification(message, "error")
      throw error
    }
  }

  const getConteoById = async (id) => {
    try {
      return await conteoService.getById(id)
    } catch (error) {
      console.error("[v0] Error obteniendo conteo:", error)
      const message = error.response?.data?.message || "Error al obtener conteo"
      showNotification(message, "error")
      throw error
    }
  }

  // Usuarios
  const addUser = async (user) => {
    try {
      const newUser = await userService.create(user)
      await loadData()
      showNotification("Usuario creado exitosamente")
      return newUser
    } catch (error) {
      console.error("[v0] Error agregando usuario:", error)
      const message = error.response?.data?.message || "Error al crear usuario"
      showNotification(message, "error")
      throw error
    }
  }

  const updateUser = async (id, data) => {
    try {
      await userService.update(id, data)
      await loadData()
      showNotification("Usuario actualizado exitosamente")
    } catch (error) {
      console.error("[v0] Error actualizando usuario:", error)
      const message = error.response?.data?.message || "Error al actualizar usuario"
      showNotification(message, "error")
      throw error
    }
  }

  const deleteUser = async (id) => {
    try {
      await userService.delete(id)
      setUsers(users.filter((u) => u.id !== id))
      showNotification("Usuario eliminado exitosamente")
    } catch (error) {
      console.error("[v0] Error eliminando usuario:", error)
      const message = error.response?.data?.message || "Error al eliminar usuario"
      showNotification(message, "error")
      throw error
    }
  }

  const value = {
    products,
    plantillas,
    conteos,
    users,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    addPlantilla,
    updatePlantilla,
    deletePlantilla,
    addConteo,
    getConteoById,
    addUser,
    updateUser,
    deleteUser,
    refreshData: loadData,
  }

  return (
    <DataContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </DataContext.Provider>
  )
}
