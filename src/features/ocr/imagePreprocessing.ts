/**
 * Preprocesses meter image for Tesseract OCR:
 * - Scales to optimal resolution
 * - Applies grayscale and contrast enhancement
 * - Produces thumbnail and high-contrast B&W image
 */
export async function preprocessMeterImage(fileOrDataUrl: File | string): Promise<{
  originalThumbnail: string;
  processedDataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // 1. Generate clean lightweight thumbnail (max 300px)
        const thumbCanvas = document.createElement('canvas');
        const maxThumbDim = 320;
        let thumbW = img.width;
        let thumbH = img.height;
        if (thumbW > thumbH) {
          if (thumbW > maxThumbDim) {
            thumbH = Math.round((thumbH * maxThumbDim) / thumbW);
            thumbW = maxThumbDim;
          }
        } else {
          if (thumbH > maxThumbDim) {
            thumbW = Math.round((thumbW * maxThumbDim) / thumbH);
            thumbH = maxThumbDim;
          }
        }
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
        }
        const originalThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.82);

        // 2. OCR preprocessing canvas (grayscale + contrast stretch)
        const ocrCanvas = document.createElement('canvas');
        const targetW = Math.min(Math.max(img.width, 600), 1200);
        const targetH = Math.round((img.height * targetW) / img.width);
        ocrCanvas.width = targetW;
        ocrCanvas.height = targetH;
        const ctx = ocrCanvas.getContext('2d');
        if (!ctx) {
          resolve({ originalThumbnail, processedDataUrl: originalThumbnail });
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        // Grayscale + Contrast Stretch
        let minLum = 255;
        let maxLum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        const range = Math.max(maxLum - minLum, 1);

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Normalized contrast stretch
          let stretched = ((lum - minLum) / range) * 255;
          // Apply slight threshold curve to isolate digits
          stretched = stretched > 130 ? 255 : Math.max(0, stretched - 30);

          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }

        ctx.putImageData(imgData, 0, 0);
        const processedDataUrl = ocrCanvas.toDataURL('image/png');

        resolve({ originalThumbnail, processedDataUrl });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
