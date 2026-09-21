import React from "react";
import TreeNode from "./TreeNode";

export default function FileTree({
  rootHandle, rootName, onSelectFolder, selectedPath, testIdPrefix,
  justStored, refreshCounter,
  editable, onCreateSubfolder, onRenameFolder, onDeleteFolder,
}) {
  if (!rootHandle) return null;
  // Force a full remount of the tree whenever the root folder changes. Without
  // this key, React reuses the same TreeNode instance across root switches and
  // its cached `children` / `open` state keeps showing the previous folder's
  // subfolders instead of the newly picked one.
  const rootKey = `${rootName}::${rootHandle?.name || ""}`;
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
