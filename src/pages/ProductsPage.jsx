"use client"

import { useState, useRef, useEffect } from "react"
import { useData } from "../contexts/DataContext"
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText as MuiListItemText,
  Stack,
  Divider,
  Backdrop,
  Fade,
  Tooltip,
} from "@mui/material"
import {
  Search,
  Edit,
  Delete,
  Add,
  CloudUpload,
  ExpandMore,
  DeleteSweep,
  CheckCircle,
  Error as ErrorIcon,
  WarningAmber,
  MoreVert,
  Inventory2,
  SyncAlt,
} from "@mui/icons-material"
import { productService } from "../services/productService"

const TABLE_ROW_APPROX_PX = 48
const MIN_VISIBLE_ROWS = 30
const TABLE_MIN_HEIGHT_PX = TABLE_ROW_APPROX_PX * MIN_VISIBLE_ROWS

const normalizeReport = (raw) => {
  if (!raw || typeof raw !== "object") return null
  return {
    mode: raw.mode || "full",
    totalFilasArchivo: raw.totalFilasArchivo ?? 0,
    procesadosOk: raw.procesadosOk ?? raw.intentosValidos ?? 0,
    insertados: raw.insertados ?? 0,
    actualizados: raw.actualizados ?? raw.actualizadosEnBd ?? 0,
    filasOmitidas: raw.filasOmitidas ?? [],
    productosSinStock: raw.productosSinStock ?? raw.productosSinStockEnArchivo ?? [],
    sinCoincidencia: raw.sinCoincidencia ?? [],
    intentosValidos: raw.intentosValidos,
    actualizadosEnBd: raw.actualizadosEnBd,
  }
}

const ReportList = ({ items, primaryKey, secondaryKey, emptyText, max = 80 }) => {
  if (!items?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    )
  }
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <List dense disablePadding sx={{ maxHeight: 280, overflow: "auto", bgcolor: "grey.50", borderRadius: 1 }}>
      {shown.map((item, i) => (
        <ListItem key={`${primaryKey(item)}-${i}`} sx={{ py: 0.25, alignItems: "flex-start" }}>
          <MuiListItemText
            primary={primaryKey(item)}
            secondary={secondaryKey ? secondaryKey(item) : undefined}
            primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            secondaryTypographyProps={{ variant: "caption" }}
          />
        </ListItem>
      ))}
      {rest > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1 }}>
          … y {rest} más (recorta el archivo o revisa en Excel)
        </Typography>
      )}
    </List>
  )
}

const ProductsPage = () => {
  const { products, addProduct, updateProduct, deleteProduct, refreshData } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    stockSistema: 0,
  })
  const [uploadDialog, setUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadReport, setUploadReport] = useState(null)
  const [lastUploadMode, setLastUploadMode] = useState("full")
  const [anchorEl, setAnchorEl] = useState(null)
  const [deleteAllDialog, setDeleteAllDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(30)

  const fileInputRef = useRef(null)

  const catalogEmpty = products.length === 0

  useEffect(() => {
    if (!uploading) return
    const steps =
      lastUploadMode === "full"
        ? ["Leyendo hoja de cálculo…", "Validando filas…", "Guardando en base de datos…", "Sincronizando catálogo…"]
        : ["Leyendo archivo…", "Validando códigos…", "Actualizando stock…", "Aplicando cambios…"]
    setUploadPhase(0)
    const id = setInterval(() => {
      setUploadPhase((p) => (p + 1) % steps.length)
    }, 900)
    return () => clearInterval(id)
  }, [uploading, lastUploadMode])

  const filteredProducts = products.filter(
    (p) =>
      (p.nombre && p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.codigo && p.codigo.includes(searchTerm)) ||
      (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const paginatedProducts = filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setPage(0)
  }

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        codigo: product.codigo || "",
        nombre: product.nombre || "",
        categoria: product.categoria || "",
        stockSistema: product.stockSistema ?? product.stock_sistema ?? 0,
        precio: product.precio,
      })
    } else {
      setEditingProduct(null)
      setFormData({ codigo: "", nombre: "", categoria: "", stockSistema: 0 })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingProduct(null)
    setFormData({ codigo: "", nombre: "", categoria: "", stockSistema: 0 })
  }

  const handleSave = () => {
    if (editingProduct) {
      updateProduct(editingProduct.id, formData)
    } else {
      addProduct(formData)
    }
    handleCloseDialog()
  }

  const handleDelete = (id) => {
    if (window.confirm("¿Está seguro de eliminar este producto?")) {
      deleteProduct(id)
    }
  }

  const handleCloseUploadDialog = () => {
    if (uploading) return
    setUploadDialog(false)
    setUploadStatus("idle")
    setUploadMessage("")
    setUploadReport(null)
  }

  const handleUnifiedImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event) => {
    const file = event.target.files[0]
    event.target.value = ""

    if (!file) return

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ]
    const isCSV = file.name.endsWith(".csv")

    if (!validTypes.includes(file.type) && !isCSV) {
      alert("Seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv)")
      return
    }

    const mode = catalogEmpty ? "full" : "stock"
    setLastUploadMode(mode)
    setUploading(true)
    setUploadStatus("idle")
    setUploadMessage("")
    setUploadReport(null)

    try {
      const body =
        mode === "full" ? await productService.importFromExcel(file) : await productService.updateStockFromExcel(file)

      const report = normalizeReport(body?.data?.report)
      setUploadReport(report)
      setUploadMessage(body?.message || "Operación finalizada")
      const hasIssues =
        (report?.filasOmitidas?.length ?? 0) > 0 ||
        (report?.sinCoincidencia?.length ?? 0) > 0 ||
        (report?.productosSinStock?.length ?? 0) > 0
      setUploadStatus(hasIssues ? "warning" : "success")
      await refreshData()
    } catch (error) {
      const data = error.response?.data
      const report = normalizeReport(data?.data?.report)
      setUploadReport(report)
      setUploadMessage(data?.message || error.message || "Error al procesar el archivo")
      setUploadStatus("error")
      await refreshData().catch(() => {})
    } finally {
      setUploading(false)
      setUploadDialog(true)
    }
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      await productService.deleteAll()
      await refreshData()
      setDeleteAllDialog(false)
      alert("Todos los productos han sido eliminados")
    } catch (error) {
      alert(error.response?.data?.message || "Error al eliminar productos")
    } finally {
      setDeleting(false)
    }
  }

  const loadingSteps =
    lastUploadMode === "full"
      ? ["Leyendo hoja de cálculo…", "Validando filas…", "Guardando en base de datos…", "Sincronizando catálogo…"]
      : ["Leyendo archivo…", "Validando códigos…", "Actualizando stock…", "Aplicando cambios…"]

  const report = uploadReport
  const omitidasCount = report?.filasOmitidas?.length ?? 0
  const sinCoincCount = report?.sinCoincidencia?.length ?? 0
  const sinStockCount = report?.productosSinStock?.length ?? 0

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Productos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestión del catálogo · {products.length} producto{products.length !== 1 ? "s" : ""} en sistema
        </Typography>
      </Box>

      <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre, código o categoría…"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "stretch" }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} fullWidth sx={{ sm: { flex: "0 0 auto" } }}>
            Agregar
          </Button>
          <Tooltip
            title={
              catalogEmpty
                ? "Primera carga: crea o actualiza productos según el Excel (código, descripción, rubro, stock…)."
                : "Actualiza solo el stock en la base según los códigos del archivo. Las filas sin código en BD se listan al finalizar."
            }
          >
            <Button
              variant="contained"
              color="secondary"
              startIcon={catalogEmpty ? <Inventory2 /> : <SyncAlt />}
              onClick={handleUnifiedImportClick}
              fullWidth
              disabled={uploading}
              sx={{
                py: 1.25,
                background: catalogEmpty ? "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)" : undefined,
                boxShadow: 2,
              }}
            >
              <Box sx={{ textAlign: "left", width: "100%" }}>
                <Typography variant="button" display="block" fontWeight={700}>
                  {catalogEmpty ? "Carga completa desde Excel" : "Actualizar desde Excel"}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.92, display: "block", fontWeight: 400 }}>
                  {catalogEmpty
                    ? "Catálogo vacío: importación completa (altas y modificaciones)"
                    : "Catálogo con datos: solo actualización de stock por código"}
                </Typography>
              </Box>
            </Button>
          </Tooltip>
          <IconButton
            aria-label="Más opciones"
            onClick={handleMenuOpen}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              alignSelf: { xs: "center", sm: "stretch" },
              height: { sm: "auto" },
            }}
          >
            <MoreVert />
          </IconButton>
        </Stack>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              handleMenuClose()
              setDeleteAllDialog(true)
            }}
            disabled={products.length === 0}
          >
            <ListItemIcon>
              <DeleteSweep fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Eliminar todo el catálogo" secondary="Irreversible" />
          </MenuItem>
        </Menu>
      </Box>

      <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileSelected} />

      <Backdrop
        open={uploading}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 1,
          flexDirection: "column",
          backdropFilter: "blur(6px)",
          bgcolor: "rgba(15, 23, 42, 0.45)",
        }}
      >
        <Fade in={uploading}>
          <Paper
            elevation={12}
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
              <CircularProgress size={72} thickness={3} sx={{ color: "primary.main" }} />
              <CloudUpload
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 28,
                  color: "primary.main",
                }}
              />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {lastUploadMode === "full" ? "Importando catálogo" : "Actualizando stock"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44, mb: 2 }}>
              {loadingSteps[uploadPhase]}
            </Typography>
            <Box sx={{ width: "100%", height: 4, bgcolor: "grey.200", borderRadius: 2, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: "40%",
                  bgcolor: "primary.main",
                  borderRadius: 2,
                  animation: "indeterminate 1.2s ease-in-out infinite",
                  "@keyframes indeterminate": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(350%)" },
                  },
                }}
              />
            </Box>
          </Paper>
        </Fade>
      </Backdrop>

      <Dialog open={uploadDialog} onClose={handleCloseUploadDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {uploadStatus === "success" && <CheckCircle color="success" fontSize="large" />}
            {uploadStatus === "warning" && <WarningAmber color="warning" fontSize="large" />}
            {uploadStatus === "error" && <ErrorIcon color="error" fontSize="large" />}
            <Box>
              <Typography variant="h6" component="span">
                {uploadStatus === "success" && "Importación completada"}
                {uploadStatus === "warning" && "Completado con observaciones"}
                {uploadStatus === "error" && "No se pudo completar"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {lastUploadMode === "full" ? "Modo: carga completa" : "Modo: actualización de stock"}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {uploadMessage}
          </Typography>

          {report && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Resumen
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip size="small" label={`Filas en archivo: ${report.totalFilasArchivo}`} />
                  {report.mode === "full" && (
                    <>
                      <Chip size="small" color="primary" variant="outlined" label={`Procesados OK: ${report.procesadosOk}`} />
                      <Chip size="small" color="success" variant="outlined" label={`Nuevos: ${report.insertados}`} />
                      <Chip size="small" color="info" variant="outlined" label={`Actualizados: ${report.actualizados}`} />
                    </>
                  )}
                  {report.mode === "stock" && (
                    <>
                      <Chip size="small" color="primary" variant="outlined" label={`Códigos válidos: ${report.intentosValidos ?? report.procesadosOk}`} />
                      <Chip size="small" color="success" variant="outlined" label={`Stock actualizado: ${report.actualizadosEnBd ?? report.actualizados}`} />
                    </>
                  )}
                  {omitidasCount > 0 && <Chip size="small" color="warning" label={`Filas omitidas: ${omitidasCount}`} />}
                  {sinCoincCount > 0 && <Chip size="small" color="error" variant="outlined" label={`Sin coincidencia: ${sinCoincCount}`} />}
                  {sinStockCount > 0 && <Chip size="small" label={`Stock 0 en archivo: ${sinStockCount}`} />}
                </Stack>
              </Paper>

              {report.mode === "full" && sinStockCount > 0 && (
                <Accordion defaultExpanded={sinStockCount <= 15}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight={600}>
                      Productos con stock 0 en el archivo ({sinStockCount})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Se importaron correctamente; revisá si corresponde o si el Excel tenía el stock vacío o en cero.
                    </Typography>
                    <ReportList
                      items={report.productosSinStock}
                      primaryKey={(p) => `${p.codigo} — ${p.nombre || "Sin nombre"}`}
                      emptyText="Ninguno"
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {report.mode === "stock" && sinStockCount > 0 && (
                <Accordion defaultExpanded={sinStockCount <= 15}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight={600}>Filas con stock 0 en el archivo ({sinStockCount})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ReportList
                      items={report.productosSinStock}
                      primaryKey={(p) => `${p.codigo} — ${p.nombre || p.nombreArchivo || "Sin descripción en archivo"}`}
                      emptyText="Ninguno"
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {omitidasCount > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight={600}>Filas omitidas ({omitidasCount})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No se importaron porque faltan datos obligatorios (código o nombre/descripción).
                    </Typography>
                    <ReportList
                      items={report.filasOmitidas}
                      primaryKey={(r) => `Fila ${r.fila}: ${r.codigo}`}
                      secondaryKey={(r) => `${r.nombre ? `${r.nombre} · ` : ""}${r.motivo}`}
                      emptyText="Ninguna"
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {sinCoincCount > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight={600} color="error.main">
                      Códigos no actualizados — no existen en la base ({sinCoincCount})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      En modo actualización solo se modifica stock de productos ya cargados. Corregí el código o hacé una carga completa si necesitás dar de alta nuevos ítems.
                    </Typography>
                    <ReportList
                      items={report.sinCoincidencia}
                      primaryKey={(r) => r.codigo}
                      secondaryKey={(r) => r.nombreArchivo || r.motivo || null}
                      emptyText="Ninguno"
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {uploadStatus === "success" && omitidasCount === 0 && sinCoincCount === 0 && (
                <Alert severity="success" icon={<CheckCircle />}>
                  Todo el archivo válido fue procesado sin observaciones.
                </Alert>
              )}
            </Stack>
          )}

          {uploadStatus === "error" && !report && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Revisá el formato del Excel (columnas Código, Descripción, Stock, etc.) y que el archivo no esté vacío o corrupto.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseUploadDialog} variant="contained" disabled={uploading}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteAllDialog} onClose={() => !deleting && setDeleteAllDialog(false)}>
        <DialogTitle>Eliminar todos los productos</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se eliminarán permanentemente los {products.length} productos del sistema.
          </Alert>
          <Typography>¿Confirma continuar? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialog(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={24} color="inherit" /> : "Eliminar todo"}
          </Button>
        </DialogActions>
      </Dialog>

      {filteredProducts.length === 0 ? (
        <Alert severity="info">
          {products.length === 0
            ? "No hay productos cargados. Usá «Carga completa desde Excel» para importar el catálogo."
            : "Ningún resultado coincide con la búsqueda."}
        </Alert>
      ) : (
        <Paper elevation={2} sx={{ overflow: "hidden" }}>
          <TableContainer
            sx={{
              minHeight: { xs: Math.min(TABLE_MIN_HEIGHT_PX, 520), sm: TABLE_MIN_HEIGHT_PX },
              maxHeight: { xs: "min(78vh, 1500px)", md: "min(82vh, 1600px)" },
              "& .MuiTableCell-root": {
                py: 1.25,
                px: { xs: 1, sm: 2 },
              },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", bgcolor: "primary.main", color: "white" }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: "bold", bgcolor: "primary.main", color: "white" }}>Nombre</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "white",
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Categoría
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", bgcolor: "primary.main", color: "white" }} align="center">
                    Stock
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", bgcolor: "primary.main", color: "white" }} align="center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    sx={{
                      "&:nth-of-type(odd)": { bgcolor: "action.hover" },
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                  >
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{product.codigo}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                          {product.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", sm: "none" } }}>
                          {product.categoria}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Chip label={product.categoria} size="small" color="primary" variant="outlined" sx={{ fontSize: "0.75rem" }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={product.stock_sistema ?? product.stockSistema ?? 0}
                        size="small"
                        color={
                          (product.stock_sistema ?? product.stockSistema ?? 0) > 10
                            ? "success"
                            : (product.stock_sistema ?? product.stockSistema ?? 0) > 0
                              ? "warning"
                              : "error"
                        }
                        sx={{ fontWeight: "bold", minWidth: 50 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(product)} sx={{ p: { xs: 0.5, sm: 1 } }}>
                          <Edit sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(product.id)} sx={{ p: { xs: 0.5, sm: 1 } }}>
                          <Delete sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          <TablePagination
            component="div"
            count={filteredProducts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[30, 50, 100]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{
              ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
            }}
          />
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingProduct ? "Editar producto" : "Agregar producto"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Código"
              fullWidth
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            />
            <TextField
              label="Nombre"
              fullWidth
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <TextField
              label="Categoría"
              fullWidth
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            />
            <TextField
              label="Stock sistema"
              type="number"
              fullWidth
              value={formData.stockSistema}
              onChange={(e) => setFormData({ ...formData, stockSistema: Number.parseInt(e.target.value, 10) || 0 })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ProductsPage
