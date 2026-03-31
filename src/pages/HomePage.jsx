"use client"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useData } from "../contexts/DataContext"
import { Container, Grid, Card, CardContent, Typography, Box, Button, Chip } from "@mui/material"
import { Inventory, Description, QrCodeScanner, History, CheckCircle } from "@mui/icons-material"

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { products, plantillas, conteos } = useData()

  const ultimoConteo =
    conteos.length > 0
      ? [...conteos].sort((a, b) => new Date(b.fecha_creacion || b.fecha) - new Date(a.fecha_creacion || a.fecha))[0]
      : null

  const stats = [
    {
      title: "Productos",
      value: products.length,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: "#1976d2",
      action: () => navigate("/dashboard/productos"),
    },
    {
      title: "Plantillas",
      value: plantillas.length,
      icon: <Description sx={{ fontSize: 40 }} />,
      color: "#4caf50",
      action: () => navigate("/dashboard/plantillas"),
    },
    {
      title: "Conteos",
      value: conteos.length,
      icon: <History sx={{ fontSize: 40 }} />,
      color: "#ff9800",
      action: () => navigate("/dashboard/historial"),
    },
  ]

  const quickActions = [
    {
      title: "Iniciar Conteo",
      description: "Escanear productos y registrar stock",
      icon: <QrCodeScanner sx={{ fontSize: 32 }} />,
      color: "#1976d2",
      action: () => navigate("/dashboard/conteo"),
    },
    {
      title: "Ver Historial",
      description: "Revisar conteos anteriores",
      icon: <History sx={{ fontSize: 32 }} />,
      color: "#ff9800",
      action: () => navigate("/dashboard/historial"),
    },
  ]

  const handleVerDetalleConteo = () => {
    if (ultimoConteo) {
      navigate("/dashboard/historial", { state: { openConteoId: ultimoConteo.id } })
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Bienvenido, {user?.nombre || user?.username || "Usuario"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Maxikiosco Tuc · Colector de datos
        </Typography>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={4} key={index}>
            <Card
              sx={{
                cursor: "pointer",
                transition: "transform 0.2s",
                "&:hover": { transform: "scale(1.05)" },
              }}
              onClick={stat.action}
            >
              <CardContent sx={{ textAlign: "center", p: 2 }}>
                <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
                <Typography variant="h4" fontWeight="bold">
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Acciones rápidas */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Acciones Rápidas
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} key={index}>
            <Card
              sx={{
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
              onClick={action.action}
            >
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    backgroundColor: `${action.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: action.color,
                  }}
                >
                  {action.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {ultimoConteo && (
        <>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Último Conteo
          </Typography>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {ultimoConteo.plantilla_nombre || ultimoConteo.plantillaNombre || "Sin nombre"}
                </Typography>
                <Chip
                  label={ultimoConteo.estado === "finalizado" ? "Completado" : ultimoConteo.estado}
                  color={ultimoConteo.estado === "finalizado" ? "success" : "warning"}
                  size="small"
                  icon={ultimoConteo.estado === "finalizado" ? <CheckCircle /> : undefined}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Por: {ultimoConteo.usuario_nombre || ultimoConteo.usuarioNombre || "Usuario desconocido"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {new Date(ultimoConteo.fecha_creacion || ultimoConteo.fecha).toLocaleString("es-AR")}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Productos contados: {ultimoConteo.productos_contados || 0} / {ultimoConteo.total_productos || 0}
              </Typography>
              <Button variant="outlined" size="small" fullWidth sx={{ mt: 2 }} onClick={handleVerDetalleConteo}>
                Ver Detalles
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  )
}

export default HomePage
