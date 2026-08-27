import React, { useState, useEffect, useCallback, useMemo, createElement } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, HardDrive } from "lucide-react";
import { listChildren } from "../lib/fsapi";

function TreeNode(props) {
  const {
    node, depth, onSelectFolder, selectedPath, path,
    justStored,      // { [folderPath]: count }
    refreshCounter,  // int; increments to trigger re-list of matching branches
  } = props;
  const [open, setOpen] = useState(depth === 0);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  const isSelected = selectedPath === path;

  // Own badge count for this exact folder
  const badgeCount = justStored?.[path] || 0;

  // Does this node OR any of its descendants have a store in it?
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

  // Auto-expand when a store lands in this branch
  useEffect(() => {
    if (branchHasStore) setOpen(true);
  }, [branchHasStore]);

  // Force re-list children whenever refreshCounter changes AND this branch matches
  useEffect(() => {
    if (!refreshCounter) return;
    if (!branchHasStore) return;
    if (open) {
      load(true);
    } else {
      // Branch is currently closed. Invalidate cached children so the pending
      // auto-expand triggers a fresh listChildren call.
      setChildren(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter]);

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const IconLeft = depth === 0 ? HardDrive : open ? FolderOpen : Folder;
  const iconLeftCls = depth === 0 ? "shrink-0 text-primary-earth" : "shrink-0";

  return (
    <div className="select-none">
      <div
        data-testid={`tree-node-${path}`}
        onClick={() => onSelectFolder(node, path)}
        className={`flex items-center gap-1 py-1 pr-2 rounded cursor-pointer text-sm transition-colors ${
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
