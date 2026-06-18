export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image file.'));
    };
    image.src = url;
  });
}

function renderToJpeg(image, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImage(file, maxSize = 1280, quality = 0.82) {
  const image = await fileToImage(file);
  return renderToJpeg(image, maxSize, quality);
}

export function createThumbnail(dataUrl, maxSize = 160, quality = 0.6) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(renderToJpeg(image, maxSize, quality));
    image.onerror = () => resolve('');
    image.src = dataUrl;
  });
}
