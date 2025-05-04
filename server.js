// server.js
const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const yts = await import('yt-search');
  const result = await yts.default(query);
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
});

app.get('/api/download', async (req, res) => {
  const { url, type } = req.query;
  if (!url || !type) return res.status(400).send('Missing URL or type');

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, '');

    if (type === 'audio') {
      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
      ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
        .on('error', (err) => {
          console.error(err);
          res.status(500).send('Download failed');
        })
        .pipe(res);
    } else if (type === 'video') {
      res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
      ytdl(url, { quality: 'highestvideo' })
        .on('error', (err) => {
          console.error(err);
          res.status(500).send('Download failed');
        })
        .pipe(res);
    } else {
      res.status(400).send('Invalid type specified');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to process video');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
