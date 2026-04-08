import api from "../config/api"

export const conteoService = {
  // Crear conteo - POST /api/conteos
  create: async (plantillaId) => {
    try {
      const response = await api.post("/conteos", {
        plantilla_id: plantillaId,
      })
      return response.data.data
    } catch (error) {
      console.error("[v0] Error creando conteo:", error)
      throw error
    }
  },

  // Obtener conteo por ID - GET /api/conteos/:id
  getById: async (id) => {
    try {
      const response = await api.get(`/conteos/${id}`)
      return response.data.data
    } catch (error) {
      console.error("[v0] Error obteniendo conteo:", error)
      throw error
    }
  },

  // Actualizar cantidad de producto - PUT /api/conteos/:id/productos/:productoId
  updateProductQuantity: async (conteoId, productoId, cantidadReal) => {
    try {
      const response = await api.put(`/conteos/${conteoId}/productos/${productoId}`, {
        cantidad_real: cantidadReal,
      })
      return response.data
    } catch (error) {
      console.error("[v0] Error actualizando cantidad:", error)
      throw error
    }
  },

  // Finalizar conteo - PUT /api/conteos/:id/finalizar
  finalize: async (id) => {
    try {
      const response = await api.put(`/conteos/${id}/finalizar`)
      return response.data
    } catch (error) {
      console.error("[v0] Error finalizando conteo:", error)
      throw error
    }
  },

  // Obtener todos los conteos - GET /api/conteos
  getAll: async () => {
    try {
      const response = await api.get("/conteos")
      return response.data.data
    } catch (error) {
      console.error("[v0] Error obteniendo conteos:", error)
      throw error
    }
  },

  // Eliminar conteo - DELETE /api/conteos/:id
  delete: async (id) => {
    try {
      await api.delete(`/conteos/${id}`)
    } catch (error) {
      console.error("[v0] Error eliminando conteo:", error)
      throw error
    }
  },

  // Obtener estadísticas - GET /api/conteos/:id/estadisticas
  getStatistics: async (id) => {
    try {
      const response = await api.get(`/conteos/${id}/estadisticas`)
      return response.data.data
    } catch (error) {
      console.error("[v0] Error obteniendo estadísticas:", error)
      throw error
    }
  },
}

export default conteoService
