const fs = require('fs');
fetch('https://nubatv.com/api/client/content?type=MOVIE&limit=20&sort=popular')
  .then(res => res.json())
  .then(data => {
     if(data && data.data && data.data.length > 0) {
        const item = data.data[0];
        console.log("First item id:", item.id);
        console.log("Thumbnails:", item.thumbnails);
     } else {
        console.log("No data");
     }
  }).catch(console.error);
