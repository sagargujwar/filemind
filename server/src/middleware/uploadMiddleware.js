import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf'
]

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf']

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()

  if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Only PNG, JPG, JPEG, WEBP, and PDF files are allowed'), false)
  }

  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

export default upload
