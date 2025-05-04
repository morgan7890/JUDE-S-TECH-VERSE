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

// 1) Search endpoint
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  try {
    // get first video result
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

// 2) Download endpoint
app.get('/api/download', async (req, res) => {
  const { url, type } = req.query;
  if (!url || !type) return res.status(400).send('Missing url or type');

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  try {
    // Prefetch info to get a clean title
    const info  = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[\/\\:*?"<>|]/g, '');

    // Set download headers
    const ext = type === 'audio' ? 'mp3' : 'mp4';
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${ext}"`);

    // Choose filter
    const options = type === 'audio'
      ? { filter: 'audioonly', quality: 'highestaudio' }
      : { filter: format => format.container === 'mp4', quality: 'highestvideo' };

    // Pipe the stream
    ytdl(url, options)
      .on('error', err => {
        console.error('Download stream error:', err);
        if (!res.headersSent) res.status(500).send('Download failed');
      })
      .pipe(res);

  } catch (err) {
    console.error('Processing download failed:', err);
    return res.status(500).send('Failed to process download');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
