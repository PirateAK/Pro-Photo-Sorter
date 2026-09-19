import React, { useEffect, useRef, useState } from "react";
import { X, Save } from "lucide-react";
import { cropBoxFor, targetDimsFor, getPrintSize, loadImageFromHandle } from "../lib/resize";

// Crop preview modal — shows the source photo with a draggable crop-box overlay
// constrained to the requested aspect ratio. Auto-centered by default; drag to
// reposition. Confirm calls onConfirm({ centerX, centerY }) with 0..1 percentages.
export default function ResizeCropModal({ open, imageHandle, printKey, imageName, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState({ img: null, url: null, sourceW: 0, sourceH: 0 });
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open || !imageHandle) return;
    let alive = true;
    setState({ img: null, url: null, sourceW: 0, sourceH: 0 });
    setCenterX(0.5);
    setCenterY(0.5);
    (async () => {
      try {
        const { img, url } = await loadImageFromHandle(imageHandle);
        if (!alive) { URL.revokeObjectURL(url); return; }
        setState({ img, url, sourceW: img.naturalWidth, sourceH: img.naturalHeight });
      } catch { /* ignore */ }
    })();
    return () => {
      alive = false;
      setState((s) => { if (s.url) URL.revokeObjectURL(s.url); return { img: null, url: null, sourceW: 0, sourceH: 0 }; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageHandle]);

  // Draw the source image + crop box overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state.img || !printKey) return;
    const CSS_W = 720;
    const CSS_H = 480;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    canvas.style.width = CSS_W + "px";
    canvas.style.height = CSS_H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CSS_W, CSS_H);
    ctx.fillStyle = "#0a0806";
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    // Fit the source photo into the preview area (letterboxed)
    const scale = Math.min(CSS_W / state.sourceW, CSS_H / state.sourceH);
    const dw = state.sourceW * scale;
    const dh = state.sourceH * scale;
    const dx = (CSS_W - dw) / 2;
    const dy = (CSS_H - dh) / 2;
    ctx.drawImage(state.img, dx, dy, dw, dh);

    // Compute crop box in source pixels
    const dims = targetDimsFor({ printKey, sourceW: state.sourceW, sourceH: state.sourceH });
    if (!dims) return;
    const { cw, ch } = cropBoxFor({ sourceW: state.sourceW, sourceH: state.sourceH, aspectW: dims.aspectW, aspectH: dims.aspectH });

    // Clamp center so crop stays inside source
    const halfW = cw / 2;
    const halfH = ch / 2;
    const cxSrc = Math.max(halfW, Math.min(state.sourceW - halfW, centerX * state.sourceW));
    const cySrc = Math.max(halfH, Math.min(state.sourceH - halfH, centerY * state.sourceH));

    // Convert to preview coordinates
    const boxX = dx + (cxSrc - halfW) * scale;
    const boxY = dy + (cySrc - halfH) * scale;
    const boxW = cw * scale;
    const boxH = ch * scale;

    // Darken outside crop
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(dx, dy, dw, boxY - dy);                           // top
    ctx.fillRect(dx, boxY + boxH, dw, dy + dh - (boxY + boxH));    // bottom
    ctx.fillRect(dx, boxY, boxX - dx, boxH);                       // left
    ctx.fillRect(boxX + boxW, boxY, dx + dw - (boxX + boxW), boxH); // right

    // Crop box border
    ctx.strokeStyle = "rgba(198, 138, 83, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

    // Rule-of-thirds guides inside crop
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(boxX + (boxW * i) / 3, boxY);
      ctx.lineTo(boxX + (boxW * i) / 3, boxY + boxH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + (boxH * i) / 3);
      ctx.lineTo(boxX + boxW, boxY + (boxH * i) / 3);
      ctx.stroke();
    }
  }, [state, centerX, centerY, printKey]);

  const setFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const CSS_W = rect.width;
    const CSS_H = rect.height;
    const scale = Math.min(CSS_W / state.sourceW, CSS_H / state.sourceH);
    const dw = state.sourceW * scale;
    const dh = state.sourceH * scale;
    const dx = (CSS_W - dw) / 2;
    const dy = (CSS_H - dh) / 2;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Convert preview mouse coords into source-image coords
    const sx = (mx - dx) / scale;
    const sy = (my - dy) / scale;
    setCenterX(Math.max(0, Math.min(1, sx / state.sourceW)));
    setCenterY(Math.max(0, Math.min(1, sy / state.sourceH)));
  };

  const onPointerDown = (e) => {
    if (!state.img) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromEvent(e);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setFromEvent(e);
  };
  const onPointerUp = (e) => {
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  if (!open) return null;
  const size = getPrintSize(printKey);
  const dims = state.img ? targetDimsFor({ printKey, sourceW: state.sourceW, sourceH: state.sourceH }) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80"
      onClick={onCancel}
      data-testid="resize-crop-modal-backdrop"
    >
      <div
        className="pane rounded-lg shadow-2xl border border-app w-full max-w-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="resize-crop-modal"
      >
        <div className="px-4 py-3 border-b border-app flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-sm">
              Resize for {size ? size.key.replace("x", " × ") : printKey} print
            </h3>
            <p className="text-xs text-dim mt-0.5 truncate">
              {imageName || "Current photo"}
              {dims && (
                <span className="text-primary-earth ml-2 font-mono">
                  → {dims.w} × {dims.h} px (300 DPI)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded hover:bg-surface-hover flex items-center justify-center"
            data-testid="resize-crop-close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 bg-app">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="w-full rounded cursor-move select-none"
            data-testid="resize-crop-canvas"
          />
          <div className="text-[11px] text-dim mt-2 flex items-center justify-between">
            <span>Drag to reposition · Rule-of-thirds guides shown</span>
            <span className="font-mono">center: x {Math.round(centerX * 100)}% · y {Math.round(centerY * 100)}%</span>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-app flex items-center justify-end gap-2">
          <button
            onClick={() => { setCenterX(0.5); setCenterY(0.5); }}
            className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
            data-testid="resize-crop-recenter"
          >
            Auto-center
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
            data-testid="resize-crop-cancel"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ centerX, centerY })}
            disabled={!state.img}
            className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
            data-testid="resize-crop-confirm"
          >
            <Save size={12} /> Store {size?.key.replace("x", "×")}
          </button>
        </div>
      </div>
    </div>
  );
}
