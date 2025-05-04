const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Search endpoint
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing search query' });

  try {
    const result = await yts(query);
    const video = result.videos[0];
    if (!video) return res.status(404).json({ error: 'No video found' });

    res.json({
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      channel: video.author.name,
      duration: video.timestamp,
      views: video.views
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
  const { url, type } = req.query;
  if (!url || !type) return res.status(400).send('Missing parameters');

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, '');

    res.setHeader('Content-Disposition', `attachment; filename="${title}.${type === 'audio' ? 'mp3' : 'mp4'}"`);

    const filter = type === 'audio'
      ? { filter: 'audioonly', quality: 'highestaudio' }
      : { filter: (f)=> f.container === 'mp4', quality: 'highestvideo' };

    ytdl(url, filter)
      .on('error', err => {
        console.error('Download error:', err);
        if (!res.headersSent) res.status(500).send('Download failed');
      })
      .pipe(res);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Failed to process download');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
