import { LayerState, Asset, LayerId, AppMode } from "../types";
import { MODE_CONFIG } from "../constants";

export const generateAndDownload = async (
  mode: AppMode,
  layers: LayerState[],
  assets: Asset[]
) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const config = MODE_CONFIG[mode];
  canvas.width = config.width;
  canvas.height = config.height;

  // Sort layers by zIndex for correct draw order
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  try {
    for (const layer of sortedLayers) {
      if (!layer.visible || !layer.assetId) continue;
      const asset = assets.find((a) => a.id === layer.assetId);
      if (!asset) continue;

      const img = await loadImage(asset.src);

      if (layer.id === LayerId.BACKGROUND) {
        // Draw background cover
        // Mimic background-size: cover
        const ratio = Math.max(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      } else {
        // Draw Element
        // Calculate Base Width matching the component logic
        let baseWidth = 300;
        if (layer.id === LayerId.MIDDLE) baseWidth = 250;
        if (layer.id === LayerId.TOP) baseWidth = 400;

        const finalWidth = (baseWidth * layer.scale) / 100;
        const aspectRatio = img.width / img.height;
        const finalHeight = finalWidth / aspectRatio;

        // Position: layer.x/y are percentages of the canvas center
        const centerX = (layer.x / 100) * canvas.width;
        const centerY = (layer.y / 100) * canvas.height;

        const drawX = centerX - finalWidth / 2;
        const drawY = centerY - finalHeight / 2;

        ctx.drawImage(img, drawX, drawY, finalWidth, finalHeight);
      }
    }

    const link = document.createElement("a");
    link.download = `burgess-${mode.toLowerCase()}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Failed to generate image", err);
    alert("Could not generate image. This might be due to CORS issues with placeholder images.");
  }
};
