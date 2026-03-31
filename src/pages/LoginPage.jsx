"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Container, Paper, TextField, Button, Typography, Box, Alert, InputAdornment, IconButton } from "@mui/material"
import { Visibility, VisibilityOff, Inventory, Login as LoginIcon } from "@mui/icons-material"

const LoginPage = () => {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!username || !password) {
      setError("Por favor complete todos los campos")
      setLoading(false)
      return
    }

    try {
      const result = await login(username, password)

      if (result.success) {
        navigate("/dashboard", { replace: true })
      } else {
        setError(result.error || "Error al iniciar sesión")
      }
    } catch (error) {
      console.error("[v0] Error en handleSubmit:", error)
      setError("Error de conexión. Verifica que el servidor esté corriendo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
        padding: { xs: 2, sm: 2 },
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            padding: { xs: 3, sm: 4 },
            borderRadius: 3,
            backgroundColor: "white",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 70, sm: 80 },
                height: { xs: 70, sm: 80 },
                borderRadius: "50%",
                backgroundColor: "#1976d2",
                mb: 2,
              }}
            >
              <Inventory sx={{ fontSize: { xs: 36, sm: 40 }, color: "white" }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              color="primary"
              gutterBottom
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            >
              Colector de Datos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.813rem", sm: "0.875rem" } }}>
              Colector de datos · Gestión de almacén
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Usuario"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: { xs: "1rem", sm: "1rem" },
                  py: { xs: 1.75, sm: 1.5 },
                },
                "& .MuiInputLabel-root": {
                  fontSize: { xs: "1rem", sm: "1rem" },
                },
              }}
            />

            <TextField
              label="Contraseña"
              variant="outlined"
              fullWidth
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: { xs: "1rem", sm: "1rem" },
                  py: { xs: 1.75, sm: 1.5 },
                },
                "& .MuiInputLabel-root": {
                  fontSize: { xs: "1rem", sm: "1rem" },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              startIcon={<LoginIcon />}
              sx={{
                mt: 1,
                py: { xs: 2, sm: 1.5 },
                fontSize: { xs: "1.063rem", sm: "1rem" },
                fontWeight: 600,
                minHeight: { xs: 56, sm: 48 },
              }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </Box>

          
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
