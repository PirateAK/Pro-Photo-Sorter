import React from "react";
import TreeNode from "./TreeNode";

export default function FileTree({ rootHandle, rootName, onSelectFolder, selectedPath, testIdPrefix }) {
  if (!rootHandle) return null;
  return (
    <div className="flex-1 overflow-auto py-2 pl-1 pr-1" data-testid={`${testIdPrefix}-tree`}>
      <TreeNode
        node={{ name: rootName, handle: rootHandle }}
        depth={0}
        onSelectFolder={onSelectFolder}
        selectedPath={selectedPath}
        path={rootName}
      />
    </div>
  );
}
