import { GoogleGenerativeAI } from '@google/generative-ai'
import sharp from 'sharp'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const MAX_IMAGE_WIDTH = 800
const API_TIMEOUT_MS = 30000

const VISION_PROMPT = `Analyze this image. Extract visual content and return ONLY valid JSON:
{
  "appName": "app/website name if screenshot, else empty string",
  "content": "detailed description of what you see",
  "suggestedName": "3-6 word descriptive filename (no extension, use underscores)",
  "category": "one of: Screenshots, Photos, Documents, Education, Work, Finance, Design, Code, Personal, Social, Downloads",
  "tags": ["3-5", "relevant", "tags"],
  "description": "one sentence describing the image"
}

Rules:
- Describe ACTUAL visual content, not file type
- NEVER copy original filename
- Use underscores for suggestedName (e.g. "python_code_editor_dark_theme")`

const IMAGE_MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
]

let cachedModel = null
let cachedModelName = null

function getModel(modelName) {
  if (cachedModelName !== modelName) {
    cachedModel = genAI.getGenerativeModel({ model: modelName })
    cachedModelName = modelName
  }
  return cachedModel
}

async function resizeImage(imageBuffer, extension) {
  const inputExt = extension.toLowerCase()
  if (inputExt === '.gif') return { buffer: imageBuffer, mimeType: 'image/gif' }

  const resized = await sharp(imageBuffer)
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  return { buffer: resized, mimeType: 'image/jpeg' }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API timeout after ${ms}ms`)), ms)
    )
  ])
}

export async function analyzeImageWithGemini(imageBuffer, extension) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const { buffer: resizedBuffer, mimeType } = await resizeImage(imageBuffer, extension)

  let lastError
  for (const modelName of VISION_MODELS) {
    try {
      const model = getModel(modelName)

      const result = await withTimeout(
        model.generateContent([
          VISION_PROMPT,
          {
            inlineData: {
              mimeType,
              data: resizedBuffer.toString('base64')
            }
          }
        ]),
        API_TIMEOUT_MS
      )

      const response = result.response
      const text = response.text()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        appName: parsed.appName || '',
        content: parsed.content || '',
        suggestedName: parsed.suggestedName || '',
        category: parsed.category || 'Screenshots',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        description: parsed.description || ''
      }
    } catch (error) {
      lastError = error
      const isModelGone = error.message.includes('404') || error.message.includes('is no longer available')
      if (isModelGone) {
        console.log(`[AI] Model ${modelName} unavailable, trying next...`)
        continue
      }
      throw error
    }
  }

  throw lastError
}

const PDF_PROMPT = `Analyze this PDF document. Extract its content and return ONLY valid JSON:
{
  "content": "the full text content of the document (in its original language)",
  "suggestedName": "3-6 word descriptive filename (no extension, use underscores, use the document's language)",
  "category": "one of: Screenshots, Photos, Documents, Education, Work, Finance, Design, Code, Personal, Social, Downloads",
  "tags": ["3-5", "relevant", "tags", "in the document's language"],
  "description": "one sentence describing the document (in the document's language)"
}

Rules:
- Extract the ACTUAL text content from the PDF
- Keep text in its original language (Hindi, English, etc.)
- NEVER copy original filename
- Use underscores for suggestedName`

export async function analyzePdfWithGemini(pdfBuffer) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  let lastError
  for (const modelName of VISION_MODELS) {
    try {
      const model = getModel(modelName)

      const result = await withTimeout(
        model.generateContent([
          PDF_PROMPT,
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBuffer.toString('base64')
            }
          }
        ]),
        API_TIMEOUT_MS
      )

      const response = result.response
      const text = response.text()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        content: parsed.content || '',
        suggestedName: parsed.suggestedName || '',
        category: parsed.category || 'Documents',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        description: parsed.description || ''
      }
    } catch (error) {
      lastError = error
      const isModelGone = error.message.includes('404') || error.message.includes('is no longer available')
      if (isModelGone) {
        console.log(`[AI] Model ${modelName} unavailable, trying next...`)
        continue
      }
      throw error
    }
  }

  throw lastError
}
