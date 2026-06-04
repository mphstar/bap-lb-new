"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Upload, Pen } from "lucide-react";

interface SignaturePadProps {
  value: string | null; // base64 data URL
  onChange: (value: string | null) => void;
  label?: string;
  width?: number;
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label = "Tanda Tangan",
  width = 320,
  height = 120,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "image">(value ? "image" : "draw");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedValueRef = useRef<string | null>(value);

  // Sync state if value is reset or changed from the outside
  useEffect(() => {
    if (value !== lastLoadedValueRef.current) {
      lastLoadedValueRef.current = value;
      if (!value) {
        // Clear canvas
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

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";

    // If there's an existing value and in draw mode, draw it
    if (value && mode === "draw") {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
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

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (mode !== "draw") return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      const pos = getPos(e);
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
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, mode, getPos]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Export canvas to data URL
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
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
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [onChange]
  );

  const switchToDraw = () => {
    setMode("draw");
    lastLoadedValueRef.current = null;
    onChange(null);
    // Clear canvas
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={switchToDraw}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              mode === "draw"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Pen size={12} /> Gambar
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Upload size={12} /> Import
          </button>
          {value && (
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors dark:bg-red-950 dark:text-red-300"
            >
              <Eraser size={12} /> Hapus
            </button>
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

      {mode === "draw" ? (
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          className="border-2 border-dashed border-border rounded-lg cursor-crosshair bg-white touch-none"
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
          className="border-2 border-border rounded-lg bg-white flex items-center justify-center overflow-hidden"
          style={{ width, height }}
        >
          <img
            src={value}
            alt={label}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
          style={{ width, height }}
        >
          Belum ada tanda tangan
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
