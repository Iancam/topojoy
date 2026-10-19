import React, { useState, useRef, useEffect } from "react";
import { Upload, ZoomIn, ZoomOut } from "lucide-react";

type PrintSizeSelectorProps = {
  imageSrc?: string;
  imageElement?: HTMLImageElement;
};

type PrintSize = {
  width: number;
  height: number;
  landscape: boolean;
  score?: number;
};

const PrintSizeSelector = ({
  imageSrc,
  imageElement,
}: PrintSizeSelectorProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedSize, setSelectedSize] = useState<PrintSize | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    cropX: 0,
    cropY: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageElement) {
      setImage(imageElement);
      setImageSize({ width: imageElement.width, height: imageElement.height });
    }
  }, [imageElement]);
  // Generate all Prodigi sizes (3-50 inches in 2-inch increments)
  const generateSizes = () => {
    const sizes = [];
    for (let width = 3; width <= 50; width += 1) {
      for (let height = 3; height <= 50; height += 1) {
        if (width >= height) {
          // Avoid duplicates (e.g., 5x7 and 7x5)
          sizes.push({ width, height, landscape: true });
          if (width !== height) {
            sizes.push({ width: height, height: width, landscape: false });
          }
        }
      }
    }
    return sizes;
  };

  const printSizes = generateSizes();

  // Calculate aspect ratio match score
  const getMatchScore = (
    printW: number,
    printH: number,
    imgW: number,
    imgH: number,
  ) => {
    const printRatio = printW / printH;
    const imageRatio = imgW / imgH;
    const diff = Math.abs(printRatio - imageRatio);
    return 1 - Math.min(diff, 1);
  };

  // Get recommended sizes
  const getRecommendedSizes = () => {
    if (!imageSize.width || !imageSize.height) return [];

    return printSizes
      .map((size) => ({
        ...size,
        score: getMatchScore(
          size.width,
          size.height,
          imageSize.width,
          imageSize.height,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result !== "string") return;
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setImageSize({ width: img.width, height: img.height });
          // Select best matching size
          const recommended = printSizes
            .map((size) => ({
              ...size,
              score: getMatchScore(
                size.width,
                size.height,
                img.width,
                img.height,
              ),
            }))
            .sort((a, b) => b.score - a.score)[0];
          setSelectedSize(recommended);
          setCropPosition({ x: 0, y: 0 });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Draw canvas with image and crop overlay
  useEffect(() => {
    if (!image || !selectedSize || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const styles = getComputedStyle(canvas);
    const previewBackdrop = styles
      .getPropertyValue("--preview-backdrop")
      .trim();
    const selection = styles.getPropertyValue("--selection").trim();
    const canvasWidth = 600;
    const canvasHeight = 400;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.fillStyle = previewBackdrop;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate image display size (fit to canvas)
    const scale = Math.min(
      canvasWidth / imageSize.width,
      canvasHeight / imageSize.height,
    );
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;
    const offsetX = (canvasWidth - displayWidth) / 2;
    const offsetY = (canvasHeight - displayHeight) / 2;

    // Draw full image dimmed
    ctx.globalAlpha = 0.4;
    ctx.drawImage(image, offsetX, offsetY, displayWidth, displayHeight);
    ctx.globalAlpha = 1;

    // Calculate crop rectangle
    const printRatio = selectedSize.width / selectedSize.height;
    const imageRatio = imageSize.width / imageSize.height;

    let cropWidth, cropHeight;
    if (printRatio > imageRatio) {
      // Print is wider - fit to width
      cropWidth = imageSize.width;
      cropHeight = imageSize.width / printRatio;
    } else {
      // Print is taller - fit to height
      cropHeight = imageSize.height;
      cropWidth = imageSize.height * printRatio;
    }

    // Apply crop position constraints
    const maxX = imageSize.width - cropWidth;
    const maxY = imageSize.height - cropHeight;
    const constrainedX = Math.max(0, Math.min(cropPosition.x, maxX));
    const constrainedY = Math.max(0, Math.min(cropPosition.y, maxY));

    // Draw cropped area at full brightness
    const cropDisplayX = offsetX + constrainedX * scale;
    const cropDisplayY = offsetY + constrainedY * scale;
    const cropDisplayWidth = cropWidth * scale;
    const cropDisplayHeight = cropHeight * scale;

    ctx.drawImage(
      image,
      constrainedX,
      constrainedY,
      cropWidth,
      cropHeight,
      cropDisplayX,
      cropDisplayY,
      cropDisplayWidth,
      cropDisplayHeight,
    );

    // Draw crop frame
    ctx.strokeStyle = selection;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      cropDisplayX,
      cropDisplayY,
      cropDisplayWidth,
      cropDisplayHeight,
    );

    // Draw corner handles
    const handleSize = 12;
    ctx.fillStyle = selection;
    [
      [cropDisplayX, cropDisplayY],
      [cropDisplayX + cropDisplayWidth, cropDisplayY],
      [cropDisplayX, cropDisplayY + cropDisplayHeight],
      [cropDisplayX + cropDisplayWidth, cropDisplayY + cropDisplayHeight],
    ].forEach(([x, y]) => {
      ctx.fillRect(
        x - handleSize / 2,
        y - handleSize / 2,
        handleSize,
        handleSize,
      );
    });

    // Draw dimensions
    ctx.fillStyle = selection;
    ctx.font = "14px sans-serif";
    ctx.fillText(
      `${selectedSize.width}" × ${selectedSize.height}"`,
      cropDisplayX + 10,
      cropDisplayY + 25,
    );
  }, [image, selectedSize, cropPosition, imageSize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      cropX: cropPosition.x,
      cropY: cropPosition.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    const scale = Math.min(
      canvas.width / imageSize.width,
      canvas.height / imageSize.height,
    );

    const deltaX = (e.clientX - rect.left - dragStart.x) / scale;
    const deltaY = (e.clientY - rect.top - dragStart.y) / scale;

    setCropPosition({
      x: dragStart.cropX + deltaX,
      y: dragStart.cropY + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getCropPercentage = () => {
    if (!selectedSize || !imageSize.width) return 100;

    const printRatio = selectedSize.width / selectedSize.height;
    const imageRatio = imageSize.width / imageSize.height;

    let cropArea;
    if (printRatio > imageRatio) {
      cropArea =
        (imageSize.width * (imageSize.width / printRatio)) /
        (imageSize.width * imageSize.height);
    } else {
      cropArea =
        (imageSize.height * printRatio * imageSize.height) /
        (imageSize.width * imageSize.height);
    }

    return Math.round(cropArea * 100);
  };

  const getQualityWarning = () => {
    if (!selectedSize || !imageSize.width) return null;

    const dpi = Math.min(
      imageSize.width / selectedSize.width,
      imageSize.height / selectedSize.height,
    );

    if (dpi < 150)
      return {
        level: "error",
        text: "Low quality - image may appear pixelated",
      };
    if (dpi < 200)
      return {
        level: "warning",
        text: "Moderate quality - acceptable for most prints",
      };
    return { level: "success", text: "High quality - excellent for printing" };
  };

  const qualityWarning = getQualityWarning();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Print Size Selector</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Preview</h2>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full rounded cursor-move border-2 border-gray-700"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Image visible:</span>
                  <span className="font-semibold">{getCropPercentage()}%</span>
                </div>
                {qualityWarning && (
                  <div
                    className={`text-sm px-3 py-2 rounded ${
                      qualityWarning.level === "error"
                        ? "bg-red-900/30 text-red-400"
                        : qualityWarning.level === "warning"
                          ? "bg-yellow-900/30 text-yellow-400"
                          : "bg-green-900/30 text-green-400"
                    }`}
                  >
                    {qualityWarning.text}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Drag the preview to reposition the crop area
                </p>
              </div>
            </div>
          </div>

          {/* Size Selector */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select Print Size</h2>
            <div className="text-sm text-gray-400 mb-4">
              Image: {imageSize.width} × {imageSize.height}px
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {getRecommendedSizes().map((size, idx) => {
                const isSelected =
                  selectedSize?.width === size.width &&
                  selectedSize?.height === size.height;
                const matchPercent = Math.round(size.score * 100);

                return (
                  <button
                    key={`${size.width}-${size.height}`}
                    onClick={() => {
                      setSelectedSize(size);
                      setCropPosition({ x: 0, y: 0 });
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-900/30"
                        : "border-gray-700 bg-gray-700/30 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {size.width}" × {size.height}"
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {size.landscape ? "Landscape" : "Portrait"}
                        </div>
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          matchPercent >= 95
                            ? "bg-green-900/50 text-green-400"
                            : matchPercent >= 85
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {matchPercent >= 95
                          ? "Perfect"
                          : matchPercent >= 85
                            ? "Good"
                            : "Crop"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSizeSelector;
