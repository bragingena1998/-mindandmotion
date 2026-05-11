const sharp = require('sharp');

async function create() {
  const size = 96;
  
  // Загружаем иконку, делаем grayscale, threshold → чёрно-белая маска
  const mask = await sharp('./assets/icon.png')
    .resize(size, size)
    .greyscale()
    .threshold(100)
    .toBuffer();

  // Создаём белый PNG на прозрачном фоне используя маску
  await sharp({
    create: { width: size, height: size, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 } }
  })
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toFile('./assets/notification-icon.png');
  
  console.log('✅ notification-icon.png создан');
}

create().catch(console.error);
