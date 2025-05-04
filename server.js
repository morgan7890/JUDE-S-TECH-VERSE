const express = require('express');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve HTML/CSS/JS
app.use(express.static(path.join(__dirname, 'public')));

// Search API
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing query parameter' });

    try {
        const results = await ytsr(query, { limit: 1 });
        const video = results.items.find(item => item.type === 'video');
        if (!video) return res.status(404).json({ error: 'No video found' });

        res.json({
            title: video.title,
            url: video.url,
            thumbnail: video.bestThumbnail.url,
            channel: video.author.name,
            duration: video.duration,
            views: video.views
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Download API
app.get('/api/download', async (req, res) => {
    const url = req.query.url;
    const type = req.query.type;

    if (!url || !type) return res.status(400).send('Missing parameters');

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        res.setHeader('Content-Disposition', `attachment; filename="${title}.${type === 'audio' ? 'mp3' : 'mp4'}"`);

        const format = type === 'audio'
            ? ytdl.filterFormats(info.formats, 'audioonly')[0]
            : ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });

        ytdl(url, { format }).pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Download failed');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
