import React from "react";
import TreeNode from "./TreeNode";

export default function FileTree({
  rootHandle, rootName, onSelectFolder, selectedPath, testIdPrefix,
  justStored, refreshCounter, remountKey,
  editable, onCreateSubfolder, onRenameFolder, onDeleteFolder,
}) {
  if (!rootHandle) return null;
  // Force a full remount of the tree whenever the root folder changes. The
  // caller passes `remountKey` (a counter bumped on every pick) so we remount
  // even when two picks share the same leaf folder name — Chromium's
  // FileSystemDirectoryHandle.name is just the leaf (e.g. "Photos"), not the
  // full path, so `G:\Photos` and `C:\Users\Kurt\Photos` would otherwise
  // produce identical keys and skip the remount.
  const rootKey = `${remountKey ?? 0}::${rootName}::${rootHandle?.name || ""}`;
  return (
    <div className="flex-1 overflow-auto py-2 pl-1 pr-1" data-testid={`${testIdPrefix}-tree`}>
      <TreeNode
        key={rootKey}
        node={{ name: rootName, handle: rootHandle }}
        depth={0}
        onSelectFolder={onSelectFolder}
        selectedPath={selectedPath}
        path={rootName}
        justStored={justStored}
        refreshCounter={refreshCounter}
        editable={editable}
        onCreateSubfolder={onCreateSubfolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        parentHandle={null}
      />
    </div>
  );
}
