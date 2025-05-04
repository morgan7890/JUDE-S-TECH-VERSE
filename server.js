// server.js
const express = require('express');
const cors    = require('cors');
const ytdl    = require('ytdl-core');
const ytsr    = require('ytsr');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve your custom neon frontend
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// SEARCH endpoint
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  try {
    const filters = await ytsr.getFilters(q);
    const filter  = filters.get('Type').get('Video');
    const results = await ytsr(filter.url, { limit: 1 });
    const video   = results.items[0];
    if (!video) return res.status(404).json({ error: 'No video found' });

    return res.json({
      title:     video.title,
      url:       video.url,
      thumbnail: video.bestThumbnail.url,
      channel:   video.author.name,
      duration:  video.duration,
      views:     video.views
    });
  } catch (err) {
    console.error('Search failed:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// DOWNLOAD endpoint
app.get('/api/download', (req, res) => {
  const { url, type } = req.query;
  if (!url || !type) return res.status(400).send('Missing url or type');
  if (!ytdl.validateURL(url)) return res.status(400).send('Invalid YouTube URL');

  // Clean filename from URL (simple slug)
  const id       = new URL(url).searchParams.get('v');
  const filename = `${id}.${type === 'audio' ? 'mp3' : 'mp4'}`;

  // Set headers
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Choose options
  const options = type === 'audio'
    ? { filter: 'audioonly' }
    : {}; // full video+audio

  // Stream and pipe
  const stream = ytdl(url, options);
  stream.on('error', err => {
    console.error('Stream error:', err);
    if (!res.headersSent) res.status(500).send('Download failed');
  });
  stream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
