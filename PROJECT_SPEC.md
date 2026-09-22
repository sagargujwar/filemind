# FileMind — OpenCode Master Project Specification

## Project

Build **FileMind**, a MERN-based AI-powered intelligent file management platform.

FileMind understands the content of uploaded files and helps users automatically generate meaningful filenames, descriptions, categories, tags, and eventually perform semantic/natural-language search.

The project must remain primarily a **MERN application**:

* MongoDB
* Express.js
* React.js
* Node.js

Supporting technologies:

* Vite
* Mongoose
* Axios
* React Router
* Tailwind CSS
* JWT
* bcrypt
* Multer
* sharp (image processing for AI optimization)

AI functionality should be implemented as an external service integration behind `server/src/services/aiService.js`.

---

## Core Problem

Traditional file managers depend on filenames.

Examples:

* Screenshot 2026-09-07 182341.png
* IMG_20260831_123456.jpg
* document1.pdf
* final_final2.pdf

FileMind analyzes file content and generates useful metadata.

Example:

Original:

`Screenshot 2026-09-07 182341.png`

AI suggestion:

`leetcode_longest_substring_solution.png`

Metadata:

* Category: DSA
* Tags: leetcode, sliding-window, strings
* Description: Solution for Longest Substring Without Repeating Characters
* Confidence: 0.94

AI suggestions must be reviewable by the user. Do not silently rename or reorganize files in the MVP.

---

## MVP Supported Formats

Initially support:

* PNG
* JPG
* JPEG
* WEBP
* PDF

Prioritize images/screenshots and PDFs.

Do not implement video/audio initially.

Future formats may include DOCX, TXT, XLSX, MP4 and MP3.

---

## Main User Flow

1. User registers or logs in.
2. User reaches the dashboard.
3. User uploads a file.
4. Backend validates and stores the file.
5. File metadata is stored in MongoDB.
6. AI analysis is triggered.
7. AI generates:

   * meaningful filename
   * description
   * category
   * tags
   * confidence score
8. Frontend displays the AI suggestion.
9. User can Accept, Edit or Reject the suggestion.
10. File becomes searchable and organizable.
11. User can move it into folders.
12. User can search by original name, generated name, tags, description or extracted text.
13. Advanced versions may support semantic/natural-language search.

---

## Database Collections

### users

Fields:

* name
* email
* password
* avatar
* storageUsed
* storageLimit
* createdAt
* updatedAt

Passwords must be hashed using bcrypt.

### files

Fields:

* userId
* originalName
* generatedName
* filePath
* mimeType
* extension
* size
* categoryId
* folderId
* tags
* description
* extractedText
* aiConfidence
* aiProcessed
* processingStatus
* isFavorite
* isDeleted
* createdAt
* updatedAt

Processing status:

* pending
* processing
* completed
* failed

### folders

Fields:

* userId
* name
* parentFolderId
* description
* createdAt
* updatedAt

Nested folders must be supported.

### categories

Fields:

* userId
* name
* description
* fileCount
* createdAt

### searchHistory

Fields:

* userId
* query (lowercase, trimmed)
* resultCount
* createdAt

---

## Backend Architecture

Use:

```text
server/src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── app.js
└── server.js
```

Controllers handle HTTP requests.

Services contain business logic.

Models contain Mongoose schemas.

Routes define API endpoints.

Middleware handles authentication, uploads, validation, rate limiting and errors.

AI calls must be isolated inside `aiService.js`.

---

## Frontend Architecture

Use:

```text
client/src/
├── components/
├── pages/
├── services/
├── context/
├── hooks/
├── utils/
├── routes/
├── App.jsx
└── main.jsx
```

Use reusable components.

Keep API calls inside service files rather than directly inside every component.

Use React Context only where global state is appropriate.

---

## API Version

All APIs must use:

`/api/v1`

Authentication:

* POST `/api/v1/auth/register`
* POST `/api/v1/auth/login`
* POST `/api/v1/auth/logout`
* GET `/api/v1/auth/me`

Files:

* POST `/api/v1/files/upload`
* GET `/api/v1/files`
* GET `/api/v1/files/:id`
* PATCH `/api/v1/files/:id/rename`
* PATCH `/api/v1/files/:id/move`
* PATCH `/api/v1/files/:id/favorite`
* PATCH `/api/v1/files/:id/tags`
* PATCH `/api/v1/files/:id/description`
* PATCH `/api/v1/files/:id/category`
* DELETE `/api/v1/files/:id`
* PATCH `/api/v1/files/:id/restore`

AI:

* POST `/api/v1/ai/analyze/:fileId`
* POST `/api/v1/ai/analyze-bulk`

Search:

* GET `/api/v1/search`
* GET `/api/v1/search/history`
* DELETE `/api/v1/search/history`
* GET `/api/v1/search/semantic`

Folders:

* GET `/api/v1/folders`
* POST `/api/v1/folders`
* GET `/api/v1/folders/:id`
* PATCH `/api/v1/folders/:id`
* DELETE `/api/v1/folders/:id`

Categories:

* GET `/api/v1/categories`
* POST `/api/v1/categories`
* PATCH `/api/v1/categories/:id`
* DELETE `/api/v1/categories/:id`

Dashboard:

* GET `/api/v1/dashboard`

---

## Security

Use:

* bcrypt
* JWT
* HTTP-only cookies
* Helmet
* CORS
* rate limiting
* input validation
* centralized error handling

Every protected database query must enforce ownership.

For example:

```js
File.findOne({
  _id: fileId,
  userId: req.user.id
})
```

Never allow a user to retrieve another user's files.

Validate:

* MIME type
* extension
* file size
* uploaded filename

Never trust user-provided filenames.

---

## Search

Search uses a two-step approach: MongoDB substring matching for broad retrieval, then JavaScript word-boundary filtering for precision.

Search fields:

* originalName
* generatedName
* tags
* description

Search supports:

* Scope filtering by `folderId` and `categoryId`
* Pagination with configurable `limit` (max 100) and `page`
* Case-insensitive search history deduplication
* Search history with `lowercase` query normalization
* Underscore normalization (e.g., `man_eating.png` matches search term "man")

### Semantic Search

Semantic search uses Gemini embeddings (`gemini-embedding-001`) with in-memory cosine similarity. It operates in two phases:

1. **Keyword-first**: Synonym-expanded keyword search using `expandQuery()` (80+ synonyms across person, game, chat, video, code, food, document, error, finance categories)
2. **Embedding fallback**: When no keyword matches, queries Gemini for embedding vectors and compares using cosine similarity with relative thresholding

Key implementation details:

* Embeddings stored in MongoDB (`File.embedding` field, select: false by default)
* Embeddings re-generated on ALL metadata changes: rename, move, tags, description, category (including category rename)
* Embeddings include category name when file has a category (all operations: upload, rename, move, tags, description, category update, category rename)
* Similarity threshold: configurable via `SEMANTIC_SIMILARITY_THRESHOLD` env var (default 0.15)
* Absolute floor: read from `SEMANTIC_SIMILARITY_THRESHOLD` env var (default 0.15), relative retention: 92% of top score
* `hasWord()` utility normalizes underscores to spaces before `\b` word-boundary matching

---

## UI

Build a clean, professional productivity/SaaS interface.

Main navigation:

* Dashboard
* All Files
* Folders
* Categories
* Favorites
* Recent
* Trash
* Search
* Settings

Use responsive layouts and reusable components.

Include proper:

* loading states
* error states
* empty states
* success feedback
* confirmation dialogs

AI suggestions should clearly show:

Original filename → Suggested filename → Category → Tags → Description

Buttons:

* Accept
* Edit
* Reject

---

## Development Phases

### Phase 1

Foundation. **DONE**

### Phase 2

Authentication. **DONE**

### Phase 3

File management. **DONE**

### Phase 4

Folders, categories and tags. **DONE**

### Phase 5

AI analysis. **DONE** (Gemini Vision + PDF extraction + rule-based fallback, optimized with image resizing)

### Phase 6

Search. **DONE** (regex-based matching, search history, scoped filtering, pagination)

### Phase 7

Semantic/natural-language search. **DONE** (Gemini embeddings, cosine similarity, re-embedding on all metadata changes, configurable threshold, synonym expansion fallback)

### Phase 8

Dashboard, polish, testing and deployment. **DONE** (sidebar nav, dedicated pages: All Files/Folders/Categories/Favorites/Recent/Trash/Settings, 64 tests, Docker deployment, responsive design, storage progress bar, empty trash)

Do not implement future phases prematurely.

---

## Daily Development Rule

The project will be developed incrementally.

When given a daily task:

1. Inspect the current repository.
2. Understand the existing architecture.
3. Determine what is already implemented.
4. Implement only the requested task.
5. Do not rewrite unrelated working code.
6. Do not change the project architecture unnecessarily.
7. Reuse existing components, services and utilities.
8. Do not add libraries unless required.
9. Maintain existing naming conventions.
10. Handle errors properly.
11. Check for syntax/import/runtime issues.
12. Provide a concise summary of changes.
13. List files changed.
14. Explain how to test the completed task.
15. Mention any known limitations.

Never generate the entire project from scratch when a daily task is requested.

---

## Definition of Done

A daily task is complete only when:

* Implementation is functional.
* Existing functionality still works.
* Code follows the project architecture.
* Errors are handled.
* No unnecessary dependencies are introduced.
* Relevant API/frontend integration works.
* The developer can run and test the feature locally.

---

## Important Product Principle

FileMind is not merely an AI screenshot renamer.

Its positioning is:

> A privacy-conscious, AI-powered intelligent file management and content discovery platform.

The long-term goal is to help users understand, organize and find their files based on the actual content of those files.

The MVP should remain simple and reliable before advanced AI features are added.
