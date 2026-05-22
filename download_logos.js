const fs = require('fs');
const https = require('https');
const path = require('path');

const logos = [
  { name: 'netflix.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/340px-Netflix_2015_logo.svg.png' },
  { name: 'disney.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/320px-Disney%2B_logo.svg.png' },
  { name: 'prime.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Prime_Video.png/320px-Prime_Video.png' },
  { name: 'max.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/HBO_Max_Logo.svg/320px-HBO_Max_Logo.svg.png' },
  { name: 'appletv.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/320px-Apple_TV_Plus_Logo.svg.png' },
  { name: 'paramount.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/320px-Paramount_Plus.svg.png' },
  { name: 'hulu.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Hulu_Logo.svg/320px-Hulu_Logo.svg.png' },
  { name: 'crunchyroll.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Crunchyroll_Logo.png/320px-Crunchyroll_Logo.png' },
  { name: 'peacock.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/NBCUniversal_Peacock_Logo.svg/320px-NBCUniversal_Peacock_Logo.svg.png' },
  { name: 'youtube.png', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_Logo_2017.svg/320px-YouTube_Logo_2017.svg.png' }
];

const dir = path.join(__dirname, 'assets', 'platforms');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

logos.forEach(logo => {
  const file = fs.createWriteStream(path.join(dir, logo.name));
  https.get(logo.url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(response) {
    if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => file.close());
    } else {
      console.log('Failed to download ' + logo.name + ' - ' + response.statusCode);
      file.close();
    }
  }).on('error', function(err) {
    console.error('Error downloading ' + logo.name, err);
  });
});
