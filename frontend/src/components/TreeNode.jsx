import React, { useState, useEffect, useCallback, createElement } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, HardDrive } from "lucide-react";
import { listChildren } from "../lib/fsapi";

function TreeNode(props) {
  const { node, depth, onSelectFolder, selectedPath, path } = props;
  const [open, setOpen] = useState(depth === 0);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  const isSelected = selectedPath === path;

  const load = useCallback(async () => {
    if (children !== null || loading) return;
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
    if (open) load();
  }, [open, load]);

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
        <span className="truncate">{node.name}</span>
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
                // Use createElement so Babel's JSX traversal doesn't recurse into a self-reference.
                createElement(TreeNode, {
                  key: c.name + path,
                  node: c,
                  depth: depth + 1,
                  onSelectFolder,
                  selectedPath,
                  path: `${path}/${c.name}`,
                })
              )
            : null}
          {children && children.length === 0 && !loading && depth > 0 ? (
            <div className="text-xs text-dim italic" style={{ paddingLeft: 24 + depth * 12 }}>
              (no subfolders)
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default TreeNode;
