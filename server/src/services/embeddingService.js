import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const EMBEDDING_MODEL = 'gemini-embedding-001'

let embeddingModel = null

function getEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  }
  return embeddingModel
}

export async function generateEmbedding(text, taskType = 'RETRIEVAL_DOCUMENT') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured for embeddings')
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text')
  }

  const truncatedText = text.substring(0, 8000)

  const model = getEmbeddingModel()
  const result = await model.embedContent({
    content: {
      parts: [{ text: truncatedText }]
    },
    taskType
  })

  return result.embedding.values
}

export function buildFileEmbeddingText(file, categoryName = '') {
  const parts = []

  if (file.originalName) {
    parts.push(file.originalName)
  }

  if (file.generatedName && file.generatedName !== file.originalName) {
    parts.push(file.generatedName)
  }

  if (file.description) {
    parts.push(file.description)
  }

  if (file.tags && file.tags.length > 0) {
    parts.push(file.tags.join(' '))
  }

  if (file.extractedText) {
    parts.push(file.extractedText)
  }

  if (categoryName) {
    parts.push(`Category: ${categoryName}`)
  }

  if (file.extension) {
    parts.push(`File type: ${file.extension}`)
  }

  return parts.join(' ').trim()
}

export async function embedFile(file, categoryName = '') {
  const text = buildFileEmbeddingText(file, categoryName)

  if (!text) {
    return { embedding: null, model: null }
  }

  const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT')
  return {
    embedding,
    model: EMBEDDING_MODEL
  }
}

export async function embedQuery(query) {
  return generateEmbedding(query, 'RETRIEVAL_QUERY')
}

export async function reembedFile(file, categoryName = '') {
  try {
    return await embedFile(file, categoryName)
  } catch (err) {
    console.error(`[Embedding] Re-embed failed for ${file.originalName}:`, err.message)
    return { embedding: null, model: null }
  }
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const SYNONYM_MAP = {
  find: ['search', 'locate', 'discover', 'look', 'found', 'query', 'browse', 'seek'],
  search: ['find', 'locate', 'discover', 'look', 'query', 'browse', 'seek', 'found'],
  locate: ['find', 'search', 'discover', 'look', 'found'],

  person: ['man', 'woman', 'guy', 'girl', 'boy', 'human', 'individual', 'people', 'someone', 'gentleman', 'lady', 'male', 'female'],
  man: ['person', 'guy', 'boy', 'male', 'gentleman', 'human'],
  woman: ['person', 'girl', 'lady', 'female', 'human'],
  guy: ['person', 'man', 'boy', 'male', 'human'],
  girl: ['person', 'woman', 'lady', 'female', 'human'],
  boy: ['person', 'man', 'guy', 'male', 'human'],
  human: ['person', 'man', 'woman', 'people', 'guy', 'girl', 'boy'],
  people: ['person', 'man', 'woman', 'guy', 'girl', 'human'],
  selfie: ['person', 'man', 'woman', 'portrait', 'photo'],
  portrait: ['person', 'man', 'woman', 'selfie'],
  face: ['person', 'man', 'woman', 'selfie', 'portrait'],

  game: ['gaming', 'gamer', 'play', 'player', 'esports', 'bgmi', 'pubg', 'fortnite', 'valorant'],
  gaming: ['game', 'gamer', 'play', 'player', 'esports', 'stream'],
  gamer: ['game', 'gaming', 'play', 'player', 'esports'],
  bgmi: ['game', 'gaming', 'battlegrounds', 'battle royale'],
  play: ['game', 'gaming', 'player', 'gamer'],

  chat: ['messaging', 'conversation', 'talk', 'message', 'text', 'whatsapp', 'msg', 'chats', 'texting'],
  text: ['chat', 'message', 'messaging', 'conversation', 'sms', 'msg', 'texting', 'whatsapp'],
  message: ['chat', 'text', 'messaging', 'conversation', 'msg', 'whatsapp'],
  messaging: ['chat', 'text', 'message', 'conversation', 'whatsapp', 'msg'],
  conversation: ['chat', 'talk', 'discussion', 'message', 'messaging'],
  talk: ['chat', 'conversation', 'discussion', 'speak'],
  whatsapp: ['chat', 'messaging', 'message', 'whatsapp', 'text'],

  video: ['youtube', 'watch', 'stream', 'clip', 'recording', 'vlog', 'mp4'],
  youtube: ['video', 'watch', 'stream', 'channel', 'vlog', 'yt'],
  vlog: ['video', 'blog', 'youtube', 'channel', 'content', 'vlogs'],
  watch: ['video', 'youtube', 'stream', 'view'],
  stream: ['video', 'youtube', 'live', 'broadcast'],
  recording: ['video', 'screen', 'capture', 'clip'],

  photo: ['image', 'picture', 'camera', 'snapshot', 'pic', 'photos', 'photography'],
  image: ['photo', 'picture', 'screenshot', 'png', 'jpg', 'jpeg', 'img', 'images'],
  picture: ['photo', 'image', 'pic', 'snapshot'],
  screenshot: ['screen', 'capture', 'snap', 'screen recording', 'screengrab', 'snip'],
  thumbnail: ['preview', 'image', 'photo', 'cover', 'thumb'],

  code: ['programming', 'developer', 'script', 'coding', 'software', 'dev', 'python', 'javascript', 'react'],
  programming: ['code', 'developer', 'coding', 'software', 'dev', 'developer'],
  coding: ['code', 'programming', 'developer', 'dev'],
  developer: ['code', 'programming', 'coding', 'dev'],
  dev: ['code', 'development', 'developer', 'programming'],
  python: ['code', 'programming', 'coding', 'script'],
  javascript: ['code', 'programming', 'coding', 'js', 'node'],
  react: ['code', 'programming', 'coding', 'frontend', 'ui'],

  food: ['eat', 'restaurant', 'cooking', 'meal', 'cuisine', 'dish', 'street food', 'hotel'],
  restaurant: ['food', 'eat', 'dining', 'hotel', 'cafe'],
  cooking: ['food', 'recipe', 'kitchen', 'chef', 'meal'],

  music: ['song', 'audio', 'playlist', 'album', 'track', 'listen'],
  song: ['music', 'audio', 'track', 'album'],
  audio: ['music', 'sound', 'song', 'listen'],

  document: ['doc', 'file', 'paper', 'report', 'pdf', 'docs'],
  docs: ['document', 'doc', 'paper', 'report'],
  report: ['document', 'paper', 'doc', 'analysis'],
  pdf: ['document', 'doc', 'paper', 'file'],

  error: ['bug', 'issue', 'fail', 'crash', 'problem', 'fix', 'failed', 'err', 'bugs'],
  bug: ['error', 'issue', 'crash', 'problem', 'fix', 'debug'],
  issue: ['error', 'bug', 'problem', 'fix', 'crash'],
  fail: ['error', 'failed', 'bug', 'crash', 'broken', 'issue'],
  failed: ['error', 'fail', 'bug', 'crash', 'issue', 'broken'],
  crash: ['error', 'bug', 'fail', 'issue', 'broken'],

  login: ['signin', 'auth', 'authentication', 'password', 'access', 'log in', 'signin'],
  signin: ['login', 'auth', 'authentication', 'access'],
  auth: ['login', 'authentication', 'signin', 'access', 'password'],
  password: ['auth', 'login', 'secret', 'key'],

  web: ['website', 'browser', 'internet', 'online', 'app', 'www', 'http'],
  website: ['web', 'browser', 'online', 'site', 'http'],
  browser: ['web', 'chrome', 'edge', 'firefox', 'safari'],
  app: ['application', 'software', 'program', 'tool', 'application'],
  application: ['app', 'software', 'program', 'tool'],

  design: ['ui', 'ux', 'mockup', 'wireframe', 'figma', 'sketch', 'layout'],
  ui: ['design', 'ux', 'interface', 'layout', 'frontend'],
  ux: ['design', 'ui', 'interface', 'user experience'],
  interface: ['ui', 'screen', 'view', 'layout', 'dashboard', 'design'],
  figma: ['design', 'ui', 'ux', 'mockup', 'wireframe'],

  work: ['office', 'business', 'professional', 'job', 'project', 'workplace'],
  office: ['work', 'business', 'professional', 'job'],
  business: ['work', 'office', 'professional', 'corporate'],
  project: ['work', 'task', 'assignment', 'job'],

  personal: ['private', 'own', 'self', 'individual', 'me', 'my'],

  education: ['study', 'learn', 'course', 'tutorial', 'lecture', 'class', 'exam', 'school', 'college'],
  study: ['education', 'learn', 'course', 'tutorial', 'exam', 'notes'],
  learn: ['education', 'study', 'course', 'tutorial'],
  tutorial: ['education', 'learn', 'course', 'guide', 'how-to'],
  course: ['education', 'class', 'learn', 'study', 'lecture'],
  exam: ['test', 'quiz', 'assessment', 'education'],
  notes: ['study', 'education', 'lecture', 'class'],

  finance: ['money', 'bank', 'payment', 'invoice', 'tax', 'salary', 'expense'],
  money: ['finance', 'bank', 'payment', 'cash', 'rupee'],
  bank: ['finance', 'money', 'payment', 'account'],
  invoice: ['bill', 'receipt', 'payment', 'finance'],
  tax: ['finance', 'gst', 'income tax', 'deduction'],

  social: ['media', 'instagram', 'facebook', 'twitter', 'linkedin', 'profile'],
  instagram: ['social', 'photo', 'story', 'reel', 'post'],
  profile: ['account', 'user', 'social', 'avatar'],

  indore: ['city', 'mp', 'madhya pradesh', 'india', 'location'],
  city: ['urban', 'town', 'place', 'location'],
  india: ['country', 'nation', 'desi'],

  dark: ['theme', 'mode', 'night', 'black', 'dark mode', 'dark theme'],
  theme: ['dark', 'light', 'mode', 'style', 'appearance'],
  mode: ['theme', 'dark', 'light', 'setting'],

  screen: ['display', 'monitor', 'screenshot', 'capture', 'desktop', 'monitor'],
  display: ['screen', 'monitor', 'view'],
  monitor: ['screen', 'display', 'desktop'],
  desktop: ['screen', 'computer', 'pc', 'monitor', 'windows'],

  page: ['screen', 'view', 'interface', 'layout', 'webpage'],
  view: ['screen', 'page', 'display', 'show', 'look'],
  results: ['output', 'data', 'findings', 'search', 'result'],
  file: ['document', 'doc', 'data', 'record'],
  data: ['information', 'content', 'file', 'record'],

  chatgpt: ['ai', 'chatgpt', 'gpt', 'openai', 'chat'],
  ai: ['artificial intelligence', 'chatgpt', 'gpt', 'machine learning', 'ml'],
  gpt: ['chatgpt', 'ai', 'openai', 'model'],

  group: ['team', 'chat', 'whatsapp', 'group chat'],

  windows: ['os', 'microsoft', 'pc', 'computer', 'desktop'],
  linux: ['ubuntu', 'os', 'terminal', 'command line'],
  mac: ['apple', 'macbook', 'os', 'macos'],

  rag: ['retrieval', 'augmented', 'generation', 'embedding', 'vector', 'llm'],
  embedding: ['vector', 'representation', 'feature', 'rag'],
  diagram: ['chart', 'graph', 'visual', 'uml', 'flowchart', 'architecture'],
  architecture: ['system', 'design', 'structure', 'diagram', 'backend'],
  backend: ['server', 'api', 'database', 'architecture'],
  frontend: ['ui', 'client', 'react', 'interface'],
}

export function expandQuery(query) {
  const words = query.toLowerCase().trim().split(/\s+/)
  const expanded = new Set(words)

  for (const word of words) {
    if (SYNONYM_MAP[word]) {
      for (const synonym of SYNONYM_MAP[word]) {
        expanded.add(synonym)
      }
    }
  }

  return [...expanded]
}
