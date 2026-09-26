import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import healthRoutes from './routes/healthRoutes.js'
import authRoutes from './routes/authRoutes.js'
import fileRoutes from './routes/fileRoutes.js'
import folderRoutes from './routes/folderRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')))

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}))
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/v1/health', healthRoutes)
app.use('/api/v1/auth', authLimiter, authRoutes)
app.use('/api/v1/files', apiLimiter, fileRoutes)
app.use('/api/v1/folders', apiLimiter, folderRoutes)
app.use('/api/v1/categories', apiLimiter, categoryRoutes)
app.use('/api/v1/ai', apiLimiter, aiRoutes)
app.use('/api/v1/search', apiLimiter, searchRoutes)

if (process.env.NODE_ENV === 'production') {
  const clientDist = [
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../../client/dist')
  ].find((dir) => fs.existsSync(path.join(dir, 'index.html')))

  if (clientDist) {
    app.use(express.static(clientDist))
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }
}

app.use(notFound)
app.use(errorHandler)

export default app
