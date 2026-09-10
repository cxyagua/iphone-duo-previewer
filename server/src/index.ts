import express from 'express'
import { checkEmbeddable } from './embedCheck.js'
import { getScreenshot, ScreenshotError } from './screenshot.js'

const PORT = Number(process.env.PORT) || 3001

const app = express()
app.use(express.json())

app.post('/api/embed-check', async (req, res) => {
  const url = req.body?.url
  if (typeof url !== 'string' || !url) {
    res.status(400).json({ error: 'invalid_url' })
    return
  }
  const embeddable = await checkEmbeddable(url)
  res.status(200).json({ embeddable })
})

app.post('/api/screenshot', async (req, res) => {
  const url = req.body?.url
  if (typeof url !== 'string' || !url) {
    res.status(400).json({ error: 'invalid_url' })
    return
  }

  try {
    const { buffer, cacheHit } = await getScreenshot(url, req.body)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS')
    res.status(200).send(buffer)
  } catch (err) {
    if (err instanceof ScreenshotError) {
      const status = err.code === 'too_many_requests' ? 429 : err.code === 'invalid_url' ? 400 : 502
      res.status(status).json({ error: err.code })
      return
    }
    res.status(502).json({ error: 'navigation_failed' })
  }
})

app.listen(PORT, () => {
  console.log(`iDuoPreviewer screenshot server listening on http://localhost:${PORT}`)
})
