const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withTvBanner = (config) => {
  // 1. Modificamos el AndroidManifest.xml para agregar el banner y logo de Android TV
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Le indicamos al sistema de Android TV cuál es la imagen de banner y logo en Application
    mainApplication.$['android:banner'] = '@drawable/tv_banner';
    mainApplication.$['android:logo'] = '@drawable/tv_banner';
    mainApplication.$['android:isGame'] = 'false';

    // También lo aseguramos en cada Activity con intent LEANBACK_LAUNCHER o LAUNCHER
    if (mainApplication.activity && Array.isArray(mainApplication.activity)) {
      mainApplication.activity.forEach((act) => {
        act.$['android:banner'] = '@drawable/tv_banner';
        act.$['android:logo'] = '@drawable/tv_banner';
      });
    }

    return config;
  });

  // 2. Copiamos la imagen desde assets a los directorios nativos de Android
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Usamos el archivo solicitado por el usuario: icono-tv.png (con fallback a banner-tv.png)
      let source = path.join(projectRoot, 'assets', 'images', 'icono-tv.png');
      if (!fs.existsSync(source)) {
        source = path.join(projectRoot, 'assets', 'images', 'banner-tv.png');
      }
      
      const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
      const targetDirs = ['drawable', 'drawable-nodpi', 'drawable-xhdpi', 'drawable-xxhdpi'];
      
      if (fs.existsSync(source)) {
        targetDirs.forEach((dirName) => {
          const drawableDir = path.join(resDir, dirName);
          if (!fs.existsSync(drawableDir)) {
            fs.mkdirSync(drawableDir, { recursive: true });
          }
          const destination = path.join(drawableDir, 'tv_banner.png');
          fs.copyFileSync(source, destination);
        });
      } else {
        console.warn('⚠️ No se encontró icono-tv.png ni banner-tv.png en assets/images/');
      }
      
      return config;
    },
  ]);

  return config;
};

module.exports = withTvBanner;
