const fs = require('fs');
const https = require('https');
const path = require('path');

const logos = [
  { name: 'netflix.png', url: 'https://logo.clearbit.com/netflix.com' },
  { name: 'disney.png', url: 'https://logo.clearbit.com/disneyplus.com' },
  { name: 'prime.png', url: 'https://logo.clearbit.com/amazon.com' },
  { name: 'max.png', url: 'https://logo.clearbit.com/max.com' },
  { name: 'appletv.png', url: 'https://logo.clearbit.com/apple.com' },
  { name: 'paramount.png', url: 'https://logo.clearbit.com/paramountplus.com' },
  { name: 'hulu.png', url: 'https://logo.clearbit.com/hulu.com' },
  { name: 'crunchyroll.png', url: 'https://logo.clearbit.com/crunchyroll.com' },
  { name: 'peacock.png', url: 'https://logo.clearbit.com/peacocktv.com' },
  { name: 'youtube.png', url: 'https://logo.clearbit.com/youtube.com' }
];

const dir = path.join(__dirname, 'assets', 'platforms');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

logos.forEach(logo => {
  const file = fs.createWriteStream(path.join(dir, logo.name));
  https.get(logo.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, function(response) {
    if (response.statusCode >= 200 && response.statusCode < 400) {
      if (response.headers.location) {
         https.get(response.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res2) {
             res2.pipe(file);
             file.on('finish', () => file.close());
         });
      } else {
         response.pipe(file);
         file.on('finish', () => file.close());
      }
    } else {
      console.log('Failed to download ' + logo.name + ' - ' + response.statusCode);
      file.close();
    }
  }).on('error', function(err) {
    console.error('Error downloading ' + logo.name, err);
  });
});
