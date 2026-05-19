export const imageCapture = ({
  p5MountRef,
  form,
}: {
  p5MountRef: React.RefObject<HTMLDivElement | null>;
  form: Record<string, any>;
}) => {
  const compositeAnnotations = (
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
  ) => {
    const ctx = canvas.getContext("2d");
    const { annotations } = form;

    if (!ctx || annotations.length === 0) return;
    // canvas dimensions equal naturalWidth × naturalHeight.
    // xRatio/yRatio are stored relative to the display image size, so we
    // map them to canvas space by multiplying by the natural dimensions.
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    // Scale font & pin proportionally to how much larger the natural image is
    // vs the display image, so label sizes look the same on screen and export.
    const displayW = img.offsetWidth || natW;
    const displayH = img.offsetHeight || natH;
    const scaleX = natW / displayW;
    const scaleY = natH / displayH;
    for (const ann of annotations) {
      const x = ann.xRatio * natW;
      const y = ann.yRatio * natH;
      ctx.save();
      ctx.font = `${ann.fontSize * scaleY}px 'Courier New', Courier, monospace`;
      ctx.fillStyle = ann.color;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3 * scaleY;
      ctx.shadowOffsetY = 1 * scaleY;
      ctx.fillText(ann.text, x + 6 * scaleX, y + (ann.fontSize * scaleY) / 4);
      ctx.restore();
      // pin dot
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 4 * scaleX, 0, Math.PI * 2);
      ctx.fillStyle = ann.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  };

  const captureImage = () => {
    const container = p5MountRef.current;
    if (!container) return;
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    ctx?.drawImage(img, 0, 0, w, h);
    compositeAnnotations(canvas, img);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to capture image"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  };

  // Trigger a PNG download from the latest rendered image
  const saveImage = async () => {
    const blob = await captureImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString();
    const a = document.createElement("a");
    a.href = url;
    a.download = `topojoy-${form["title.text"]}-${date}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const captureImageForPrint = (targetWidth: number, targetHeight: number) => {
    const container = p5MountRef.current;
    if (!container) return;
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;

    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    if (!imgWidth || !imgHeight || !targetWidth || !targetHeight) return;

    const imgAspect = imgWidth / imgHeight;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0;
    let sy = 0;
    let sw = imgWidth;
    let sh = imgHeight;

    if (imgAspect > targetAspect) {
      // Image is too wide: crop left/right
      sw = imgHeight * targetAspect;
      sx = (imgWidth - sw) / 2;
    } else if (imgAspect < targetAspect) {
      // Image is too tall: crop top/bottom
      sh = imgWidth / targetAspect;
      sy = (imgHeight - sh) / 2;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = sw;
    canvas.height = sh;
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    compositeAnnotations(canvas, img);

    console.log("PRINT CROP", {
      imgWidth,
      imgHeight,
      targetWidth,
      targetHeight,
      crop: { sx, sy, sw, sh },
      imgAspect: imgAspect,
      targetAspect: targetAspect,
      finalAspect: sw / sh,
      diff: Math.abs(sw / sh - targetAspect) / targetAspect,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to capture cropped image"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  };

  return { captureImage, saveImage, captureImageForPrint };
};
