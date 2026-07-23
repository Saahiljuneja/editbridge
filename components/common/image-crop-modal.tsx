"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  aspect?: number; // default 1 (square)
  shape?: "rect" | "round";
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  // Size of the bounding box after rotation
  const bw = Math.round(image.width * cos + image.height * sin);
  const bh = Math.round(image.width * sin + image.height * cos);

  // Draw rotated image onto an offscreen canvas
  const rotated = document.createElement("canvas");
  rotated.width = bw;
  rotated.height = bh;
  const rctx = rotated.getContext("2d")!;
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Crop from the rotated canvas
  const output = document.createElement("canvas");
  output.width = pixelCrop.width;
  output.height = pixelCrop.height;
  const octx = output.getContext("2d")!;
  octx.drawImage(
    rotated,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    output.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas to Blob failed")), "image/jpeg", 0.92);
  });
}

export function ImageCropModal({ imageSrc, onConfirm, onCancel, aspect = 1, shape = "round" }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Adjust photo</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative bg-gray-900" style={{ height: 300 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="range" min={1} max={3} step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
          </div>

          {/* Rotate */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotation(r => (r - 90 + 360) % 360)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 scale-x-[-1]" />Rotate left
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />Rotate right
            </button>
            <span className="ml-auto text-xs text-gray-400">{rotation}°</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {confirming ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
