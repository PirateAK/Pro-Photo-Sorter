import React, { useState, useEffect, useCallback, useMemo, useRef, createElement } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, HardDrive, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { listChildren, isImageName } from "../lib/fsapi";

function TreeNode(props) {
  const {
    node, depth, onSelectFolder, selectedPath, path,
    justStored,
    refreshCounter,
    editable,             // if true, hover-actions for add/rename/delete appear
    onCreateSubfolder,    // (parentHandle, parentPath) => void
    onRenameFolder,       // (parentHandle, folderHandle, oldName, parentPath) => void
    onDeleteFolder,       // (parentHandle, folderHandle, name, parentPath) => void
  } = props;
  const [open, setOpen] = useState(depth === 0);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  // Per-folder image count, lazily counted on hover. null = not counted yet.
  const [imgCount, setImgCount] = useState(null);
  const countedRef = useRef(false);
  const isSelected = selectedPath === path;

  const countImages = useCallback(async () => {
    if (countedRef.current) return;
    countedRef.current = true;
    try {
      let n = 0;
      for await (const [name, handle] of node.handle.entries()) {
        if (handle.kind === "file" && isImageName(name)) n++;
      }
      setImgCount(n);
    } catch {
      countedRef.current = false; // allow retry
    }
  }, [node.handle]);

  const badgeCount = justStored?.[path] || 0;
  const branchHasStore = useMemo(() => {
    if (!justStored) return false;
    for (const p of Object.keys(justStored)) {
      if (p === path || p.startsWith(path + "/")) return true;
    }
    return false;
  }, [justStored, path]);

  const load = useCallback(async (force) => {
    if (!force && (children !== null || loading)) return;
    setLoading(true);
    try {
      const { dirs } = await listChildren(node.handle);
      setChildren(dirs);
    } catch (e) {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [node.handle, children, loading]);

  useEffect(() => {
    if (open) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (branchHasStore) setOpen(true);
  }, [branchHasStore]);

  useEffect(() => {
    if (!refreshCounter) return;
    if (!branchHasStore) return;
    if (open) load(true);
    else setChildren(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter]);

  const toggle = (e) => { e.stopPropagation(); setOpen((v) => !v); };

  // Compute parent path (everything before the last '/')
  const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : path;

  const IconLeft = depth === 0 ? HardDrive : open ? FolderOpen : Folder;
  const iconLeftCls = depth === 0 ? "shrink-0 text-primary-earth" : "shrink-0";

  return (
    <div className="select-none">
      <div
        data-testid={`tree-node-${path}`}
        onClick={() => onSelectFolder(node, path)}
        onMouseEnter={countImages}
        className={`group flex items-center gap-1 py-1 pr-1 rounded cursor-pointer text-sm transition-colors ${
          isSelected ? "bg-primary-earth/20 text-primary-earth" : "hover:bg-surface-hover text-app"
        }`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          onClick={toggle}
          className="w-4 h-4 flex items-center justify-center shrink-0 hover:text-primary-earth"
          data-testid={`tree-toggle-${path}`}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <IconLeft size={14} className={iconLeftCls} />
        <span className="truncate flex-1">{node.name}</span>

        {editable && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder?.(node.handle, path);
              }}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-app text-dim hover:text-primary-earth"
              title="Create subfolder"
              data-testid={`tree-add-${path}`}
            >
              <FolderPlus size={11} />
            </button>
            {depth > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameFolder?.(props.parentHandle, node.handle, node.name, parentPath);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-app text-dim hover:text-primary-earth"
                  title="Rename (empty folders only)"
                  data-testid={`tree-rename-${path}`}
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder?.(props.parentHandle, node.handle, node.name, parentPath);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-app text-dim hover:text-danger-earth"
                  title="Delete (empty folders only)"
                  data-testid={`tree-delete-${path}`}
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        )}

        {imgCount !== null && imgCount > 0 && (
          <span
            className="shrink-0 px-1 py-0.5 rounded text-[10px] font-mono text-dim opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`tree-imgcount-${path}`}
            title={`${imgCount} image${imgCount !== 1 ? "s" : ""} in this folder`}
          >
            {imgCount}
          </span>
        )}

        {badgeCount > 0 && (
          <span
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-success-earth text-[color:var(--text-inverse)]"
            data-testid={`tree-badge-${path}`}
            title={`${badgeCount} new file${badgeCount !== 1 ? "s" : ""} this session`}
          >
            +{badgeCount}
          </span>
        )}
      </div>
      {open ? (
        <div>
          {loading ? (
            <div className="text-xs text-dim italic" style={{ paddingLeft: 24 + depth * 12 }}>
              loading…
            </div>
          ) : null}
          {children
            ? children.map((c) =>
                createElement(TreeNode, {
                  key: c.name + path,
                  node: c,
                  depth: depth + 1,
                  onSelectFolder,
                  selectedPath,
                  path: `${path}/${c.name}`,
                  justStored,
                  refreshCounter,
                  editable,
                  onCreateSubfolder,
                  onRenameFolder,
                  onDeleteFolder,
                  parentHandle: node.handle,
                })
              )
            : null}
          {children && children.length === 0 && !loading ? (
            <div className="text-xs text-dim italic" style={{ paddingLeft: 24 + depth * 12 }}>
              {depth === 0 ? "(no subfolders — photos appear in the filmstrip below)" : "(no subfolders)"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default TreeNode;
