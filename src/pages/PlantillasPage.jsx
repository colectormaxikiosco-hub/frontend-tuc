"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useData } from "../contexts/DataContext"
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  TablePagination,
  CircularProgress,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Backdrop,
  Fade,
  Skeleton,
  Tooltip,
  InputBase,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
  Description,
  Inventory2,
  WarningAmber,
  PlaylistAdd,
  Save,
} from "@mui/icons-material"

const stockOf = (p) => (p?.stockSistema ?? p?.stock_sistema ?? 0)

const formatApiError = (error) => {
  const data = error?.response?.data
  if (!data) return error?.message || "No se pudo conectar con el servidor. Comprobá tu red."
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.msg || e.message || JSON.stringify(e)).join(" · ")
  }
  return data.message || "Ocurrió un error inesperado"
}

const normalizeSnapshot = (nombre, descripcion, selectedProducts) =>
  JSON.stringify({
    nombre: (nombre || "").trim(),
    descripcion: (descripcion || "").trim(),
    products: [...selectedProducts]
      .map((p) => ({
        id: p.productoId,
        q: Number(p.cantidadDeseada) || 0,
      }))
      .sort((a, b) => a.id - b.id),
  })

const PlantillasPage = () => {
  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const { plantillas, products, conteos, addPlantilla, updatePlantilla, deletePlantilla, loading: contextLoading } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(12)

  const [openEditor, setOpenEditor] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState(null)
  const [formData, setFormData] = useState({ nombre: "", descripcion: "" })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savePhase, setSavePhase] = useState(0)

  const [productQuery, setProductQuery] = useState("")
  const [debouncedProductQuery, setDebouncedProductQuery] = useState("")

  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [warningMessage, setWarningMessage] = useState("")

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [unsavedDialog, setUnsavedDialog] = useState(false)

  const snapshotRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductQuery(productQuery), 220)
    return () => clearTimeout(t)
  }, [productQuery])

  useEffect(() => {
    if (!saving) return
    const steps = ["Validando datos…", "Sincronizando con el servidor…", "Actualizando productos…", "Finalizando…"]
    setSavePhase(0)
    const id = setInterval(() => setSavePhase((p) => (p + 1) % steps.length), 850)
    return () => clearInterval(id)
  }, [saving])

  const filteredPlantillas = useMemo(
    () => plantillas.filter((p) => p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())),
    [plantillas, searchTerm],
  )

  const paginatedPlantillas = filteredPlantillas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleChangePage = (event, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  const isPlantillaEnUso = useCallback(
    (plantillaId) => conteos.some((c) => c.plantilla_id === plantillaId && c.estado === "en_progreso"),
    [conteos],
  )

  const mapPlantillaProducts = useCallback((plantilla) => {
    if (!Array.isArray(plantilla?.productos)) return []
    return plantilla.productos.map((p) => ({
      productoId: p.producto_id,
      nombre: p.nombre,
      codigo: p.codigo,
      cantidadDeseada: p.cantidad_deseada || 0,
      cantidadSistema: stockOf(p),
    }))
  }, [])

  const openEditorWith = useCallback(
    (plantilla = null) => {
      setFormError("")
      setProductQuery("")
      if (plantilla) {
        if (isPlantillaEnUso(plantilla.id)) {
          setWarningMessage(
            `No se puede editar la plantilla «${plantilla.nombre}» porque hay un conteo en progreso que la usa. Finalizá o cancelá ese conteo desde Historial.`,
          )
          setShowWarningDialog(true)
          return
        }
        setEditingPlantilla(plantilla)
        const nombre = plantilla.nombre || ""
        const descripcion = plantilla.descripcion || ""
        setFormData({ nombre, descripcion })
        const mapped = mapPlantillaProducts(plantilla)
        setSelectedProducts(mapped)
        snapshotRef.current = normalizeSnapshot(nombre, descripcion, mapped)
      } else {
        setEditingPlantilla(null)
        setFormData({ nombre: "", descripcion: "" })
        setSelectedProducts([])
        snapshotRef.current = normalizeSnapshot("", "", [])
      }
      setOpenEditor(true)
    },
    [isPlantillaEnUso, mapPlantillaProducts],
  )

  const isDirty = useMemo(() => {
    if (!openEditor || !snapshotRef.current) return false
    return snapshotRef.current !== normalizeSnapshot(formData.nombre, formData.descripcion, selectedProducts)
  }, [openEditor, formData.nombre, formData.descripcion, selectedProducts])

  const performCloseEditor = useCallback(() => {
    setOpenEditor(false)
    setEditingPlantilla(null)
    setFormData({ nombre: "", descripcion: "" })
    setSelectedProducts([])
    setFormError("")
    setProductQuery("")
    snapshotRef.current = null
  }, [])

  const requestCloseEditor = useCallback(() => {
    if (saving) return
    if (isDirty) {
      setUnsavedDialog(true)
      return
    }
    performCloseEditor()
  }, [saving, isDirty, performCloseEditor])

  const confirmDiscard = useCallback(() => {
    setUnsavedDialog(false)
    performCloseEditor()
  }, [performCloseEditor])

  const selectedIds = useMemo(() => new Set(selectedProducts.map((p) => p.productoId)), [selectedProducts])

  const autocompleteOptions = useMemo(() => {
    const q = debouncedProductQuery.trim().toLowerCase()
    let list = products.filter((p) => !selectedIds.has(p.id))
    if (q.length > 0) {
      list = list.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.codigo?.toLowerCase().includes(q) ||
          p.categoria?.toLowerCase().includes(q),
      )
    }
    list = [...list].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }))
    return list.slice(0, 80)
  }, [products, debouncedProductQuery, selectedIds])

  const handleAddFromAutocomplete = useCallback((product) => {
    if (!product?.id) return
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.productoId === product.id)) return prev
      return [
        ...prev,
        {
          productoId: product.id,
          nombre: product.nombre,
          codigo: product.codigo,
          cantidadDeseada: 1,
          cantidadSistema: stockOf(product),
        },
      ]
    })
    setProductQuery("")
  }, [])

  const handleRemoveProduct = useCallback((productoId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.productoId !== productoId))
  }, [])

  const handleUpdateCantidadDeseada = useCallback((productoId, value) => {
    const n = Number.parseInt(String(value), 10)
    setSelectedProducts((prev) =>
      prev.map((p) => (p.productoId === productoId ? { ...p, cantidadDeseada: Number.isFinite(n) ? n : 0 } : p)),
    )
  }, [])

  const invalidQuantities = useMemo(
    () => selectedProducts.filter((p) => !p.cantidadDeseada || p.cantidadDeseada <= 0),
    [selectedProducts],
  )

  const handleSave = async () => {
    setFormError("")
    const nombre = (formData.nombre || "").trim()
    if (!nombre) {
      setFormError("El nombre de la plantilla es obligatorio.")
      return
    }
    if (selectedProducts.length === 0) {
      setFormError("Agregá al menos un producto a la plantilla.")
      return
    }
    if (invalidQuantities.length > 0) {
      setFormError("Cada producto debe tener una cantidad deseada mayor a 0.")
      return
    }

    const plantillaData = {
      nombre,
      descripcion: (formData.descripcion || "").trim(),
      productos: selectedProducts,
    }

    try {
      setSaving(true)
      if (editingPlantilla) {
        await updatePlantilla(editingPlantilla.id, plantillaData)
      } else {
        await addPlantilla(plantillaData)
      }
      performCloseEditor()
    } catch (error) {
      setFormError(formatApiError(error))
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (plantilla) => {
    if (isPlantillaEnUso(plantilla.id)) {
      setWarningMessage(
        `No se puede eliminar «${plantilla.nombre}» porque hay un conteo en progreso. Finalizá o cancelá ese conteo desde Historial.`,
      )
      setShowWarningDialog(true)
      return
    }
    setDeleteTarget(plantilla)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deletePlantilla(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setWarningMessage(formatApiError(error))
      setShowWarningDialog(true)
    } finally {
      setDeleting(false)
    }
  }

  const savePhaseLabels = ["Validando datos…", "Sincronizando con el servidor…", "Actualizando productos…", "Finalizando…"]

  const listLoading = contextLoading && plantillas.length === 0

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, pb: 12 }}>
      <Backdrop
        open={saving}
        sx={{
          zIndex: (t) => t.zIndex.modal + 2,
          backdropFilter: "blur(5px)",
          bgcolor: "rgba(15, 23, 42, 0.42)",
        }}
      >
        <Fade in={saving}>
          <Paper
            elevation={14}
            sx={{
              px: 4,
              py: 3,
              maxWidth: 380,
              textAlign: "center",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
              <CircularProgress size={68} thickness={3} />
              <Save sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 26 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Guardando plantilla
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
              {savePhaseLabels[savePhase]}
            </Typography>
            <Box sx={{ mt: 1, height: 4, bgcolor: "grey.200", borderRadius: 2, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: "35%",
                  bgcolor: "primary.main",
                  borderRadius: 2,
                  animation: "slide 1.1s ease-in-out infinite",
                  "@keyframes slide": {
                    "0%": { transform: "translateX(-120%)" },
                    "100%": { transform: "translateX(320%)" },
                  },
                }}
              />
            </Box>
          </Paper>
        </Fade>
      </Backdrop>

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
            Plantillas de conteo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Armá listas de productos para iniciar conteos más rápido
          </Typography>
        </Box>
        <Chip icon={<Inventory2 />} label={`${plantillas.length} plantillas`} variant="outlined" sx={{ display: { xs: "none", sm: "flex" } }} />
      </Stack>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar plantilla por nombre…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(0)
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => openEditorWith(null)}
          fullWidth
          sx={{ py: 1.25, fontWeight: 600 }}
        >
          Nueva plantilla
        </Button>
      </Stack>

      {listLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={88} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : filteredPlantillas.length === 0 ? (
        <Alert severity="info" icon={<Description />}>
          {plantillas.length === 0
            ? "Todavía no hay plantillas. Creá la primera para agrupar productos y acelerar el conteo."
            : "Ninguna plantilla coincide con la búsqueda."}
        </Alert>
      ) : (
        <>
          <Grid container spacing={1.5}>
            {paginatedPlantillas.map((plantilla) => {
              const enUso = isPlantillaEnUso(plantilla.id)
              const n = plantilla.productos?.length ?? 0
              return (
                <Grid item xs={12} key={plantilla.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      transition: "box-shadow 0.2s, border-color 0.2s",
                      "&:hover": { boxShadow: 2, borderColor: "primary.light" },
                    }}
                  >
                    <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="subtitle1" fontWeight={700} sx={{ wordBreak: "break-word" }}>
                              {plantilla.nombre}
                            </Typography>
                            {enUso && (
                              <Chip
                                size="small"
                                icon={<WarningAmber sx={{ "&&": { fontSize: 16 } }} />}
                                label="En uso"
                                color="warning"
                                variant="filled"
                              />
                            )}
                          </Stack>
                          {plantilla.descripcion ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {plantilla.descripcion}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                              Sin descripción
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={`${n} producto${n !== 1 ? "s" : ""}`} color="primary" variant="outlined" />
                          </Stack>
                        </Box>
                        <Stack direction="row">
                          <Tooltip title={enUso ? "No se puede editar mientras haya un conteo activo" : "Editar"}>
                            <span>
                              <IconButton color="primary" onClick={() => openEditorWith(plantilla)} disabled={enUso} size="small">
                                <Edit />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={enUso ? "No se puede eliminar mientras haya un conteo activo" : "Eliminar"}>
                            <span>
                              <IconButton color="error" onClick={() => requestDelete(plantilla)} disabled={enUso} size="small">
                                <Delete />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>

          <Paper variant="outlined" sx={{ mt: 2, borderRadius: 2 }}>
            <TablePagination
              component="div"
              count={filteredPlantillas.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[12, 24, 48]}
              labelRowsPerPage="Por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Paper>
        </>
      )}

      <Dialog
        open={openEditor}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") requestCloseEditor()
        }}
        maxWidth="md"
        fullWidth
        fullScreen={isXs}
        TransitionProps={{ onExited: () => setUnsavedDialog(false) }}
        PaperProps={{ sx: { borderRadius: { sm: 2 } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <PlaylistAdd color="primary" />
              <Box>
                <Typography variant="h6">{editingPlantilla ? "Editar plantilla" : "Nueva plantilla"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingPlantilla ? "Los cambios reemplazan la lista de productos en el servidor." : "Definí nombre y productos con cantidad esperada."}
                </Typography>
              </Box>
            </Stack>
            <IconButton aria-label="cerrar" onClick={requestCloseEditor} disabled={saving} sx={{ position: "absolute", right: 8, top: 8 }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError("")}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Nombre"
              required
              fullWidth
              value={formData.nombre}
              onChange={(e) => setFormData((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej.: Bebidas sin alcohol"
              disabled={saving}
            />
            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              minRows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData((f) => ({ ...f, descripcion: e.target.value }))}
              disabled={saving}
            />

            <Divider>
              <Chip size="small" label="Productos en la plantilla" />
            </Divider>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Agregar producto
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Buscá por nombre, código o rubro. Se agrega con cantidad 1; podés cambiarla en la tabla.
              </Typography>
              <Autocomplete
                options={autocompleteOptions}
                getOptionLabel={(option) => (typeof option === "string" ? option : `${option.codigo} — ${option.nombre}`)}
                filterOptions={(x) => x}
                inputValue={productQuery}
                onInputChange={(_, v) => setProductQuery(v)}
                onChange={(_, value) => {
                  if (value && typeof value === "object") handleAddFromAutocomplete(value)
                }}
                disabled={saving || products.length === 0}
                noOptionsText={
                  products.length === 0
                    ? "No hay productos en el catálogo"
                    : debouncedProductQuery.trim().length === 0
                      ? "Escribí para buscar o elegí de la lista (primeros del catálogo)"
                      : "Sin coincidencias"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Buscar producto…"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box sx={{ width: "100%", py: 0.25 }}>
                      <Typography variant="body2" noWrap fontWeight={600}>
                        {option.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.codigo} · Stock {stockOf(option)}
                        {option.categoria ? ` · ${option.categoria}` : ""}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Lista ({selectedProducts.length})
                </Typography>
                {invalidQuantities.length > 0 && (
                  <Chip size="small" color="error" label={`${invalidQuantities.length} cantidad inválida`} variant="outlined" />
                )}
              </Stack>

              {selectedProducts.length === 0 ? (
                <Alert severity="info">Todavía no agregaste productos. Usá el buscador de arriba.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: { xs: 360, sm: 420 }, borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "grey.100" }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "grey.100" }}>Producto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.100", width: 110 }}>
                          Stock
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.100", width: 120 }}>
                          Cant. deseada
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "grey.100", width: 56 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProducts.map((row) => {
                        const bad = !row.cantidadDeseada || row.cantidadDeseada <= 0
                        return (
                          <TableRow key={row.productoId} hover selected={bad}>
                            <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.codigo}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {row.nombre}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{row.cantidadSistema}</TableCell>
                            <TableCell align="center">
                              <InputBase
                                type="number"
                                value={row.cantidadDeseada}
                                onChange={(e) => handleUpdateCantidadDeseada(row.productoId, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                inputProps={{ min: 1, style: { textAlign: "center" } }}
                                sx={{
                                  border: 1,
                                  borderColor: bad ? "error.main" : "divider",
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.25,
                                  width: "100%",
                                  maxWidth: 88,
                                  mx: "auto",
                                  display: "block",
                                  bgcolor: bad ? "error.50" : "background.paper",
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => handleRemoveProduct(row.productoId)} disabled={saving}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexDirection: { xs: "column-reverse", sm: "row" }, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={requestCloseEditor} disabled={saving}>
            Cancelar
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={saving ? undefined : <Save />}
            onClick={handleSave}
            disabled={
              saving ||
              !formData.nombre?.trim() ||
              selectedProducts.length === 0 ||
              invalidQuantities.length > 0
            }
          >
            {saving ? (
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <CircularProgress size={18} color="inherit" />
                <span>Guardando…</span>
              </Stack>
            ) : editingPlantilla ? (
              "Guardar cambios"
            ) : (
              "Crear plantilla"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Aviso</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {warningMessage}
          </Typography>
          <Alert severity="info" variant="outlined">
            En <strong>Historial</strong> podés finalizar o cancelar el conteo en progreso y luego volver a editar la plantilla.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" fullWidth onClick={() => setShowWarningDialog(false)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar plantilla</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar <strong>{deleteTarget?.nombre}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button fullWidth onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button fullWidth color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={22} color="inherit" /> : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={unsavedDialog} onClose={() => setUnsavedDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Descartar cambios?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tenés cambios sin guardar en esta plantilla.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: "column", gap: 1 }}>
          <Button fullWidth variant="contained" onClick={() => setUnsavedDialog(false)}>
            Seguir editando
          </Button>
          <Button fullWidth color="inherit" onClick={confirmDiscard}>
            Descartar y salir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default PlantillasPage
