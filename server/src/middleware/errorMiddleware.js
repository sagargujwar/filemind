export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  })
}

export function errorHandler(err, req, res, next) {
  console.error(err)

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      })
    }
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  if (err.message === 'Only PNG, JPG, JPEG, WEBP, and PDF files are allowed') {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  })
}
