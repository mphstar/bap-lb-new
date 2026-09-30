"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Upload, Pen, Maximize2, RotateCw, RotateCcw, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  value: string | null; // base64 data URL
  onChange: (value: string | null) => void;
  label?: string;
  width?: number;
  height?: number;
}

/** Crop empty whitespace (transparency/white) around drawn strokes to keep signature tight & sharp */
function trimAndCropCanvas(sourceCanvas: HTMLCanvasElement, padding = 16): string | null {
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) return null;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasDrawn = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel is drawn (alpha > 20 and not pure white)
      const isPixelDrawn = alpha > 20 && !(r > 245 && g > 245 && b > 245);
      if (isPixelDrawn) {
        hasDrawn = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasDrawn) return null;

  // Add padding
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(w, maxX + padding);
  maxY = Math.min(h, maxY + padding);

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) return null;

  cropCtx.drawImage(
    sourceCanvas,
    minX, minY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return cropCanvas.toDataURL("image/png");
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label = "Tanda Tangan",
  width,
  height = 140,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "image">(value ? "image" : "draw");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSig, setFullscreenSig] = useState<string | null>(value);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedValueRef = useRef<string | null>(value);

  // Sync state if value is reset or changed from outside
  useEffect(() => {
    if (value !== lastLoadedValueRef.current) {
      lastLoadedValueRef.current = value;
      if (!value) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setMode("draw");
      } else {
        setMode("image");
      }
    }
  }, [value]);

  // Helper to rotate image data URL (by angle: 90, -90, 180)
  const rotateImage = useCallback((dataUrl: string, angleDegrees: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        const angleRad = (angleDegrees * Math.PI) / 180;
        const isSwapDim = Math.abs(angleDegrees) === 90 || Math.abs(angleDegrees) === 270;

        canvas.width = isSwapDim ? img.height : img.width;
        canvas.height = isSwapDim ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angleRad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  // Helper to scale/resize signature image
  const scaleImage = useCallback((dataUrl: string, factor: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Scale canvas or adjust drawing margins
        const targetW = Math.max(50, Math.round(img.width * factor));
        const targetH = Math.max(30, Math.round(img.height * factor));

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.drawImage(img, 0, 0, targetW, targetH);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  const handleRotate = useCallback(
    async (angle: number) => {
      if (!value) return;
      const rotated = await rotateImage(value, angle);
      lastLoadedValueRef.current = rotated;
      onChange(rotated);
      setMode("image");
    },
    [value, rotateImage, onChange]
  );

  const handleScale = useCallback(
    async (factor: number) => {
      if (!value) return;
      const scaled = await scaleImage(value, factor);
      lastLoadedValueRef.current = scaled;
      onChange(scaled);
      setMode("image");
    },
    [value, scaleImage, onChange]
  );

  // Redraw normal canvas when value changes or mode is set
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || width || 320;
    const displayHeight = height;

    canvas.width = displayWidth * 2;
    canvas.height = displayHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#000";

    if (value && mode === "draw") {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = value;
    }
  }, [width, height, value, mode]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Window resize handler for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas]);

  // Drawing coordinates calculation
  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, targetCanvas: HTMLCanvasElement | null) => {
      if (!targetCanvas) return { x: 0, y: 0 };
      const rect = targetCanvas.getBoundingClientRect();
      if ("touches" in e) {
        if (!e.touches[0]) return { x: 0, y: 0 };
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // Normal Canvas drawing handlers
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (mode !== "draw") return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [mode, getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || mode !== "draw") return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, mode, getPos]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const cropped = trimAndCropCanvas(canvas, 10);
      const dataUrl = cropped || canvas.toDataURL("image/png");
      lastLoadedValueRef.current = dataUrl;
      onChange(dataUrl);
    }
  }, [isDrawing, onChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    lastLoadedValueRef.current = null;
    onChange(null);
  }, [onChange]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        lastLoadedValueRef.current = dataUrl;
        onChange(dataUrl);
        setMode("image");
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onChange]
  );

  const switchToDraw = () => {
    setMode("draw");
    lastLoadedValueRef.current = null;
    onChange(null);
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 0);
  };

  // Fullscreen Drawing Handling
  const openFullscreen = () => {
    setFullscreenSig(value);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const saveFullscreen = () => {
    const fsCanvas = fullscreenCanvasRef.current;
    if (fsCanvas) {
      // Auto trim empty bounding margins so aspect ratio is preserved and not squished/tiny
      const cropped = trimAndCropCanvas(fsCanvas, 16);
      const resultUrl = cropped || fsCanvas.toDataURL("image/png");
      lastLoadedValueRef.current = resultUrl;
      onChange(resultUrl);
      setMode("image");
    } else if (fullscreenSig) {
      lastLoadedValueRef.current = fullscreenSig;
      onChange(fullscreenSig);
      setMode("image");
    }
    setIsFullscreen(false);
  };

  // Setup fullscreen canvas on modal open
  useEffect(() => {
    if (!isFullscreen) return;

    const timer = setTimeout(() => {
      const canvas = fullscreenCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#000";

      if (fullscreenSig) {
        const img = new Image();
        img.onload = () => {
          // Draw preserving aspect ratio in center
          const scale = Math.min((rect.width - 40) / img.width, (rect.height - 40) / img.height, 1);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (rect.width - dw) / 2;
          const dy = (rect.height - dh) / 2;

          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, dx, dy, dw, dh);
        };
        img.src = fullscreenSig;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isFullscreen, fullscreenSig]);

  const [isFsDrawing, setIsFsDrawing] = useState(false);

  const startFsDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = fullscreenCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      setIsFsDrawing(true);
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [getPos]
  );

  const drawFs = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isFsDrawing) return;
      const canvas = fullscreenCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isFsDrawing, getPos]
  );

  const stopFsDrawing = useCallback(() => {
    if (!isFsDrawing) return;
    setIsFsDrawing(false);
  }, [isFsDrawing]);

  const clearFsCanvas = useCallback(() => {
    const canvas = fullscreenCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setFullscreenSig(null);
  }, []);

  const handleFsRotate = useCallback(
    async (angle: number) => {
      const fsCanvas = fullscreenCanvasRef.current;
      if (!fsCanvas) return;
      const currentUrl = fsCanvas.toDataURL("image/png");
      const rotated = await rotateImage(currentUrl, angle);
      setFullscreenSig(rotated);
    },
    [rotateImage]
  );

  return (
    <div ref={containerRef} className="w-full space-y-2.5">
      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={switchToDraw}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-control font-medium transition-colors ${
              mode === "draw"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Pen size={12} /> Gambar
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-control bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Upload size={12} /> Unggah
          </button>
          <button
            type="button"
            onClick={openFullscreen}
            title="Layar Penuh (Mudah TTD di HP)"
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-control bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
          >
            <Maximize2 size={12} /> Layar Penuh HP
          </button>
          {value && (
            <>
              <button
                type="button"
                onClick={() => handleScale(1.2)}
                title="Perbesar Tanda Tangan (+20%)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-control bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <ZoomIn size={12} /> Perbesar
              </button>
              <button
                type="button"
                onClick={() => handleScale(0.85)}
                title="Perkecil Tanda Tangan (-15%)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-control bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <ZoomOut size={12} /> Perkecil
              </button>
              <button
                type="button"
                onClick={() => handleRotate(90)}
                title="Putar 90° Searah Jarum Jam"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-control bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <RotateCw size={12} /> +90°
              </button>
              <button
                type="button"
                onClick={() => handleRotate(-90)}
                title="Putar 90° Berlawanan Jarum Jam"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-control bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <RotateCcw size={12} /> -90°
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-control bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Eraser size={12} /> Hapus
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main Canvas Area */}
      <div className="w-full flex justify-center">
        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            style={{ width: width ? `${width}px` : "100%", height: `${height}px` }}
            className="w-full border-2 border-dashed border-rule rounded-panel cursor-crosshair bg-white touch-none shadow-inner"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        ) : value ? (
          <div
            className="w-full border-2 border-rule rounded-panel bg-white flex items-center justify-center overflow-hidden p-3 shadow-inner"
            style={{ width: width ? `${width}px` : "100%", height: `${height}px` }}
          >
            <img
              src={value}
              alt={label}
              className="w-auto h-full max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div
            className="w-full border-2 border-dashed border-rule rounded-panel bg-panel-2/40 flex items-center justify-center text-muted-foreground text-xs"
            style={{ width: width ? `${width}px` : "100%", height: `${height}px` }}
          >
            Belum ada tanda tangan
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Modal (Mobile Landscape Optimized) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background p-3 sm:p-6 animate-in fade-in duration-200">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Pen className="h-4 w-4 text-primary" />
                <span>Area Tanda Tangan Fullscreen</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Tanda tangani di area putih di bawah. Sistem otomatis meng-crop ruang kosong agar tanda tangan proporsional dan tidak gepeng.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFsRotate(90)}
                title="Putar 90°"
                className="h-8 text-xs"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" /> Putar 90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFsCanvas}
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                <Eraser className="h-3.5 w-3.5 mr-1" /> Hapus
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeFullscreen}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveFullscreen}
                className="h-8 text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Selesai & Pakai
              </Button>
            </div>
          </div>

          {/* Fullscreen Drawing Canvas */}
          <div className="relative flex-1 mt-3 flex items-center justify-center bg-white rounded-panel border-2 border-dashed border-rule overflow-hidden shadow-inner">
            <canvas
              ref={fullscreenCanvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseDown={startFsDrawing}
              onMouseMove={drawFs}
              onMouseUp={stopFsDrawing}
              onMouseLeave={stopFsDrawing}
              onTouchStart={startFsDrawing}
              onTouchMove={drawFs}
              onTouchEnd={stopFsDrawing}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
