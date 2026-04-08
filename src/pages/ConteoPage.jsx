"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useData } from "../contexts/DataContext"
import { conteoService } from "../services/conteoService"
import BarcodeScanner from "../components/BarcodeScanner"
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  LinearProgress,
  Snackbar,
  Paper,
  TablePagination,
  Switch,
  Stack,
  Backdrop,
  CircularProgress,
  Fab,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
} from "@mui/material"
import {
  CheckCircle,
  TrendingUp,
  TrendingDown,
  CheckCircleOutline,
  Cancel,
  Search,
  FilterList,
  QrCodeScanner,
  PlayArrow,
} from "@mui/icons-material"

const CONTEO_STORAGE_KEY = "conteo_activo"

const formatApiError = (error) => {
  const data = error?.response?.data
  if (!data) return error?.message || "Error de conexión"
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message).join(" · ")
  }
  return data.message || "Error al procesar la solicitud"
}

const calcularDiferencias = (cantidadReal, cantidadSistema) => {
  const real = Number(cantidadReal) || 0
  const sistema = Number(cantidadSistema) || 0
  const diferencia = real - sistema
  const faltante = diferencia < 0 ? Math.abs(diferencia) : 0
  const sobrante = diferencia > 0 ? diferencia : 0
  return { diferencia, faltante, sobrante }
}

const ConteoPage = () => {
  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const { plantillas, refreshData } = useData()

  const [selectedPlantilla, setSelectedPlantilla] = useState(null)
  const [conteoActivo, setConteoActivo] = useState(null)
  const [productosConteo, setProductosConteo] = useState([])
  const [searchProducto, setSearchProducto] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false)
  const [openCantidadDialog, setOpenCantidadDialog] = useState(false)
  const [productoActual, setProductoActual] = useState(null)
  const [cantidadReal, setCantidadReal] = useState("")
  const [modoSuma, setModoSuma] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })
  const [openExitDialog, setOpenExitDialog] = useState(false)
  const [searchPlantilla, setSearchPlantilla] = useState("")
  const [pagePlantilla, setPagePlantilla] = useState(0)
  const [rowsPerPagePlantilla, setRowsPerPagePlantilla] = useState(12)
  const [openReminderDialog, setOpenReminderDialog] = useState(false)
  const [plantillaToSelect, setPlantillaToSelect] = useState(null)
  const [isLeavingIntentionally, setIsLeavingIntentionally] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [openFinalizeDialog, setOpenFinalizeDialog] = useState(false)

  const cantidadInputRef = useRef(null)

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchProducto), 200)
    return () => clearTimeout(t)
  }, [searchProducto])

  useEffect(() => {
    if (conteoActivo || plantillas.length === 0) return

    const conteoGuardado = localStorage.getItem(CONTEO_STORAGE_KEY)
    if (!conteoGuardado) return

    let cancelled = false

    const restaurarConteo = async () => {
      try {
        const { conteoId, plantillaId } = JSON.parse(conteoGuardado)
        const plantilla = plantillas.find((p) => Number(p.id) === Number(plantillaId))
        if (!plantilla) return

        setLoading(true)
        const conteoCompleto = await conteoService.getById(conteoId)

        if (cancelled) return

        if (conteoCompleto.estado !== "en_progreso") {
          localStorage.removeItem(CONTEO_STORAGE_KEY)
          return
        }

        setSelectedPlantilla(plantilla)
        setConteoActivo(conteoCompleto)
        setProductosConteo(conteoCompleto.productos || [])
        setIsLeavingIntentionally(false)
        showSnackbar("Conteo restaurado", "success")
      } catch (error) {
        if (cancelled) return
        console.error("Error al restaurar conteo:", error)
        localStorage.removeItem(CONTEO_STORAGE_KEY)
        showSnackbar(formatApiError(error) || "No se pudo restaurar el conteo", "warning")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restaurarConteo()
    return () => {
      cancelled = true
    }
  }, [plantillas, conteoActivo, showSnackbar])

  useEffect(() => {
    if (conteoActivo || plantillas.length === 0) return
    const raw = localStorage.getItem(CONTEO_STORAGE_KEY)
    if (!raw) return
    try {
      const { plantillaId } = JSON.parse(raw)
      const existe = plantillas.some((p) => Number(p.id) === Number(plantillaId))
      if (!existe) localStorage.removeItem(CONTEO_STORAGE_KEY)
    } catch {
      localStorage.removeItem(CONTEO_STORAGE_KEY)
    }
  }, [plantillas, conteoActivo])

  useEffect(() => {
    if (conteoActivo && selectedPlantilla) {
      localStorage.setItem(
        CONTEO_STORAGE_KEY,
        JSON.stringify({ conteoId: conteoActivo.id, plantillaId: selectedPlantilla.id }),
      )
    }
  }, [conteoActivo, selectedPlantilla])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (conteoActivo && !isLeavingIntentionally) {
        e.preventDefault()
        e.returnValue = ""
        return e.returnValue
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [conteoActivo, isLeavingIntentionally])

  useEffect(() => {
    if (!conteoActivo) return

    const handlePopState = (e) => {
      if (!isLeavingIntentionally) {
        e.preventDefault()
        window.history.pushState(null, "", window.location.pathname)
        setOpenExitDialog(true)
      }
    }

    window.history.pushState(null, "", window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [conteoActivo, isLeavingIntentionally])

  useEffect(() => {
    if (openCantidadDialog && cantidadInputRef.current) {
      const id = requestAnimationFrame(() => {
        cantidadInputRef.current?.focus()
        cantidadInputRef.current?.select?.()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [openCantidadDialog])

  const handleSelectPlantilla = (plantilla) => {
    setPlantillaToSelect(plantilla)
    setOpenReminderDialog(true)
  }

  const handleConfirmarInicioConteo = async () => {
    try {
      setLoading(true)
      setOpenReminderDialog(false)
      setSelectedPlantilla(plantillaToSelect)

      const conteo = await conteoService.create(plantillaToSelect.id)
      const conteoCompleto = await conteoService.getById(conteo.id)

      setConteoActivo(conteoCompleto)
      setProductosConteo(conteoCompleto.productos || [])
      setIsLeavingIntentionally(false)

      localStorage.setItem(
        CONTEO_STORAGE_KEY,
        JSON.stringify({ conteoId: conteoCompleto.id, plantillaId: plantillaToSelect.id }),
      )

      showSnackbar("Conteo iniciado", "success")
    } catch (error) {
      showSnackbar(formatApiError(error), "error")
    } finally {
      setLoading(false)
      setPlantillaToSelect(null)
    }
  }

  const handleSaveCantidad = async () => {
    if (!productoActual || cantidadReal === "") return

    const eraModoSuma = modoSuma

    try {
      setLoading(true)
      const cantidadIngresada = Number(cantidadReal) || 0
      const cantidadFinal = eraModoSuma ? (productoActual.cantidad_real || 0) + cantidadIngresada : cantidadIngresada

      await conteoService.updateProductQuantity(conteoActivo.id, productoActual.producto_id, cantidadFinal)

      setProductosConteo((prev) =>
        prev.map((p) =>
          p.producto_id === productoActual.producto_id
            ? {
                ...p,
                cantidad_real: cantidadFinal,
                ...calcularDiferencias(cantidadFinal, p.cantidad_sistema),
              }
            : p,
        ),
      )

      setOpenCantidadDialog(false)
      setProductoActual(null)
      setCantidadReal("")
      setModoSuma(false)

      showSnackbar(
        eraModoSuma ? `Sumado. Total: ${cantidadFinal}` : "Cantidad guardada",
        "success",
      )
    } catch (error) {
      showSnackbar(formatApiError(error), "error")
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizarConteo = async () => {
    try {
      setLoading(true)
      setIsLeavingIntentionally(true)
      await conteoService.finalize(conteoActivo.id)
      localStorage.removeItem(CONTEO_STORAGE_KEY)
      showSnackbar("Conteo finalizado", "success")
      await refreshData()
      setConteoActivo(null)
      setSelectedPlantilla(null)
      setProductosConteo([])
      setOpenFinalizeDialog(false)
    } catch (error) {
      showSnackbar(formatApiError(error), "error")
      setIsLeavingIntentionally(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarConteo = async () => {
    try {
      setLoading(true)
      setIsLeavingIntentionally(true)
      await conteoService.delete(conteoActivo.id)
      localStorage.removeItem(CONTEO_STORAGE_KEY)
      showSnackbar("Conteo eliminado", "info")
      await refreshData()
      setConteoActivo(null)
      setSelectedPlantilla(null)
      setProductosConteo([])
      setOpenExitDialog(false)
    } catch (error) {
      showSnackbar(formatApiError(error), "error")
      setIsLeavingIntentionally(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDejarPendiente = () => {
    setIsLeavingIntentionally(true)
    showSnackbar("Guardado. Podés continuar después desde Conteo.", "info")
    setConteoActivo(null)
    setSelectedPlantilla(null)
    setProductosConteo([])
    setOpenExitDialog(false)
  }

  const handleProductClick = useCallback((producto) => {
    setProductoActual(producto)
    const yaContado = producto.cantidad_real !== null && producto.cantidad_real !== undefined
    setModoSuma(yaContado)
    setCantidadReal("")
    setOpenCantidadDialog(true)
  }, [])

  const handleScanResult = useCallback(
    (text) => {
      setScannerOpen(false)
      const raw = String(text).trim()
      if (!raw) return
      const codeNorm = raw.toLowerCase()
      const match = productosConteo.find((p) => String(p.codigo || "").trim().toLowerCase() === codeNorm)
      if (!match) {
        showSnackbar(`Código «${raw}» no está en esta plantilla`, "warning")
        return
      }
      handleProductClick(match)
    },
    [productosConteo, handleProductClick, showSnackbar],
  )

  const plantillasFiltradas = useMemo(
    () => plantillas.filter((p) => p.nombre?.toLowerCase().includes(searchPlantilla.toLowerCase())),
    [plantillas, searchPlantilla],
  )

  const plantillasPaginadas = plantillasFiltradas.slice(
    pagePlantilla * rowsPerPagePlantilla,
    pagePlantilla * rowsPerPagePlantilla + rowsPerPagePlantilla,
  )

  const productosFiltrados = useMemo(() => {
    const searchLower = debouncedSearch.trim().toLowerCase()
    return productosConteo.filter((producto) => {
      const matchesSearch =
        !searchLower ||
        producto.nombre?.toLowerCase().includes(searchLower) ||
        String(producto.codigo || "").toLowerCase().includes(searchLower)
      const matchesPendientes = mostrarSoloPendientes ? producto.cantidad_real === null || producto.cantidad_real === undefined : true
      return matchesSearch && matchesPendientes
    })
  }, [productosConteo, debouncedSearch, mostrarSoloPendientes])

  const productosContados = useMemo(() => productosConteo.filter((p) => p.cantidad_real !== null && p.cantidad_real !== undefined).length, [productosConteo])
  const totalProductos = productosConteo.length
  const productosPendientes = totalProductos - productosContados
  const progreso = totalProductos > 0 ? (productosContados / totalProductos) * 100 : 0

  const cardHoverSx = {
    transition: "background-color 0.15s, box-shadow 0.15s",
    "@media (hover: hover)": {
      "&:hover": {
        boxShadow: 2,
      },
    },
  }

  if (!conteoActivo) {
    return (
      <Container
        maxWidth="md"
        sx={{
          py: { xs: 2, sm: 3 },
          pb: { xs: "calc(88px + env(safe-area-inset-bottom, 0px))", sm: 10 },
        }}
      >
        <Backdrop open={loading} sx={{ zIndex: (t) => t.zIndex.drawer + 1, color: "#fff" }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress color="inherit" />
            <Typography variant="body2">Cargando…</Typography>
          </Stack>
        </Backdrop>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: "1.35rem", sm: "1.5rem" } }}>
            Iniciar conteo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Elegí una plantilla. En celular: tocá la tarjeta o el botón para comenzar.
          </Typography>
        </Stack>

        {plantillas.length === 0 ? (
          <Alert severity="info">No hay plantillas. Creá una en la sección Plantillas.</Alert>
        ) : (
          <>
            <TextField
              fullWidth
              placeholder="Buscar plantilla…"
              value={searchPlantilla}
              onChange={(e) => {
                setSearchPlantilla(e.target.value)
                setPagePlantilla(0)
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, "& .MuiInputBase-root": { minHeight: 52 } }}
            />

            {plantillasFiltradas.length === 0 ? (
              <Alert severity="info">Sin resultados</Alert>
            ) : (
              <>
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {plantillasPaginadas.map((plantilla) => (
                    <Card
                      key={plantilla.id}
                      variant="outlined"
                      onClick={() => !loading && handleSelectPlantilla(plantilla)}
                      sx={{
                        borderRadius: 2,
                        cursor: loading ? "default" : "pointer",
                        ...cardHoverSx,
                      }}
                    >
                      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {plantilla.nombre}
                            </Typography>
                            {plantilla.descripcion ? (
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: "100%" }}>
                                {plantilla.descripcion}
                              </Typography>
                            ) : null}
                            <Chip label={`${plantilla.productos?.length || 0} ítems`} size="small" sx={{ mt: 1 }} color="primary" variant="outlined" />
                          </Box>
                          <Button
                            variant="contained"
                            size="medium"
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectPlantilla(plantilla)
                            }}
                            startIcon={<PlayArrow />}
                            sx={{ flexShrink: 0, minHeight: 44, px: 2 }}
                          >
                            Iniciar
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  <TablePagination
                    component="div"
                    count={plantillasFiltradas.length}
                    page={pagePlantilla}
                    onPageChange={(_, p) => setPagePlantilla(p)}
                    rowsPerPage={rowsPerPagePlantilla}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPagePlantilla(Number.parseInt(e.target.value, 10))
                      setPagePlantilla(0)
                    }}
                    rowsPerPageOptions={isXs ? [8, 16, 24] : [12, 24, 48]}
                    labelRowsPerPage="Por página"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                  />
                </Paper>
              </>
            )}
          </>
        )}

        <Dialog
          open={openReminderDialog}
          onClose={() => !loading && setOpenReminderDialog(false)}
          fullWidth
          maxWidth="sm"
          fullScreen={isXs}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Antes de empezar</DialogTitle>
          <DialogContent>
            <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
              ¿Actualizaste el stock en <strong>Productos</strong> (Excel) antes de contar?
            </Alert>
            <Typography variant="body2" color="text.secondary">
              El conteo compara lo que hay en depósito con el stock del sistema. Si el Excel está desactualizado, las diferencias no serán útiles.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ flexDirection: "column", gap: 1, p: 2, pt: 0 }}>
            <Button variant="contained" fullWidth size="large" disabled={loading} onClick={handleConfirmarInicioConteo} sx={{ minHeight: 48 }}>
              Sí, continuar
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              disabled={loading}
              onClick={() => {
                setOpenReminderDialog(false)
                setPlantillaToSelect(null)
              }}
              sx={{ minHeight: 48 }}
            >
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3200}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    )
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 1.5, sm: 2 },
        pb: { xs: "calc(100px + env(safe-area-inset-bottom, 0px))", sm: "calc(88px + env(safe-area-inset-bottom, 0px))" },
        px: { xs: 1.5, sm: 3 },
      }}
    >
      <Backdrop open={loading} sx={{ zIndex: (t) => t.zIndex.modal - 1, backdropFilter: "blur(2px)" }}>
        <CircularProgress color="primary" />
      </Backdrop>

      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          mb: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          Conteo activo
        </Typography>
        <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25, mb: 1 }}>
          {selectedPlantilla?.nombre}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
          <Typography variant="body2" color="text.secondary">
            {productosContados} / {totalProductos}
          </Typography>
          <Typography variant="body2" fontWeight={800} color="primary.main">
            {progreso.toFixed(0)}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progreso} sx={{ height: 8, borderRadius: 4 }} />
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre o código…"
          value={searchProducto}
          onChange={(e) => setSearchProducto(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ "& .MuiInputBase-root": { minHeight: 52 } }}
        />
        <Button
          variant="contained"
          color="secondary"
          startIcon={<QrCodeScanner />}
          onClick={() => setScannerOpen(true)}
          sx={{ minHeight: 52, flexShrink: 0, whiteSpace: "nowrap", display: { xs: "none", sm: "inline-flex" } }}
        >
          Escanear
        </Button>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: 2,
          bgcolor: mostrarSoloPendientes ? "warning.50" : "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <FilterList color="action" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700}>
                Solo pendientes
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {mostrarSoloPendientes ? `${productosPendientes} sin cantidad` : "Mostrar todos"}
              </Typography>
            </Box>
          </Stack>
          <Switch checked={mostrarSoloPendientes} onChange={(e) => setMostrarSoloPendientes(e.target.checked)} color="warning" />
        </Stack>
      </Paper>

      <Button
        variant="contained"
        color="success"
        size="large"
        startIcon={<CheckCircle />}
        onClick={() => setOpenFinalizeDialog(true)}
        fullWidth
        disabled={loading}
        sx={{ minHeight: 52, mb: 2, fontWeight: 700 }}
      >
        Finalizar conteo
      </Button>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Productos
        {debouncedSearch.trim() ? ` · ${productosFiltrados.length} resultados` : ""}
      </Typography>

      {productosFiltrados.length === 0 && debouncedSearch.trim() && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay coincidencias para «{debouncedSearch}»
        </Alert>
      )}

      {productosFiltrados.length === 0 && mostrarSoloPendientes && !debouncedSearch.trim() && (
        <Alert severity="success" sx={{ mb: 2 }}>
          No quedan pendientes en esta vista.
        </Alert>
      )}

      <Stack spacing={1} sx={{ mb: 2 }}>
        {productosFiltrados.map((producto) => {
          const hecho = producto.cantidad_real !== null && producto.cantidad_real !== undefined
          return (
            <Card
              key={producto.producto_id}
              onClick={() => handleProductClick(producto)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                cursor: "pointer",
                borderColor: hecho ? "success.light" : "divider",
                bgcolor: hecho ? "success.50" : "background.paper",
                ...cardHoverSx,
                "&:active": { bgcolor: hecho ? "success.100" : "action.selected" },
              }}
            >
              <CardContent sx={{ py: 1.75, px: 2, "&:last-child": { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: "0.95rem", sm: "1rem" }, lineHeight: 1.3 }}>
                      {producto.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {producto.codigo}
                    </Typography>
                    {hecho && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                        <Chip size="small" label={`Real ${producto.cantidad_real}`} color="primary" />
                        <Chip size="small" label={`Sist. ${producto.cantidad_sistema}`} variant="outlined" />
                        {producto.faltante > 0 && <Chip size="small" icon={<TrendingDown />} label={`−${producto.faltante}`} color="error" />}
                        {producto.sobrante > 0 && <Chip size="small" icon={<TrendingUp />} label={`+${producto.sobrante}`} color="warning" />}
                        {producto.faltante === 0 && producto.sobrante === 0 && (
                          <Chip size="small" icon={<CheckCircleOutline />} label="OK" color="success" />
                        )}
                      </Stack>
                    )}
                  </Box>
                  <Chip size="small" label={hecho ? "Listo" : "Pend."} color={hecho ? "success" : "default"} sx={{ flexShrink: 0 }} />
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Stack>

      <Fab
        color="secondary"
        aria-label="escanear código"
        onClick={() => setScannerOpen(true)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          zIndex: theme.zIndex.speedDial,
          display: { xs: "flex", sm: "none" },
        }}
      >
        <QrCodeScanner />
      </Fab>

      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Escanear código
          <IconButton edge="end" onClick={() => setScannerOpen(false)} aria-label="cerrar">
            <Cancel />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <BarcodeScanner onScan={handleScanResult} onClose={() => setScannerOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openExitDialog} onClose={() => setOpenExitDialog(false)} fullWidth maxWidth="sm" fullScreen={isXs} disableEscapeKeyDown>
        <DialogTitle fontWeight={700}>Salir del conteo</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Elegí qué hacer con el progreso guardado en el servidor.
          </Alert>
          <Stack spacing={1.5}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: "error.light", bgcolor: "error.50" }}>
              <Typography variant="subtitle2" fontWeight={700} color="error">
                Borrar conteo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Se elimina del historial. No se puede recuperar.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderColor: "warning.light", bgcolor: "warning.50" }}>
              <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                Dejar pendiente
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Volvé después desde Conteo: se restaura solo.
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: "column", gap: 1, p: 2 }}>
          <Button variant="contained" color="error" fullWidth size="large" disabled={loading} onClick={handleCancelarConteo} sx={{ minHeight: 48 }}>
            Borrar conteo
          </Button>
          <Button variant="contained" color="warning" fullWidth size="large" disabled={loading} onClick={handleDejarPendiente} sx={{ minHeight: 48 }}>
            Dejar pendiente y salir
          </Button>
          <Button variant="outlined" fullWidth size="large" onClick={() => setOpenExitDialog(false)} sx={{ minHeight: 48 }}>
            Seguir contando
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCantidadDialog}
        onClose={() => {
          setOpenCantidadDialog(false)
          setProductoActual(null)
          setCantidadReal("")
          setModoSuma(false)
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{modoSuma ? "Sumar cantidad" : "Cantidad real"}</DialogTitle>
        <DialogContent>
          {productoActual && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {modoSuma && (
                <Alert severity="info" variant="outlined">
                  Se suma a lo ya cargado: <strong>{productoActual.cantidad_real}</strong>
                </Alert>
              )}

              <Paper variant="outlined" sx={{ p: 2, bgcolor: "primary.50", borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>
                  {productoActual.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Código {productoActual.codigo} · Stock sistema {productoActual.cantidad_sistema}
                </Typography>
              </Paper>

              <TextField
                inputRef={cantidadInputRef}
                fullWidth
                label={modoSuma ? "Cantidad a sumar" : "Cantidad contada"}
                type="text"
                value={cantidadReal}
                onChange={(e) => setCantidadReal(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cantidadReal !== "" && !loading) handleSaveCantidad()
                }}
                autoComplete="off"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                sx={{ "& .MuiInputBase-input": { fontSize: "1.35rem", py: 1.75, textAlign: "center" } }}
              />

              {cantidadReal !== "" &&
                (() => {
                  const ing = Number(cantidadReal) || 0
                  const finalQty = modoSuma ? (productoActual.cantidad_real || 0) + ing : ing
                  const difs = calcularDiferencias(finalQty, productoActual.cantidad_sistema)
                  return (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {difs.faltante > 0 && <Chip icon={<TrendingDown />} label={`Faltante ${difs.faltante}`} color="error" />}
                      {difs.sobrante > 0 && <Chip icon={<TrendingUp />} label={`Sobrante ${difs.sobrante}`} color="warning" />}
                      {difs.faltante === 0 && difs.sobrante === 0 && (
                        <Chip icon={<CheckCircleOutline />} label="Igual al sistema" color="success" />
                      )}
                    </Stack>
                  )
                })()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: { xs: "column-reverse", sm: "row" } }}>
          <Button
            fullWidth
            size="large"
            onClick={() => {
              setOpenCantidadDialog(false)
              setProductoActual(null)
              setCantidadReal("")
              setModoSuma(false)
            }}
            sx={{ minHeight: 48 }}
          >
            Cerrar
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={cantidadReal === "" || loading}
            onClick={handleSaveCantidad}
            sx={{ minHeight: 48 }}
          >
            {modoSuma ? "Sumar" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openFinalizeDialog} onClose={() => !loading && setOpenFinalizeDialog(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
        <DialogTitle sx={{ fontWeight: 700 }}>Finalizar conteo</DialogTitle>
        <DialogContent>
          {productosPendientes > 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Quedan <strong>{productosPendientes}</strong> productos sin cantidad. Igual podés finalizar si corresponde.
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              Todos los ítems tienen cantidad registrada.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            El conteo pasará a historial como finalizado.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: "column" }}>
          <Button variant="contained" color="success" fullWidth size="large" disabled={loading} onClick={handleFinalizarConteo} sx={{ minHeight: 48 }}>
            Confirmar finalización
          </Button>
          <Button variant="outlined" fullWidth size="large" disabled={loading} onClick={() => setOpenFinalizeDialog(false)} sx={{ minHeight: 48 }}>
            Volver
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3200}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default ConteoPage
