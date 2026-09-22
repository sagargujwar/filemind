# FileMind

AI-powered intelligent file management platform built with the MERN stack.

Upload files, get AI-generated names/descriptions/tags/categories, and search by content.

## Stack

- React 19 + Vite
- Node.js + Express 5
- MongoDB + Mongoose 8
- Google Gemini Vision (AI analysis)
- sharp (image optimization)
- JWT + bcrypt (auth)
- Multer (file uploads)

## Project Structure

```
FileMind/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── main.jsx                 # Entry point
│   │   ├── App.jsx                  # Router — /login, /register, / (protected)
│   │   ├── index.css                # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Auth state: user, login, register, logout
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Login form
│   │   │   ├── RegisterPage.jsx     # Register form
│   │   │   ├── Dashboard.jsx        # Main dashboard with tabs, search, file/folder/category mgmt
│   │   │   ├── FilesPage.jsx        # Standalone all files page
│   │   │   ├── FoldersPage.jsx      # Standalone folders page
│   │   │   ├── CategoriesPage.jsx   # Standalone categories page
│   │   │   ├── FavoritesPage.jsx    # Favorite files
│   │   │   ├── RecentPage.jsx       # Recently modified files
│   │   │   ├── TrashPage.jsx        # Deleted files with restore/permanent delete
│   │   │   └── SettingsPage.jsx     # Profile, password, storage info
│   │   ├── components/
│   │   │   ├── ai/
│   │   │   │   └── AISuggestion.jsx     # AI suggestion card with Accept/Edit/Reject
│   │   │   ├── search/
│   │   │   │   ├── SearchBar.jsx        # Search input with history dropdown
│   │   │   │   └── SearchResults.jsx    # Results with pagination
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.jsx          # Sidebar navigation
│   │   │   ├── common/
│   │   │   │   └── ProtectedRoute.jsx   # Auth guard
│   │   │   ├── upload/
│   │   │   │   └── FileUpload.jsx       # File upload with type/size validation
│   │   │   ├── files/
│   │   │   │   └── FileList.jsx         # File list with inline actions
│   │   │   ├── folders/
│   │   │   │   └── FolderList.jsx       # Folder grid with create/rename/delete
│   │   │   ├── categories/
│   │   │   │   └── CategoryList.jsx     # Category list with CRUD
│   │   └── services/
│   │       └── api.js               # Axios instance (baseURL, withCredentials)
│   │   ├── utils/
│   │   │   └── format.js           # Shared formatSize utility
│   │   └── index.css               # All styles
│   ├── vite.config.js               # Dev server with /uploads proxy
│   └── package.json
├── server/                          # Express backend
│   ├── src/
│   │   ├── server.js                # Entry — connects DB then starts server
│   │   ├── app.js                   # Express app — middleware + route mounting
│   │   ├── config/
│   │   │   └── db.js                # Mongoose connection
│   │   ├── controllers/
│   │   │   ├── authController.js    # register, login, logout, getMe
│   │   │   ├── fileController.js    # upload, list, get, rename, move, favorite, delete, restore, tags, description, category
│   │   │   ├── folderController.js  # CRUD + nested delete (BFS)
│   │   │   ├── categoryController.js# CRUD with duplicate check, re-embeds files on name change
│   │   │   ├── aiController.js      # analyze single + bulk
│   │   │   └── searchController.js  # keyword + semantic search (two-step: MongoDB substring + JS word-boundary)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT cookie verification (protect)
│   │   │   ├── uploadMiddleware.js  # Multer — MIME/extension validation, 10MB limit
│   │   │   └── errorMiddleware.js   # notFound + errorHandler
│   │   ├── models/
│   │   │   ├── User.js              # bcrypt, avatar, storage tracking
│   │   │   ├── File.js              # All fields, compound indexes
│   │   │   ├── Folder.js            # Nested folders via parentFolderId
│   │   │   ├── Category.js          # Unique per user
│   │   │   └── SearchHistory.js     # Lowercase query, userId+createdAt index
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # 4 auth endpoints
│   │   │   ├── fileRoutes.js        # 14 file endpoints
│   │   │   ├── folderRoutes.js      # 5 folder endpoints
│   │   │   ├── categoryRoutes.js    # 5 category endpoints
│   │   │   ├── aiRoutes.js          # 2 AI endpoints
│   │   │   ├── searchRoutes.js      # 4 search endpoints (text + semantic)
│   │   │   └── healthRoutes.js      # 1 health endpoint
│   │   ├── services/
│   │   │   ├── aiService.js         # Gemini Vision -> PDF extraction -> rule-based fallback
│   │   │   ├── embeddingService.js  # Gemini embeddings, cosine similarity, synonym expansion (80+ synonyms)
│   │   │   └── visionService.js     # Google Gemini Vision API integration (image resizing, model caching, timeout)
│   │   └── utils/
│   │       ├── escapeRegex.js         # Shared regex escape + hasWord (underscore-normalized)
│   │       └── generateToken.js       # JWT creation + httpOnly cookie
│   ├── .env.example
│   ├── .env                         # (gitignored)
│   ├── uploads/                     # Uploaded files (gitignored)
│   └── package.json
├── package.json                     # Root — concurrently for dev
├── .gitignore
├── PROJECT_SPEC.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017

### Install and Run

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Start both frontend and backend
npm run dev
```

Or start individually:

```bash
npm run dev --prefix server   # Backend on http://localhost:5000
npm run dev --prefix client   # Frontend on http://localhost:5173
```

### Environment Variables

Copy the example and configure:

```bash
cp server/.env.example server/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/filemind` | MongoDB connection string |
| `CLIENT_URL` | `http://localhost:5173` | Frontend origin for CORS |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | (required) | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `GEMINI_API_KEY` | (optional) | Google Gemini API key for AI image analysis and embeddings |
| `SEMANTIC_SIMILARITY_THRESHOLD` | `0.15` | Minimum cosine similarity score (0-1) for semantic search results (absolute floor) |

## API

All endpoints use `/api/v1` prefix.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | No | Server health check |

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | Create account |
| POST | `/api/v1/auth/login` | No | Sign in |
| POST | `/api/v1/auth/logout` | Yes | Sign out |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| PUT | `/api/v1/auth/me` | Yes | Update profile |
| PUT | `/api/v1/auth/me/password` | Yes | Change password |

### Files

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/files/upload` | Yes | Upload file (multipart) |
| GET | `/api/v1/files` | Yes | List files (filter by folderId, categoryId, favorite, isDeleted) |
| GET | `/api/v1/files/dashboard` | Yes | Dashboard stats (file/folder/category counts, storage) |
| GET | `/api/v1/files/:id` | Yes | Get single file |
| PATCH | `/api/v1/files/:id/rename` | Yes | Rename file |
| PATCH | `/api/v1/files/:id/move` | Yes | Move to folder |
| PATCH | `/api/v1/files/:id/favorite` | Yes | Toggle favorite |
| PATCH | `/api/v1/files/:id/tags` | Yes | Update tags |
| PATCH | `/api/v1/files/:id/description` | Yes | Update description |
| PATCH | `/api/v1/files/:id/category` | Yes | Update category |
| DELETE | `/api/v1/files/:id` | Yes | Soft delete |
| PATCH | `/api/v1/files/:id/restore` | Yes | Restore from trash |
| DELETE | `/api/v1/files/trash` | Yes | Empty trash (permanent delete all) |

### AI

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/ai/analyze/:fileId` | Yes | Analyze single file |
| POST | `/api/v1/ai/analyze-bulk` | Yes | Analyze multiple files |

### AI

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/search` | Yes | Two-step search: MongoDB substring + JS word-boundary filter (params: q, page, limit, folderId, categoryId) |
| GET | `/api/v1/search/semantic` | Yes | Synonym-expanded keyword search → embedding fallback with cosine similarity (params: q, page, limit, folderId, categoryId) |
| GET | `/api/v1/search/history` | Yes | Get search history |
| DELETE | `/api/v1/search/history` | Yes | Clear search history |

### Folders

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/folders` | Yes | List folders (filter by parentFolderId) |
| POST | `/api/v1/folders` | Yes | Create folder |
| GET | `/api/v1/folders/:id` | Yes | Get folder |
| PATCH | `/api/v1/folders/:id` | Yes | Update folder |
| DELETE | `/api/v1/folders/:id` | Yes | Delete folder + nested (BFS) |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/categories` | Yes | List categories |
| POST | `/api/v1/categories` | Yes | Create category |
| PATCH | `/api/v1/categories/:id` | Yes | Update category |
| DELETE | `/api/v1/categories/:id` | Yes | Delete category |

## Features

- **Auth**: JWT via httpOnly cookies, bcrypt password hashing, protected routes with ownership enforcement
- **File Upload**: Multer with MIME/extension whitelist (PNG, JPG, JPEG, WEBP, PDF), 10MB limit, storage quota per user. Disk cleanup on DB failure
- **AI Analysis**: Google Gemini Vision for images (optimized: images resized to 800px, prompt simplified, 30s timeout), PDF text extraction, rule-based fallback — generates filename, description, category, tags, confidence score
- **Search**: Two-step search — MongoDB `$regex` substring match for broad retrieval, JavaScript `hasWord()` for word-boundary precision. Underscore normalization (`man_eating.png` matches "man"). Scoped by folder/category, paginated
- **Semantic Search**: Gemini embeddings (`gemini-embedding-001`) with in-memory cosine similarity. Keyword-first with 80+ synonyms (person, game, chat, video, code, food, document, error, finance categories). Embedding fallback with relative thresholding (absolute floor configurable via `SEMANTIC_SIMILARITY_THRESHOLD`, 92% retention). Re-embeds files on ALL metadata changes including category rename. Toggle between keyword and semantic modes in UI
- **Folders**: Nested folder structure with BFS cascade delete
- **Categories**: Per-user unique categories with file count tracking
- **Soft Delete**: Trash with restore capability (with storage limit check)

## Phase Status

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation (Express, MongoDB, CORS, Helmet, error handling) | Done |
| 2 | Authentication (JWT, bcrypt, httpOnly cookies, protected routes) | Done |
| 3 | File management (upload, CRUD, soft delete, favorites, tags) | Done |
| 4 | Folders, categories, tags | Done |
| 5 | AI analysis (Gemini Vision optimized + PDF extraction + rule-based fallback) | Done |
| 6 | Search (regex matching, history, scoped filtering, pagination) | Done |
| 7 | Semantic/natural-language search (Gemini embeddings, cosine similarity, synonym fallback) | Done |
| 8 | Dashboard polish, dedicated pages, tests, deployment | Done |
