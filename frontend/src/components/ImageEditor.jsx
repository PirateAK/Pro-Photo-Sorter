import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X, ZoomIn, ZoomOut, RotateCcw, Save, Crop, Sun, Moon, Zap,
  Maximize2, Move, Scissors, RotateCw, Contrast, Droplet, Eye,
  Wand2, Palette, Trash2, Plus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { sanitizeName } from "../lib/fsapi";
import { autoAnalyze } from "../lib/autoTone";
import Thumbnail from "./Thumbnail";

const ASPECT_RATIOS = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

/**
 * ImageEditor - modal editor with zoom, pan, crop, rotate/straighten,
 * brightness/contrast/saturation/sharpen, before/after peek, save-as-new.
 *
 * v1.2.9 — accepts `images` + `currentImageName` + `onNavigate(name)` so
 * the editor renders a mini filmstrip at the bottom. Clicking a thumb (or
 * the prev/next arrows) jumps to another image without closing the editor.
 * If the current edits aren't saved, the standard three-way prompt is
 * reused with the choice "Save changes" or "Discard" now flowing into a
 * pending navigation instead of a close.
 */
export default function ImageEditor({
  open, onClose, imageFileHandle, imageName, destDirHandle, sourceDirHandle,
  looks = [], onLooksChange,
  images = [], currentImageName = "", onNavigate,
}) {
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [angle, setAngle] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null); // null = free
  const [angleGrid, setAngleGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTarget, setSaveTarget] = useState("source");
  const [peeking, setPeeking] = useState(false);
  const [showSaveLook, setShowSaveLook] = useState(false);
  const [lookName, setLookName] = useState("");

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const dragging = useRef(null);
  const cropDrag = useRef(null);
  const workBmpRef = useRef(null); // sharpened bitmap cache
  const lastSharpVal = useRef(-1);
  // Bumps whenever the stage's actual size changes (window resize, initial
  // layout settle-in, DevTools toggle, etc.). Forces both the fit() effect
  // and the render effect to re-run against the latest stage dimensions,
  // preventing the right-side clip when the editor opens in a non-maximized
  // window before layout has fully settled.
  const [stageTick, setStageTick] = useState(0);

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
    setContrast(0);
    setSaturation(0);
    setSharpness(0);
    setRotation(0);
    setAngle(0);
    setCrop(null);
    setAspectRatio(null);
    setCropMode(false);
    workBmpRef.current = null;
    lastSharpVal.current = -1;
  };

  // Auto-tone the current image
  const applyAuto = () => {
    if (!imgEl) return;
    const { brightness: b, contrast: c, saturation: s } = autoAnalyze(imgEl);
    setBrightness(b);
    setContrast(c);
    setSaturation(s);
    toast.success("Auto-tone applied", {
      description: `Brightness ${b > 0 ? "+" : ""}${b} · Contrast ${c > 0 ? "+" : ""}${c} · Saturation ${s > 0 ? "+" : ""}${s}`,
    });
  };

  const applyLook = (look) => {
    setBrightness(look.brightness || 0);
    setContrast(look.contrast || 0);
    setSaturation(look.saturation || 0);
    setSharpness(look.sharpness || 0);
    toast(`Applied look: ${look.name}`);
  };

  const saveCurrentAsLook = () => {
    const name = lookName.trim();
    if (!name) {
      toast.error("Enter a name for the look");
      return;
    }
    const look = {
      id: `look-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      brightness,
      contrast,
      saturation,
      sharpness,
    };
    onLooksChange?.([...(looks || []), look]);
    toast.success(`Saved look "${name}"`);
    setLookName("");
    setShowSaveLook(false);
  };

  const deleteLook = (id) => {
    onLooksChange?.((looks || []).filter((l) => l.id !== id));
  };

  // Helper: create a max-size centered crop with the given ratio
  const cropToAspect = useCallback((ratio) => {
    if (!imgEl) return;
    if (!ratio) return; // Free — just keep current crop
    const iw = imgEl.width, ih = imgEl.height;
    let w, h;
    if (iw / ih > ratio) {
      // image wider than ratio → limited by height
      h = ih;
      w = h * ratio;
    } else {
      w = iw;
      h = w / ratio;
    }
    const x = (iw - w) / 2;
    const y = (ih - h) / 2;
    setCrop({ x, y, w, h });
  }, [imgEl]);

  const selectAspect = (ratio) => {
    setAspectRatio(ratio);
    if (ratio && rotation === 0 && angle === 0) {
      cropToAspect(ratio);
      setCropMode(true);
    }
  };

  // Fit-to-window
  const fit = useCallback(() => {
    if (!imgEl || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    // Account for rotation-swap of dimensions when rotated ±90/270
    const swap = rotation === 90 || rotation === 270;
    const iw = swap ? imgEl.height : imgEl.width;
    const ih = swap ? imgEl.width : imgEl.height;
    const z = Math.min(rect.width / iw, rect.height / ih, 1);
    setZoom(z);
    setPan({ x: 0, y: 0 });
  }, [imgEl, rotation]);

  useEffect(() => {
    if (imgEl) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl, stageTick]);

  // Watch for stage size changes (window resize, layout settle, DevTools, etc.)
  // and bump stageTick so both fit() and the render effect re-run.
  useEffect(() => {
    if (!open) return;
    const bump = () => setStageTick((t) => t + 1);
    window.addEventListener("resize", bump);
    let ro;
    if (typeof ResizeObserver !== "undefined" && stageRef.current) {
      ro = new ResizeObserver(bump);
      ro.observe(stageRef.current);
    }
    // Also run one delayed bump after the modal mounts so the initial
    // getBoundingClientRect() sees the fully-settled layout.
    const t = setTimeout(bump, 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", bump);
      ro?.disconnect();
    };
  }, [open]);

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
      const a = amount / 100;
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

  // Combined CSS filter string for brightness/contrast/saturation
  const buildFilterString = useCallback(() => {
    const parts = [];
    if (brightness !== 0) parts.push(`brightness(${1 + brightness / 100})`);
    if (contrast !== 0) parts.push(`contrast(${1 + contrast / 100})`);
    if (saturation !== 0) parts.push(`saturate(${1 + saturation / 100})`);
    return parts.length ? parts.join(" ") : "none";
  }, [brightness, contrast, saturation]);

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

      // "Peek original" bypasses all edits (keeps zoom+pan for context)
      const source =
        peeking || sharpness === 0 ? imgEl : await buildSharpBitmap(sharpness);
      if (cancelled) return;

      const iw = imgEl.width, ih = imgEl.height;
      // Effective rotation for display
      const totalDeg = peeking ? 0 : rotation + angle;
      const rad = (totalDeg * Math.PI) / 180;
      // Approximate bounding box (only exact for 90-multiples but good enough for zoom-fit)
      const cw = canvas.width;
      const ch = canvas.height;
      const cx = cw / 2 + pan.x;
      const cy = ch / 2 + pan.y;

      ctx.filter = peeking ? "none" : buildFilterString();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.scale(zoom, zoom);
      ctx.drawImage(source, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
      ctx.filter = "none";

      // Draw crop overlay only when not peeking, and only for un-rotated case
      // (crop coords are in un-rotated image space)
      if (crop && !peeking && rotation === 0 && angle === 0) {
        const dx = cx - (iw * zoom) / 2;
        const dy = cy - (ih * zoom) / 2;
        const rx = dx + crop.x * zoom;
        const ry = dy + crop.y * zoom;
        const rw = crop.w * zoom;
        const rh = crop.h * zoom;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, cw, ry);
        ctx.fillRect(0, ry + rh, cw, ch - (ry + rh));
        ctx.fillRect(0, ry, rx, rh);
        ctx.fillRect(rx + rw, ry, cw - (rx + rw), rh);
        ctx.strokeStyle = "#c68a53";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(rx + (rw * i) / 3, ry);
          ctx.lineTo(rx + (rw * i) / 3, ry + rh);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(rx, ry + (rh * i) / 3);
          ctx.lineTo(rx + rw, ry + (rh * i) / 3);
          ctx.stroke();
        }
      }

      // Horizon grid overlay when straightening
      if (angleGrid && !peeking) {
        ctx.save();
        ctx.strokeStyle = "rgba(198, 138, 83, 0.6)";
        ctx.lineWidth = 1;
        // Vertical lines every 10% width
        for (let i = 1; i < 10; i++) {
          ctx.beginPath();
          ctx.moveTo((cw * i) / 10, 0);
          ctx.lineTo((cw * i) / 10, ch);
          ctx.stroke();
        }
        // Horizontal lines every 10% height
        for (let i = 1; i < 10; i++) {
          ctx.beginPath();
          ctx.moveTo(0, (ch * i) / 10);
          ctx.lineTo(cw, (ch * i) / 10);
          ctx.stroke();
        }
        // Center strong lines
        ctx.strokeStyle = "rgba(242, 235, 229, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cw / 2, 0);
        ctx.lineTo(cw / 2, ch);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, ch / 2);
        ctx.lineTo(cw, ch / 2);
        ctx.stroke();
        ctx.restore();
      }
    })();

    return () => { cancelled = true; };
  }, [imgEl, zoom, pan, brightness, contrast, saturation, sharpness, rotation, angle, crop, buildSharpBitmap, buildFilterString, peeking, angleGrid, stageTick]);

  // Wheel to zoom
  const onWheel = (e) => {
    if (!imgEl) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.12 : 1 / 1.12;
    setZoom((z) => Math.max(0.1, Math.min(8, z * factor)));
  };

  // Convert canvas coords to image coords (only valid when rotation==0, angle==0)
  const canvasToImage = (cx, cy) => {
    if (!imgEl || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const iw = imgEl.width, ih = imgEl.height;
    const dw = iw * zoom, dh = ih * zoom;
    const dx = (canvas.width - dw) / 2 + pan.x;
    const dy = (canvas.height - dh) / 2 + pan.y;
    return { x: (cx - dx) / zoom, y: (cy - dy) / zoom };
  };

  const canCrop = rotation === 0 && angle === 0;

  const onPointerDown = (e) => {
    if (!imgEl || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (cropMode && canCrop) {
      const p = canvasToImage(cx, cy);
      cropDrag.current = { start: p };
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
      let x = Math.max(0, Math.min(iw, Math.min(s.x, p.x)));
      let y = Math.max(0, Math.min(ih, Math.min(s.y, p.y)));
      let w = Math.max(1, Math.min(iw - x, Math.abs(p.x - s.x)));
      let h = Math.max(1, Math.min(ih - y, Math.abs(p.y - s.y)));
      // Constrain to aspect ratio if locked
      if (aspectRatio) {
        // choose the dominant dimension and derive the other
        const drawFromCornerX = p.x >= s.x;
        const drawFromCornerY = p.y >= s.y;
        if (w / h > aspectRatio) {
          w = h * aspectRatio;
        } else {
          h = w / aspectRatio;
        }
        // Clamp to bounds while keeping ratio
        if (drawFromCornerX && s.x + w > iw) { w = iw - s.x; h = w / aspectRatio; }
        if (drawFromCornerY && s.y + h > ih) { h = ih - s.y; w = h * aspectRatio; }
        x = drawFromCornerX ? s.x : Math.max(0, s.x - w);
        y = drawFromCornerY ? s.y : Math.max(0, s.y - h);
      }
      setCrop({ x, y, w, h });
    }
  };

  const onPointerUp = (e) => {
    dragging.current = null;
    cropDrag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  // Keyboard peek (\ or `) — hold to peek original
  useEffect(() => {
    if (!open) return;
    const isInInput = () => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };
    const down = (e) => {
      if (isInInput()) return;
      if (e.key === "\\" || e.key === "`") { e.preventDefault(); setPeeking(true); }
      if (e.key === "Escape") { e.preventDefault(); onClose(null); }
    };
    const up = (e) => {
      if (isInInput()) return;
      if (e.key === "\\" || e.key === "`") { e.preventDefault(); setPeeking(false); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [open, onClose]);

  // Save edited image
  const saveEdited = async ({ suppressClose = false } = {}) => {
    if (!imgEl) return;
    const dir = saveTarget === "destination" ? destDirHandle : sourceDirHandle;
    if (!dir) {
      toast.error(saveTarget === "destination" ? "No destination selected" : "No source folder");
      return;
    }
    setSaving(true);
    try {
      const source = sharpness > 0 ? await buildSharpBitmap(sharpness) : imgEl;

      // Step 1: Full-res rotate (rotation + straighten). If both are zero, use source directly.
      const totalDeg = rotation + angle;
      let rotated = source;
      if (totalDeg !== 0) {
        const rad = (totalDeg * Math.PI) / 180;
        const sw = source.width, sh = source.height;
        // Bounding box after rotation
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const nw = Math.round(sw * cos + sh * sin);
        const nh = Math.round(sw * sin + sh * cos);
        const rc = document.createElement("canvas");
        rc.width = nw;
        rc.height = nh;
        const rctx = rc.getContext("2d");
        rctx.imageSmoothingQuality = "high";
        rctx.translate(nw / 2, nh / 2);
        rctx.rotate(rad);
        rctx.drawImage(source, -sw / 2, -sh / 2);
        rotated = rc;
      }

      // Step 2: Crop (only allowed when rotation+angle=0, guarded in UI)
      const useCrop = crop && rotation === 0 && angle === 0;
      const rect = useCrop
        ? { sx: Math.round(crop.x), sy: Math.round(crop.y), sw: Math.round(crop.w), sh: Math.round(crop.h) }
        : { sx: 0, sy: 0, sw: rotated.width, sh: rotated.height };

      const out = document.createElement("canvas");
      out.width = rect.sw;
      out.height = rect.sh;
      const octx = out.getContext("2d");
      octx.imageSmoothingQuality = "high";
      octx.filter = buildFilterString();
      octx.drawImage(rotated, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
      octx.filter = "none";

      const blob = await new Promise((res) => out.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("Failed to encode");

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
      if (suppressClose) {
        // v1.2.9 — save-then-navigate flow keeps the editor open. Reset the
        // per-edit sliders so the next image opens with a clean slate.
        resetTransform();
      } else {
        onClose(outName);
      }
    } catch (e) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const hasAnyEdits = () => (
    brightness !== 0 || contrast !== 0 || saturation !== 0 || sharpness !== 0 ||
    rotation !== 0 || Math.abs(angle) > 0.01 || crop !== null
  );

  const [showDonePrompt, setShowDonePrompt] = useState(false);
  // v1.2.9 — if non-null, the done-prompt (or a direct save) will flow into
  // onNavigate(pendingNavigate) instead of onClose. Cleared by every path.
  const pendingNavigateRef = useRef(null);

  const doneEditing = () => {
    if (hasAnyEdits()) {
      // v1.1.5: three-way prompt so an accidental Done can't silently vanish
      // your work OR silently write a file you didn't want.
      setShowDonePrompt(true);
    } else {
      onClose(null);
    }
  };

  const doneSave = async () => {
    setShowDonePrompt(false);
    const target = pendingNavigateRef.current;
    pendingNavigateRef.current = null;
    await saveEdited({ suppressClose: !!target });
    if (target) onNavigate?.(target);
  };
  const doneDiscard = () => {
    setShowDonePrompt(false);
    const target = pendingNavigateRef.current;
    pendingNavigateRef.current = null;
    toast("Discarded edits — original file untouched");
    if (target) onNavigate?.(target); else onClose(null);
  };
  const doneCancel = () => {
    setShowDonePrompt(false);
    pendingNavigateRef.current = null;
  };

  // v1.2.9 — navigate to another image inside the editor. If unsaved edits
  // are present, park the target and open the three-way prompt; otherwise
  // jump instantly.
  const idxOfCurrent = useMemo(
    () => images.findIndex((f) => f.name === currentImageName),
    [images, currentImageName]
  );
  const navigateTo = useCallback((name) => {
    if (!name || name === currentImageName || !onNavigate) return;
    if (hasAnyEdits()) {
      pendingNavigateRef.current = name;
      setShowDonePrompt(true);
      return;
    }
    onNavigate(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageName, onNavigate, brightness, contrast, saturation, sharpness, rotation, angle, crop]);
  const navigatePrev = useCallback(() => {
    if (idxOfCurrent > 0) navigateTo(images[idxOfCurrent - 1].name);
  }, [idxOfCurrent, images, navigateTo]);
  const navigateNext = useCallback(() => {
    if (idxOfCurrent >= 0 && idxOfCurrent < images.length - 1) navigateTo(images[idxOfCurrent + 1].name);
  }, [idxOfCurrent, images, navigateTo]);

  if (!open) return null;

  const showSlider = (label, Icon, val, setter, min, max, testid, help) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-dim font-heading flex items-center gap-1">
          <Icon size={11} /> {label}
        </div>
        <span className="text-xs font-mono text-primary-earth" data-testid={`${testid}-value`}>
          {val > 0 ? `+${val}` : val}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => setter(parseInt(e.target.value, 10))}
        className="w-full accent-[color:var(--primary)]"
        data-testid={`${testid}-slider`}
      />
      {help && <p className="text-[10px] text-dim mt-0.5">{help}</p>}
    </div>
  );

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
          <button
            onMouseDown={() => setPeeking(true)}
            onMouseUp={() => setPeeking(false)}
            onMouseLeave={() => setPeeking(false)}
            onTouchStart={() => setPeeking(true)}
            onTouchEnd={() => setPeeking(false)}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border ${
              peeking ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app hover:bg-surface-hover border-app"
            }`}
            data-testid="peek-original"
            title="Hold to preview original (or hold ` or \\)"
          >
            <Eye size={13} /> {peeking ? "Original" : "Peek"}
            {!peeking && <span className="kbd ml-1">\</span>}
          </button>
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
            onClick={doneEditing}
            disabled={saving || !imgEl}
            className="px-3 py-1.5 rounded bg-success-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
            data-testid="editor-done"
            title="Save any changes and return to sorting"
          >
            ✓ Done
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

          {/* Rotate & Straighten */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2 flex items-center gap-1">
              <RotateCw size={11} /> Rotate & Straighten
            </div>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setRotation((r) => (r + 270) % 360)}
                className="flex-1 px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
                data-testid="rotate-ccw"
                title="Rotate 90° counter-clockwise"
              >
                <RotateCcw size={12} /> −90°
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex-1 px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
                data-testid="rotate-cw"
                title="Rotate 90° clockwise"
              >
                <RotateCw size={12} /> +90°
              </button>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-dim">Fine-tune</span>
              <span className="text-xs font-mono text-primary-earth" data-testid="angle-value">
                {angle > 0 ? `+${angle.toFixed(1)}` : angle.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.1"
              value={angle}
              onChange={(e) => setAngle(parseFloat(e.target.value))}
              onPointerDown={() => setAngleGrid(true)}
              onPointerUp={() => setAngleGrid(false)}
              onPointerCancel={() => setAngleGrid(false)}
              onFocus={() => setAngleGrid(true)}
              onBlur={() => setAngleGrid(false)}
              className="w-full accent-[color:var(--primary)]"
              data-testid="angle-slider"
            />
            <div className="flex items-center justify-between text-[10px] text-dim mt-0.5">
              <span>−15°</span>
              <button onClick={() => setAngle(0)} className="underline hover:text-app" data-testid="angle-reset">
                0
              </button>
              <span>+15°</span>
            </div>
            <button
              onClick={() => setAngleGrid((g) => !g)}
              className={`mt-2 w-full px-2 py-1 rounded text-[10px] border ${
                angleGrid ? "bg-primary-earth/20 border-primary-earth text-primary-earth" : "bg-app border-app hover:bg-surface-hover text-dim"
              }`}
              data-testid="toggle-angle-grid"
            >
              {angleGrid ? "Grid ON" : "Show alignment grid"}
            </button>
            {rotation !== 0 && (
              <p className="text-[10px] text-dim mt-1 font-mono">rotation: {rotation}°</p>
            )}
          </div>

          {/* Brightness */}
          {showSlider("Brightness", Sun, brightness, setBrightness, -80, 80, "brightness", null)}

          {/* Contrast */}
          {showSlider("Contrast", Contrast, contrast, setContrast, -50, 50, "contrast", null)}

          {/* Saturation */}
          {showSlider("Saturation", Droplet, saturation, setSaturation, -100, 100, "saturation", null)}

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

          {/* Auto-tone */}
          <div>
            <button
              onClick={applyAuto}
              disabled={!imgEl}
              className="w-full px-2 py-1.5 rounded bg-primary-earth/15 border border-primary-earth text-primary-earth hover:bg-primary-earth hover:text-[color:var(--text-inverse)] text-xs flex items-center justify-center gap-1 disabled:opacity-50"
              data-testid="auto-tone"
              title="Analyze histogram and set brightness/contrast/saturation"
            >
              <Wand2 size={12} /> Auto-Enhance
            </button>
          </div>

          {/* Looks (presets) */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2 flex items-center gap-1">
              <Palette size={11} /> Looks
            </div>
            {showSaveLook ? (
              <div className="flex gap-1 mb-2">
                <input
                  autoFocus
                  value={lookName}
                  onChange={(e) => setLookName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCurrentAsLook();
                    if (e.key === "Escape") { setShowSaveLook(false); setLookName(""); }
                  }}
                  placeholder="Name this look…"
                  className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
                  data-testid="look-name-input"
                />
                <button
                  onClick={saveCurrentAsLook}
                  className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs"
                  data-testid="look-save-confirm"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveLook(true)}
                className="w-full mb-2 px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-[11px] flex items-center justify-center gap-1"
                data-testid="save-look-btn"
              >
                <Plus size={11} /> Save current as look…
              </button>
            )}
            {(!looks || looks.length === 0) ? (
              <p className="text-[10px] text-dim italic">No saved looks yet.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-auto">
                {looks.map((l) => (
                  <div
                    key={l.id}
                    className="group flex items-center gap-1 pane rounded px-2 py-1"
                    data-testid={`look-${l.id}`}
                  >
                    <button
                      onClick={() => applyLook(l)}
                      className="flex-1 text-left text-xs truncate hover:text-primary-earth"
                      data-testid={`apply-look-${l.id}`}
                      title={`B ${l.brightness ?? 0} · C ${l.contrast ?? 0} · S ${l.saturation ?? 0} · Sh ${l.sharpness ?? 0}`}
                    >
                      {l.name}
                    </button>
                    <span className="text-[9px] text-dim font-mono">
                      {(l.brightness ?? 0) !== 0 ? `B${l.brightness > 0 ? "+" : ""}${l.brightness}` : ""}
                    </span>
                    <button
                      onClick={() => deleteLook(l.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-danger-earth"
                      data-testid={`delete-look-${l.id}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crop */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2">Crop</div>
            <div className="flex gap-1 mb-2 flex-wrap">
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => selectAspect(a.value)}
                  disabled={!canCrop}
                  className={`px-2 py-1 rounded text-[10px] border ${
                    aspectRatio === a.value ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  data-testid={`aspect-${a.label.replace(":", "x")}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setCropMode(!cropMode); if (cropMode) setCrop(null); }}
              disabled={!canCrop}
              className={`w-full px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border ${
                cropMode ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              data-testid="crop-toggle"
              title={canCrop ? "Draw a crop region" : "Reset rotation to crop"}
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
            {!canCrop && (
              <p className="text-[10px] text-dim mt-1">Crop disabled while rotated. Reset rotation to enable.</p>
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
            <p>Hold <span className="kbd">\</span> or <span className="kbd">`</span> to peek the original.</p>
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
            className={cropMode && canCrop ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}
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
          {peeking && imgEl && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur border border-primary-earth text-xs font-mono font-semibold text-primary-earth flex items-center gap-1.5" data-testid="peek-badge">
              <Eye size={12} /> ORIGINAL
            </div>
          )}

          {/* v1.2.9 — Editor filmstrip: prev/next arrows + horizontal thumb strip.
              Only renders when the parent supplies an image list + onNavigate,
              otherwise gracefully hides so unit-tests / storybook still work. */}
          {images.length > 1 && onNavigate && (
            <EditorFilmstrip
              images={images}
              currentIdx={idxOfCurrent}
              onPick={navigateTo}
              onPrev={navigatePrev}
              onNext={navigateNext}
            />
          )}
        </div>
      </div>

      {/* v1.1.5 Done prompt — three-way choice on close-with-edits */}
      {showDonePrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" data-testid="editor-done-prompt">
          <div className="pane rounded-lg w-full max-w-md shadow-2xl border border-app">
            <div className="px-5 py-3 border-b border-app">
              <h3 className="font-heading font-semibold text-base">You have unsaved edits</h3>
            </div>
            <div className="px-5 py-4 text-sm text-app space-y-2">
              <p>What should we do before closing the editor?</p>
              <ul className="text-xs text-dim space-y-1 mt-2">
                <li><span className="text-app font-semibold">Save changes</span> — writes a new <code>_edit_TIMESTAMP.jpg</code> file, leaves your original untouched.</li>
                <li><span className="text-app font-semibold">Discard</span> — closes the editor and throws away your edits. Original is not modified.</li>
                <li><span className="text-app font-semibold">Cancel</span> — go back to editing, nothing happens.</li>
              </ul>
            </div>
            <div className="px-5 py-3 border-t border-app flex items-center justify-end gap-2">
              <button
                onClick={doneCancel}
                className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
                data-testid="done-prompt-cancel"
              >
                Cancel
              </button>
              <button
                onClick={doneDiscard}
                className="px-3 py-1.5 rounded bg-danger-earth/20 border border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-danger-earth hover:text-[color:var(--text)] text-xs"
                data-testid="done-prompt-discard"
              >
                Discard
              </button>
              <button
                onClick={doneSave}
                className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold"
                data-testid="done-prompt-save"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * EditorFilmstrip (v1.2.9)
 * Compact horizontal thumb strip pinned to the bottom of the editor stage.
 * Prev / Next arrows on the sides; clicking a thumb picks that image.
 * The active thumb auto-scrolls into view when the current image changes.
 */
function EditorFilmstrip({ images, currentIdx, onPick, onPrev, onNext }) {
  const stripRef = useRef(null);

  useEffect(() => {
    if (!stripRef.current || currentIdx < 0) return;
    const el = stripRef.current.querySelector(`[data-testid="editor-strip-thumb-${images[currentIdx]?.name}"]`);
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIdx, images]);

  const atStart = currentIdx <= 0;
  const atEnd = currentIdx < 0 || currentIdx >= images.length - 1;

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/70 backdrop-blur border border-app shadow-2xl"
      style={{ maxWidth: "calc(100% - 24px)" }}
      data-testid="editor-filmstrip"
    >
      <button
        onClick={onPrev}
        disabled={atStart}
        className="w-7 h-7 rounded flex items-center justify-center bg-app/80 hover:bg-primary-earth/40 border border-app text-app disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        data-testid="editor-strip-prev"
        title="Previous image (←)"
      >
        <ChevronLeft size={14} />
      </button>
      <div
        ref={stripRef}
        className="flex items-center gap-1 overflow-x-auto max-w-[70vw] pps-scrollbar"
        style={{ scrollbarWidth: "thin" }}
      >
        {images.map((f, i) => (
          <div
            key={f.name}
            data-testid={`editor-strip-thumb-${f.name}`}
            className="shrink-0"
          >
            <Thumbnail
              file={f}
              cacheKey={f.name}
              active={i === currentIdx}
              onClick={() => onPick(f.name)}
              size={64}
            />
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={atEnd}
        className="w-7 h-7 rounded flex items-center justify-center bg-app/80 hover:bg-primary-earth/40 border border-app text-app disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        data-testid="editor-strip-next"
        title="Next image (→)"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
