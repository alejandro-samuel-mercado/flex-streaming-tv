const fs = require('fs');
fetch('http://localhost:3000/api/client/homepage')
  .then(res => res.json())
  .then(data => {
     console.log("Featured length:", data.data?.featured?.length);
     if(data.data?.featured?.length > 0) {
        console.log("First featured keys:", Object.keys(data.data.featured[0]));
        if (data.data.featured[0].content) {
            console.log("Has content! Thumbnails:", data.data.featured[0].content.thumbnails);
        } else {
            console.log("No content wrapper. Thumbnails:", data.data.featured[0].thumbnails);
        }
     }
  }).catch(console.error);
