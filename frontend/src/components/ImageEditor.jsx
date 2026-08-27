import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, ZoomIn, ZoomOut, RotateCcw, Save, Crop, Sun, Moon, Zap,
  Maximize2, Move, Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { sanitizeName } from "../lib/fsapi";

/**
 * ImageEditor - modal editor with zoom, pan, crop, sharpen, darken, lighten.
 * Non-destructive: writes a new file to the same source folder or destination.
 */
export default function ImageEditor({ open, onClose, imageFileHandle, imageName, destDirHandle, sourceDirHandle }) {
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1); // 0.1 .. 8
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(0); // -100..100
  const [sharpness, setSharpness] = useState(0); // 0..100
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState(null); // in image-space {x,y,w,h}
  const [saving, setSaving] = useState(false);
  const [saveTarget, setSaveTarget] = useState("source"); // 'source' or 'destination'

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const dragging = useRef(null);
  const cropDrag = useRef(null);
  const workBmpRef = useRef(null); // sharpened bitmap cache
  const lastSharpVal = useRef(-1);

  // Load image when modal opens
  useEffect(() => {
    let alive = true;
    if (!open || !imageFileHandle) return;
    (async () => {
      setImgEl(null);
      resetTransform();
      const file = await imageFileHandle.getFile();
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (alive) setImgEl(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error("Failed to load image");
      };
      img.src = url;
    })();
    return () => { alive = false; };
  }, [open, imageFileHandle]);

  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(0);
    setSharpness(0);
    setCrop(null);
    setCropMode(false);
    workBmpRef.current = null;
    lastSharpVal.current = -1;
  };

  // Fit-to-window
  const fit = useCallback(() => {
    if (!imgEl || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const z = Math.min(rect.width / imgEl.width, rect.height / imgEl.height, 1);
    setZoom(z);
    setPan({ x: 0, y: 0 });
  }, [imgEl]);

  useEffect(() => {
    if (imgEl) fit();
  }, [imgEl, fit]);

  // Sharpen (convolution) - build once per sharpness change
  const buildSharpBitmap = useCallback(async (amount) => {
    if (!imgEl) return null;
    if (amount === lastSharpVal.current && workBmpRef.current) return workBmpRef.current;
    const c = document.createElement("canvas");
    c.width = imgEl.width;
    c.height = imgEl.height;
    const cx = c.getContext("2d");
    cx.drawImage(imgEl, 0, 0);
    if (amount > 0) {
      const src = cx.getImageData(0, 0, c.width, c.height);
      const dst = cx.createImageData(c.width, c.height);
      const a = amount / 100; // 0..1
      // Kernel: sharpen mix
      // center = 1 + 4a, sides = -a
      const k = [
        0, -a, 0,
        -a, 1 + 4 * a, -a,
        0, -a, 0,
      ];
      const w = c.width, h = c.height;
      const s = src.data, d = dst.data;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            let v = 0;
            v += s[i - w * 4 - 4 + ch] * k[0];
            v += s[i - w * 4 + ch] * k[1];
            v += s[i - w * 4 + 4 + ch] * k[2];
            v += s[i - 4 + ch] * k[3];
            v += s[i + ch] * k[4];
            v += s[i + 4 + ch] * k[5];
            v += s[i + w * 4 - 4 + ch] * k[6];
            v += s[i + w * 4 + ch] * k[7];
            v += s[i + w * 4 + 4 + ch] * k[8];
            d[i + ch] = Math.max(0, Math.min(255, v));
          }
          d[i + 3] = s[i + 3];
        }
      }
      // Copy borders unchanged
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
            const i = (y * w + x) * 4;
            d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
          }
        }
      }
      cx.putImageData(dst, 0, 0);
    }
    workBmpRef.current = c;
    lastSharpVal.current = amount;
    return c;
  }, [imgEl]);

  // Render to canvas whenever anything changes
  useEffect(() => {
    if (!imgEl || !canvasRef.current || !stageRef.current) return;
    let cancelled = false;

    (async () => {
      const stageRect = stageRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      canvas.width = stageRect.width;
      canvas.height = stageRect.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";

      const source = sharpness > 0 ? await buildSharpBitmap(sharpness) : imgEl;
      if (cancelled) return;

      const iw = imgEl.width, ih = imgEl.height;
      const dw = iw * zoom, dh = ih * zoom;
      const dx = (canvas.width - dw) / 2 + pan.x;
      const dy = (canvas.height - dh) / 2 + pan.y;

      // Brightness via filter
      const bfilter = brightness === 0 ? "none" : `brightness(${1 + brightness / 100})`;
      ctx.filter = bfilter;
      ctx.drawImage(source, 0, 0, iw, ih, dx, dy, dw, dh);
      ctx.filter = "none";

      // Draw crop overlay
      if (crop) {
        // Convert image-space crop to canvas-space rect
        const cx = dx + crop.x * zoom;
        const cy = dy + crop.y * zoom;
        const cw = crop.w * zoom;
        const ch = crop.h * zoom;
        // Darken outside
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, canvas.width, cy);
        ctx.fillRect(0, cy + ch, canvas.width, canvas.height - (cy + ch));
        ctx.fillRect(0, cy, cx, ch);
        ctx.fillRect(cx + cw, cy, canvas.width - (cx + cw), ch);
        // Border
        ctx.strokeStyle = "#c68a53";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cw, ch);
        // Grid thirds
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + (cw * i) / 3, cy);
          ctx.lineTo(cx + (cw * i) / 3, cy + ch);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + (ch * i) / 3);
          ctx.lineTo(cx + cw, cy + (ch * i) / 3);
          ctx.stroke();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [imgEl, zoom, pan, brightness, sharpness, crop, buildSharpBitmap]);

  // Wheel to zoom
  const onWheel = (e) => {
    if (!imgEl) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.12 : 1 / 1.12;
    setZoom((z) => Math.max(0.1, Math.min(8, z * factor)));
  };

  // Convert canvas coords to image coords
  const canvasToImage = (cx, cy) => {
    if (!imgEl || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const iw = imgEl.width, ih = imgEl.height;
    const dw = iw * zoom, dh = ih * zoom;
    const dx = (canvas.width - dw) / 2 + pan.x;
    const dy = (canvas.height - dh) / 2 + pan.y;
    const ix = (cx - dx) / zoom;
    const iy = (cy - dy) / zoom;
    return { x: ix, y: iy };
  };

  // Pointer handlers - either pan or draw crop
  const onPointerDown = (e) => {
    if (!imgEl || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (cropMode) {
      const p = canvasToImage(cx, cy);
      cropDrag.current = { start: p, current: p };
      setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
    } else {
      dragging.current = { startX: e.clientX - pan.x, startY: e.clientY - pan.y };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (dragging.current) {
      setPan({
        x: e.clientX - dragging.current.startX,
        y: e.clientY - dragging.current.startY,
      });
    } else if (cropDrag.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const p = canvasToImage(cx, cy);
      const s = cropDrag.current.start;
      const iw = imgEl.width, ih = imgEl.height;
      const x = Math.max(0, Math.min(iw, Math.min(s.x, p.x)));
      const y = Math.max(0, Math.min(ih, Math.min(s.y, p.y)));
      const w = Math.max(1, Math.min(iw - x, Math.abs(p.x - s.x)));
      const h = Math.max(1, Math.min(ih - y, Math.abs(p.y - s.y)));
      setCrop({ x, y, w, h });
    }
  };

  const onPointerUp = (e) => {
    dragging.current = null;
    cropDrag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  // Save edited image
  const saveEdited = async () => {
    if (!imgEl) return;
    const dir = saveTarget === "destination" ? destDirHandle : sourceDirHandle;
    if (!dir) {
      toast.error(saveTarget === "destination" ? "No destination selected" : "No source folder");
      return;
    }
    setSaving(true);
    try {
      const source = sharpness > 0 ? await buildSharpBitmap(sharpness) : imgEl;

      // Determine output rect (crop or full)
      const rect = crop
        ? { sx: Math.round(crop.x), sy: Math.round(crop.y), sw: Math.round(crop.w), sh: Math.round(crop.h) }
        : { sx: 0, sy: 0, sw: imgEl.width, sh: imgEl.height };

      const out = document.createElement("canvas");
      out.width = rect.sw;
      out.height = rect.sh;
      const octx = out.getContext("2d");
      octx.imageSmoothingQuality = "high";
      // Apply brightness via ctx.filter
      octx.filter = brightness === 0 ? "none" : `brightness(${1 + brightness / 100})`;
      octx.drawImage(source, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
      octx.filter = "none";

      // Blob & write
      const blob = await new Promise((res) => out.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("Failed to encode");

      // Build a filename: originalStem_edit_TIMESTAMP.jpg
      const dot = imageName.lastIndexOf(".");
      const stem = dot > 0 ? imageName.slice(0, dot) : imageName;
      const ts = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
      const outName = `${sanitizeName(stem)}_edit_${stamp}.jpg`;

      const newHandle = await dir.getFileHandle(outName, { create: true });
      const writable = await newHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      toast.success("Saved edited image", { description: outName });
      onClose(outName);
    } catch (e) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" data-testid="image-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-app bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <Scissors size={16} className="text-primary-earth" />
          <h2 className="font-heading font-semibold text-sm">Image Editor</h2>
          <span className="text-xs text-dim font-mono truncate max-w-xs">{imageName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-app">
            <button
              onClick={() => setSaveTarget("source")}
              className={`px-2.5 py-1 text-xs ${saveTarget === "source" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
              data-testid="save-target-source"
            >
              Save to source
            </button>
            <button
              onClick={() => setSaveTarget("destination")}
              className={`px-2.5 py-1 text-xs ${saveTarget === "destination" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
              data-testid="save-target-destination"
              disabled={!destDirHandle}
              title={destDirHandle ? "" : "Pick a destination first"}
            >
              Save to destination
            </button>
          </div>
          <button
            onClick={saveEdited}
            disabled={saving || !imgEl}
            className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
            data-testid="editor-save"
          >
            <Save size={13} /> {saving ? "Saving…" : "Save as new"}
          </button>
          <button
            onClick={() => onClose(null)}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
            data-testid="editor-close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body: sidebar + canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar controls */}
        <div className="w-64 border-r border-app bg-surface p-4 space-y-5 overflow-auto shrink-0">
          {/* Zoom */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2">Zoom</div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))} className="w-7 h-7 rounded bg-app hover:bg-surface-hover flex items-center justify-center" data-testid="zoom-out">
                <ZoomOut size={13} />
              </button>
              <input
                type="range"
                min="10"
                max="800"
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(parseInt(e.target.value, 10) / 100)}
                className="flex-1 accent-[color:var(--primary)]"
                data-testid="zoom-slider"
              />
              <button onClick={() => setZoom((z) => Math.min(8, z * 1.2))} className="w-7 h-7 rounded bg-app hover:bg-surface-hover flex items-center justify-center" data-testid="zoom-in">
                <ZoomIn size={13} />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-primary-earth">{Math.round(zoom * 100)}%</span>
              <div className="flex gap-1">
                <button onClick={fit} className="px-2 py-0.5 rounded bg-app hover:bg-surface-hover text-[10px] flex items-center gap-1" data-testid="zoom-fit">
                  <Maximize2 size={10} /> Fit
                </button>
                <button onClick={() => { setZoom(1); setPan({x:0,y:0}); }} className="px-2 py-0.5 rounded bg-app hover:bg-surface-hover text-[10px]" data-testid="zoom-100">
                  100%
                </button>
              </div>
            </div>
            <p className="text-[10px] text-dim mt-2 flex items-center gap-1">
              <Move size={10} /> Scroll to zoom · Drag to pan
            </p>
          </div>

          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading flex items-center gap-1">
                <Sun size={11} /> Brightness
              </div>
              <span className="text-xs font-mono text-primary-earth" data-testid="brightness-value">
                {brightness > 0 ? `+${brightness}` : brightness}
              </span>
            </div>
            <input
              type="range"
              min="-80"
              max="80"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--primary)]"
              data-testid="brightness-slider"
            />
            <div className="flex items-center justify-between text-[10px] text-dim mt-0.5">
              <Moon size={9} />
              <span>0</span>
              <Sun size={9} />
            </div>
          </div>

          {/* Sharpen */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading flex items-center gap-1">
                <Zap size={11} /> Sharpen
              </div>
              <span className="text-xs font-mono text-primary-earth" data-testid="sharpen-value">{sharpness}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sharpness}
              onChange={(e) => setSharpness(parseInt(e.target.value, 10))}
              className="w-full accent-[color:var(--primary)]"
              data-testid="sharpen-slider"
            />
            <p className="text-[10px] text-dim mt-0.5">Convolution — higher = sharper</p>
          </div>

          {/* Crop */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2">Crop</div>
            <button
              onClick={() => { setCropMode(!cropMode); if (cropMode) setCrop(null); }}
              className={`w-full px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border ${
                cropMode ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
              }`}
              data-testid="crop-toggle"
            >
              <Crop size={12} /> {cropMode ? "Cropping — drag on image" : "Draw crop region"}
            </button>
            {crop && (
              <div className="text-[10px] text-dim mt-2 font-mono">
                {Math.round(crop.w)} × {Math.round(crop.h)} px
                <button onClick={() => setCrop(null)} className="ml-2 underline hover:text-app" data-testid="clear-crop">
                  clear
                </button>
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={resetTransform}
            className="w-full px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
            data-testid="editor-reset"
          >
            <RotateCcw size={12} /> Reset all edits
          </button>

          <div className="pt-3 border-t border-app text-[10px] text-dim">
            <p className="mb-1">Non-destructive: your original file is never touched. A new JPG is written next to it.</p>
          </div>
        </div>

        {/* Canvas stage */}
        <div
          ref={stageRef}
          className="flex-1 relative overflow-hidden bg-deep grain"
          onWheel={onWheel}
          data-testid="editor-stage"
        >
          <canvas
            ref={canvasRef}
            className={cropMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-testid="editor-canvas"
          />
          {!imgEl && (
            <div className="absolute inset-0 flex items-center justify-center text-dim">
              Loading image…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
