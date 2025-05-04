// server.js
const express = require('express');
const cors    = require('cors');
const ytdl    = require('ytdl-core');
const ytsr    = require('ytsr');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// SEARCH endpoint (unchanged)
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

// DOWNLOAD endpoint (enhanced)
app.get('/api/download', (req, res) => {
  const { url, type } = req.query;
  if (!url || !type) {
    return res.status(400).send('Missing url or type');
  }
  if (!ytdl.validateURL(url)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  // Derive a safe filename from the video ID
  const videoID = new URL(url).searchParams.get('v');
  const filename = `${videoID}.${type === 'audio' ? 'mp3' : 'mp4'}`;

  // Set response headers
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', type === 'audio' ? 'audio/mpeg' : 'video/mp4');

  // Select filter options
  const options = type === 'audio'
    ? { filter: 'audioonly', quality: 'highestaudio' }
    : { filter: format => format.container === 'mp4', quality: 'highestvideo' };

  // Stream and pipe directly
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
