const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withTvBanner = (config) => {
  // 1. Modificamos el AndroidManifest.xml para agregar el banner de Android TV
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Le indicamos al sistema de Android TV cuál es la imagen de banner
    mainApplication.$['android:banner'] = '@drawable/tv_banner';
    
    // Opcional pero recomendado para apps de TV que no son juegos
    mainApplication.$['android:isGame'] = 'false';

    return config;
  });

  // 2. Copiamos la imagen desde assets al directorio nativo de Android
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      const source = path.join(projectRoot, 'assets', 'images', 'banner-tv.png');
      
      const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
      const drawableDir = path.join(resDir, 'drawable');
      
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }
      
      const destination = path.join(drawableDir, 'tv_banner.png');
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
      } else {
        console.warn('⚠️ No se encontró banner-tv.png en assets/images/');
      }
      
      return config;
    },
  ]);

  return config;
};

module.exports = withTvBanner;
