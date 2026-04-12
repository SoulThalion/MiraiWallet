import { Router } from 'express'
import multer from 'multer'
import * as ctrl  from '../controllers/transaction.controller'
import { createTransactionRules, updateTransactionRules, listTransactionRules } from '../validators/transaction.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /\.(xlsx|xls)$/i.test(file.originalname) ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    if (ok) cb(null, true)
    else cb(new Error('Solo se admiten archivos Excel (.xlsx / .xls).'))
  },
})

const router = Router()
router.use(authenticate)

// Static routes BEFORE dynamic /:id — prevents route shadowing
router.get('/summary/monthly',    ctrl.monthlySummary)
router.get('/summary/categories', ctrl.categoryBreakdown)

/** Import Excel ING (multipart: `file`, `accountId`). */
router.post('/import-ing-xlsx', upload.single('file'), ctrl.importIngXlsx)
/** Alias por si algún cliente o doc usa la ruta con barra intermedia. */
router.post('/import/ing-xlsx', upload.single('file'), ctrl.importIngXlsx)
/** Solo alinea saldo de la cuenta con la columna «Saldo» del último movimiento (sin duplicar filas). */
router.post('/sync-balance-ing-xlsx', upload.single('file'), ctrl.syncBalanceIngXlsx)

router.get   ('/',    listTransactionRules,   validate, ctrl.list)
router.post  ('/',    createTransactionRules, validate, ctrl.create)
router.get   ('/:id', ctrl.getOne)
router.patch ('/:id', updateTransactionRules, validate, ctrl.update)
router.delete('/:id', ctrl.remove)

export default router
