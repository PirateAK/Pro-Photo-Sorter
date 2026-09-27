import React, { useEffect, useRef, useState } from "react";
import { X, Save, RectangleHorizontal, RectangleVertical, Wand2 } from "lucide-react";
import { cropBoxFor, targetDimsFor, getPrintSize, loadImageFromHandle } from "../lib/resize";

// Crop preview modal — shows the source photo with a draggable + resizable
// crop-box overlay constrained to the requested aspect ratio. Auto-centered
// by default; drag inside to reposition; drag any corner handle to shrink
// the crop while the aspect ratio is preserved. Confirm calls
// onConfirm({ centerX, centerY, orientation, sizeFrac }).
//
// v1.4.5k — Kurt reported that flipping the orientation toggle to WIDE on
// a portrait source made the crop look small: the canvas was fixed at
// 720×480 (landscape shape) so the portrait source got letterboxed with
// huge black bars, and the landscape crop drawn on top looked tiny even
// though geometrically it was the max fit.
// Fix: the canvas now sizes itself to match the SOURCE image's aspect
// ratio (capped at 780 × 540 CSS px) — so the source photo always fills
// the frame, and the crop rectangle sits as physically large as the
// requested aspect ratio allows. Corner drag handles let Kurt shrink
// the crop below the auto-max when he wants a tighter composition.
export default function ResizeCropModal({ open, imageHandle, printKey, imageName, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState({ img: null, url: null, sourceW: 0, sourceH: 0 });
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);
  // v1.4.5h — orientation: "auto" (match source shape) | "portrait" | "landscape"
  const [orientation, setOrientation] = useState("auto");
  // v1.4.5k — sizeFrac is 0..1, where 1.0 = max-fit crop (fills the source
  // on the constrained axis). Drag any corner handle to shrink toward 0.2.
  const [sizeFrac, setSizeFrac] = useState(1);
  // dragging = { mode: 'move' | 'resize', corner?: 'nw'|'ne'|'sw'|'se' }
  const dragging = useRef(null);

  useEffect(() => {
    if (!open || !imageHandle) return;
    let alive = true;
    setState({ img: null, url: null, sourceW: 0, sourceH: 0 });
    setCenterX(0.5);
    setCenterY(0.5);
    setOrientation("auto");
    setSizeFrac(1);
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

  // v1.4.5k — Canvas CSS size follows the SOURCE aspect ratio (capped).
  // Computed here so both the draw effect and the pointer-math helpers
  // agree on the exact display box the source photo lives in.
  const MAX_CSS_W = 780;
  const MAX_CSS_H = 540;
  const canvasBox = (() => {
    if (!state.sourceW || !state.sourceH) return { CSS_W: MAX_CSS_W, CSS_H: MAX_CSS_H };
    const s = Math.min(MAX_CSS_W / state.sourceW, MAX_CSS_H / state.sourceH);
    return { CSS_W: Math.round(state.sourceW * s), CSS_H: Math.round(state.sourceH * s) };
  })();

  // Reset sizeFrac when the print aspect / orientation / source changes so a
  // shrunken crop from a previous print size doesn't carry over confusingly.
  useEffect(() => {
    setSizeFrac(1);
  }, [printKey, orientation, state.sourceW, state.sourceH]);

  // Draw the source image + crop box overlay + corner handles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state.img || !printKey) return;
    const { CSS_W, CSS_H } = canvasBox;
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

    // v1.4.5k — Because canvas aspect matches source aspect, the fit-scale
    // in both axes is identical and the source draws edge-to-edge. dx/dy
    // stay in the formula for clarity (they resolve to 0/0 by design).
    const scale = Math.min(CSS_W / state.sourceW, CSS_H / state.sourceH);
    const dw = state.sourceW * scale;
    const dh = state.sourceH * scale;
    const dx = (CSS_W - dw) / 2;
    const dy = (CSS_H - dh) / 2;
    ctx.drawImage(state.img, dx, dy, dw, dh);

    // Compute crop box in source pixels
    const dims = targetDimsFor({ printKey, sourceW: state.sourceW, sourceH: state.sourceH, orientation });
    if (!dims) return;
    const maxCrop = cropBoxFor({ sourceW: state.sourceW, sourceH: state.sourceH, aspectW: dims.aspectW, aspectH: dims.aspectH });
    // Apply the user's shrink factor (aspect preserved).
    const cw = maxCrop.cw * sizeFrac;
    const ch = maxCrop.ch * sizeFrac;

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

    // v1.4.5k — Corner drag handles (10×10 CSS px squares) so Kurt can
    // shrink the crop while the aspect ratio stays pinned.
    const HANDLE = 10;
    const cornerPts = [
      { x: boxX, y: boxY },                           // nw
      { x: boxX + boxW, y: boxY },                    // ne
      { x: boxX, y: boxY + boxH },                    // sw
      { x: boxX + boxW, y: boxY + boxH },             // se
    ];
    ctx.fillStyle = "rgba(198, 138, 83, 1)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    for (const p of cornerPts) {
      ctx.fillRect(p.x - HANDLE / 2, p.y - HANDLE / 2, HANDLE, HANDLE);
      ctx.strokeRect(p.x - HANDLE / 2, p.y - HANDLE / 2, HANDLE, HANDLE);
    }
  }, [state, centerX, centerY, printKey, orientation, sizeFrac, canvasBox]);

  // v1.4.5k — Given a pointer event, return { mx, my, dx, dy, dw, dh,
  // scale, boxX, boxY, boxW, boxH, cw, ch, maxCw, maxCh } in preview
  // CSS coords. Encapsulates the geometry so both move + resize handlers
  // work off the same numbers.
  const geometryAtEvent = (e) => {
    if (!state.img) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const CSS_W = rect.width;
    const CSS_H = rect.height;
    const scale = Math.min(CSS_W / state.sourceW, CSS_H / state.sourceH);
    const dw = state.sourceW * scale;
    const dh = state.sourceH * scale;
    const dx = (CSS_W - dw) / 2;
    const dy = (CSS_H - dh) / 2;
    const dims = targetDimsFor({ printKey, sourceW: state.sourceW, sourceH: state.sourceH, orientation });
    if (!dims) return null;
    const maxCrop = cropBoxFor({ sourceW: state.sourceW, sourceH: state.sourceH, aspectW: dims.aspectW, aspectH: dims.aspectH });
    const cw = maxCrop.cw * sizeFrac;
    const ch = maxCrop.ch * sizeFrac;
    const halfW = cw / 2;
    const halfH = ch / 2;
    const cxSrc = Math.max(halfW, Math.min(state.sourceW - halfW, centerX * state.sourceW));
    const cySrc = Math.max(halfH, Math.min(state.sourceH - halfH, centerY * state.sourceH));
    const boxX = dx + (cxSrc - halfW) * scale;
    const boxY = dy + (cySrc - halfH) * scale;
    const boxW = cw * scale;
    const boxH = ch * scale;
    return {
      mx: e.clientX - rect.left,
      my: e.clientY - rect.top,
      dx, dy, dw, dh, scale,
      boxX, boxY, boxW, boxH,
      cxSrc, cySrc,
      maxCw: maxCrop.cw, maxCh: maxCrop.ch,
    };
  };

  const hitCornerAt = (g) => {
    if (!g) return null;
    const HIT = 14; // slightly larger than drawn 10 px handle for easier grabbing
    const corners = [
      { name: "nw", x: g.boxX,           y: g.boxY },
      { name: "ne", x: g.boxX + g.boxW,  y: g.boxY },
      { name: "sw", x: g.boxX,           y: g.boxY + g.boxH },
      { name: "se", x: g.boxX + g.boxW,  y: g.boxY + g.boxH },
    ];
    for (const c of corners) {
      if (Math.abs(g.mx - c.x) <= HIT && Math.abs(g.my - c.y) <= HIT) return c.name;
    }
    return null;
  };

  const onPointerDown = (e) => {
    const g = geometryAtEvent(e);
    if (!g) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const corner = hitCornerAt(g);
    if (corner) {
      dragging.current = { mode: "resize", corner };
      return;
    }
    // Otherwise: reposition. Center the crop under the click.
    dragging.current = { mode: "move" };
    const sx = (g.mx - g.dx) / g.scale;
    const sy = (g.my - g.dy) / g.scale;
    setCenterX(Math.max(0, Math.min(1, sx / state.sourceW)));
    setCenterY(Math.max(0, Math.min(1, sy / state.sourceH)));
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const g = geometryAtEvent(e);
    if (!g) return;
    if (dragging.current.mode === "move") {
      const sx = (g.mx - g.dx) / g.scale;
      const sy = (g.my - g.dy) / g.scale;
      setCenterX(Math.max(0, Math.min(1, sx / state.sourceW)));
      setCenterY(Math.max(0, Math.min(1, sy / state.sourceH)));
      return;
    }
    // Resize: distance from crop center (in source px) to the pointer
    // sets the new half-diagonal. Compute a new sizeFrac from that,
    // clamped to [0.2, 1.0]. Aspect stays pinned because both cw and
    // ch scale by the same fraction.
    const sxSrc = (g.mx - g.dx) / g.scale;
    const sySrc = (g.my - g.dy) / g.scale;
    const dxFromCenter = Math.abs(sxSrc - g.cxSrc);
    const dyFromCenter = Math.abs(sySrc - g.cySrc);
    // Fraction that satisfies both axes; use max so the corner stays
    // under the pointer as long as we haven't hit the aspect wall.
    const fracW = (dxFromCenter * 2) / g.maxCw;
    const fracH = (dyFromCenter * 2) / g.maxCh;
    const frac = Math.max(fracW, fracH);
    setSizeFrac(Math.max(0.2, Math.min(1, frac)));
  };

  const onPointerUp = (e) => {
    dragging.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  if (!open) return null;
  const size = getPrintSize(printKey);
  const dims = state.img ? targetDimsFor({ printKey, sourceW: state.sourceW, sourceH: state.sourceH, orientation }) : null;
  const isLandscape = dims ? dims.w >= dims.h : false;
  const autoDetectedOrientation = state.img ? (state.sourceW >= state.sourceH ? "landscape" : "portrait") : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80"
      onClick={onCancel}
      data-testid="resize-crop-modal-backdrop"
    >
      <div
        className="pane rounded-lg shadow-2xl border border-app w-full max-w-4xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="resize-crop-modal"
      >
        <div className="px-4 py-3 border-b border-app flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-sm">
              Resize for {size ? size.key.replace("x", " × ") : printKey} print
            </h3>
            <p className="text-xs text-dim mt-0.5 truncate">
              {imageName || "Current photo"}
              {dims && (
                <span className="text-primary-earth ml-2 font-mono">
                  → {dims.w} × {dims.h} px (300 DPI · {isLandscape ? "landscape" : "portrait"})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* v1.4.5h — Orientation toggle. Auto = match source photo
                shape (historical behavior). Portrait / Landscape force
                the crop into that orientation regardless of source. */}
            <div className="flex items-center rounded border border-app overflow-hidden" data-testid="resize-orientation-toggle">
              <button
                onClick={() => setOrientation("auto")}
                className={`px-2 py-1 text-[11px] flex items-center gap-1 ${orientation === "auto" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                data-testid="resize-orientation-auto"
                title={autoDetectedOrientation
                  ? `Auto (matches this photo — ${autoDetectedOrientation})`
                  : "Auto (matches the source photo's shape)"}
              >
                <Wand2 size={10} /> Auto
              </button>
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-2 py-1 text-[11px] flex items-center gap-1 border-l border-app ${orientation === "portrait" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                data-testid="resize-orientation-portrait"
                title="Force portrait (tall) crop, regardless of source"
              >
                <RectangleVertical size={10} /> Tall
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-2 py-1 text-[11px] flex items-center gap-1 border-l border-app ${orientation === "landscape" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                data-testid="resize-orientation-landscape"
                title="Force landscape (wide) crop, regardless of source"
              >
                <RectangleHorizontal size={10} /> Wide
              </button>
            </div>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded hover:bg-surface-hover flex items-center justify-center ml-1"
              data-testid="resize-crop-close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="p-4 bg-app flex flex-col items-center">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="rounded select-none"
            style={{ cursor: dragging.current?.mode === "resize" ? "nwse-resize" : "move", maxWidth: "100%" }}
            data-testid="resize-crop-canvas"
          />
          <div className="text-[11px] text-dim mt-2 flex items-center justify-between w-full" style={{ maxWidth: canvasBox.CSS_W }}>
            <span>Drag inside to reposition · Drag any corner to shrink (aspect-locked)</span>
            <span className="font-mono">
              size: {Math.round(sizeFrac * 100)}% · center: x {Math.round(centerX * 100)}% · y {Math.round(centerY * 100)}%
            </span>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-app flex items-center justify-end gap-2">
          <button
            onClick={() => { setCenterX(0.5); setCenterY(0.5); setSizeFrac(1); }}
            className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
            data-testid="resize-crop-recenter"
          >
            Auto-center · Max size
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
            data-testid="resize-crop-cancel"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ centerX, centerY, orientation, sizeFrac })}
            disabled={!state.img}
            className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
            data-testid="resize-crop-confirm"
          >
            <Save size={12} /> Store {size?.key.replace("x", "×")} {orientation === "landscape" ? "wide" : orientation === "portrait" ? "tall" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
