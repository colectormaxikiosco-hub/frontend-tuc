// Servicio de plantillas - Conectado con backend real
import api from "../config/api"

const STORAGE_KEY = "plantillas"

// Plantillas de prueba
const mockPlantillas = [
  {
    id: 1,
    nombre: "Gaseosas",
    descripcion: "Plantilla para conteo de gaseosas",
    productos: [
      { productoId: 1, cantidadDeseada: 60 },
      { productoId: 2, cantidadDeseada: 100 },
      { productoId: 3, cantidadDeseada: 50 },
      { productoId: 4, cantidadDeseada: 40 },
    ],
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
  },
  {
    id: 2,
    nombre: "Cervezas",
    descripcion: "Plantilla para conteo de cervezas",
    productos: [
      { productoId: 5, cantidadDeseada: 150 },
      { productoId: 6, cantidadDeseada: 120 },
      { productoId: 7, cantidadDeseada: 80 },
    ],
    createdAt: new Date("2024-01-16").toISOString(),
    updatedAt: new Date("2024-01-16").toISOString(),
  },
  {
    id: 3,
    nombre: "Aguas",
    descripcion: "Plantilla para conteo de aguas",
    productos: [
      { productoId: 8, cantidadDeseada: 100 },
      { productoId: 9, cantidadDeseada: 90 },
      { productoId: 10, cantidadDeseada: 80 },
    ],
    createdAt: new Date("2024-01-17").toISOString(),
    updatedAt: new Date("2024-01-17").toISOString(),
  },
]

// Inicializar datos
const initializeData = async () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    try {
      const response = await api.get("/plantillas")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.data))
    } catch (error) {
      console.error("[v0] Error obteniendo plantillas:", error)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPlantillas))
    }
  }
}

initializeData()

export const plantillaService = {
  // Obtener todas - GET /api/plantillas
  getAll: async () => {
    try {
      const response = await api.get("/plantillas")
      return response.data.data
    } catch (error) {
      console.error("[v0] Error obteniendo plantillas:", error)
      throw error
    }
  },

  // Obtener por ID - GET /api/plantillas/:id
  getById: async (id) => {
    try {
      const response = await api.get(`/plantillas/${id}`)
      return response.data.data
    } catch (error) {
      console.error("[v0] Error obteniendo plantilla:", error)
      throw error
    }
  },

  create: async (plantilla) => {
    try {
      // Crear la plantilla primero
      const response = await api.post("/plantillas", {
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
      })

      const plantillaId = response.data.data.id

      // Agregar productos si existen
      if (plantilla.productos && plantilla.productos.length > 0) {
        for (const producto of plantilla.productos) {
          await api.post(`/plantillas/${plantillaId}/productos`, {
            producto_id: producto.productoId,
            cantidad_deseada: producto.cantidadDeseada,
          })
        }
      }

      // Obtener la plantilla completa con productos
      const fullPlantilla = await api.get(`/plantillas/${plantillaId}`)
      return fullPlantilla.data.data
    } catch (error) {
      console.error("[v0] Error creando plantilla:", error)
      throw error
    }
  },

  update: async (id, plantilla) => {
    try {
      const response = await api.put(`/plantillas/${id}/completo`, {
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion ?? "",
        productos: (plantilla.productos || []).map((p) => ({
          producto_id: p.productoId,
          cantidad_deseada: p.cantidadDeseada,
        })),
      })
      return response.data.data
    } catch (error) {
      console.error("[v0] Error actualizando plantilla:", error)
      throw error
    }
  },

  // Eliminar - DELETE /api/plantillas/:id
  delete: async (id) => {
    try {
      await api.delete(`/plantillas/${id}`)
    } catch (error) {
      console.error("[v0] Error eliminando plantilla:", error)
      throw error
    }
  },

  // Agregar producto a plantilla - POST /api/plantillas/:id/productos
  addProducto: async (plantillaId, productoId, cantidadDeseada) => {
    try {
      const response = await api.post(`/plantillas/${plantillaId}/productos`, {
        productoId,
        cantidadDeseada,
      })
      return response.data.data
    } catch (error) {
      console.error("[v0] Error agregando producto a plantilla:", error)
      throw error
    }
  },

  // Eliminar producto de plantilla - DELETE /api/plantillas/:id/productos/:productoId
  removeProducto: async (plantillaId, productoId) => {
    try {
      await api.delete(`/plantillas/${plantillaId}/productos/${productoId}`)
    } catch (error) {
      console.error("[v0] Error eliminando producto de plantilla:", error)
      throw error
    }
  },
}
