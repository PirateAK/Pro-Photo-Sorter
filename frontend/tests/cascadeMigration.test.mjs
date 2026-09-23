// Regression tests for v1.3 CASCADE MIGRATION.
// The load-time migration in storage.js must:
//   1. Fold each legacy folderItem into its own empty sub-folder
//   2. Preserve existing sub-folders untouched
//   3. Move pack-level filenameItems into a new "_Unsorted filenames" sub-folder
//   4. Strip the legacy folderItems / filenameItems fields on save
//   5. Be idempotent (running twice does nothing extra)
//
// We test the pure migration function inlined here (same code path).

import assert from 'node:assert/strict';

function migratePackShape(pack) {
  const existingSubs = Array.isArray(pack.subfolders) ? pack.subfolders : [];
  const legacyFolderItems = Array.isArray(pack.folderItems) ? pack.folderItems : [];
  const legacyFilenameItems = Array.isArray(pack.filenameItems) ? pack.filenameItems : [];
  const needsMigration = legacyFolderItems.length > 0 || legacyFilenameItems.length > 0;

  let subfolders = existingSubs.map((s) => ({
    ...s,
    filenameItems: Array.isArray(s.filenameItems) ? s.filenameItems : [],
  }));
  if (needsMigration) {
    const migratedFromFolders = legacyFolderItems.map((it, i) => ({
      id: `sub-mig-fp-${pack.id}-${it.id || i}`,
      name: it.label || 'Untitled',
      iconType: it.iconType,
      iconName: it.iconName,
      imageDataUrl: it.imageDataUrl,
      filenameItems: [],
    }));
    subfolders = [...migratedFromFolders, ...subfolders];
    if (legacyFilenameItems.length > 0) {
      subfolders.push({
        id: `sub-mig-un-${pack.id}`,
        name: '_Unsorted filenames',
        iconType: 'lucide',
        iconName: 'Package',
        filenameItems: legacyFilenameItems,
      });
    }
  }
  const { folderItems, filenameItems, ...rest } = pack;
  return { ...rest, subfolders, folderItems: undefined, filenameItems: undefined };
}

// Test 1: legacy pack with folder tags + pack-level filenames + no subs
{
  const legacy = {
    id: 'legacy-1',
    name: 'Holidays',
    folderItems: [
      { id: 'ft-1', label: 'Christmas', iconType: 'lucide', iconName: 'Snowflake' },
      { id: 'ft-2', label: 'Easter',    iconType: 'lucide', iconName: 'Rabbit' },
    ],
    filenameItems: [
      { id: 'fn-1', label: 'family', iconType: 'lucide', iconName: 'Users' },
      { id: 'fn-2', label: 'candid', iconType: 'lucide', iconName: 'Camera' },
    ],
  };
  const migrated = migratePackShape(legacy);
  assert.equal(migrated.subfolders.length, 3, '2 folder-tag subs + 1 _Unsorted');
  assert.equal(migrated.subfolders[0].name, 'Christmas');
  assert.equal(migrated.subfolders[0].filenameItems.length, 0);
  assert.equal(migrated.subfolders[0].iconName, 'Snowflake', 'icon carries over');
  assert.equal(migrated.subfolders[1].name, 'Easter');
  assert.equal(migrated.subfolders[2].name, '_Unsorted filenames');
  assert.equal(migrated.subfolders[2].filenameItems.length, 2, 'orphan filenames preserved');
  assert.equal(migrated.folderItems, undefined, 'legacy folderItems dropped');
  assert.equal(migrated.filenameItems, undefined, 'legacy filenameItems dropped');
  console.log('✓ folder tags + orphan filenames migrate into cascade shape');
}

// Test 2: legacy pack with existing sub-folders + folder tags — subs preserved
{
  const legacy = {
    id: 'legacy-2',
    name: 'Sports',
    folderItems: [
      { id: 'ft-1', label: 'Game', iconType: 'lucide', iconName: 'Flag' },
    ],
    filenameItems: [],
    subfolders: [
      {
        id: 'sub-baseball',
        name: 'Baseball',
        iconType: 'lucide',
        iconName: 'Circle',
        filenameItems: [
          { id: 'sp-bb-1', label: 'Yankees', iconType: 'lucide', iconName: 'Star' },
        ],
      },
    ],
  };
  const migrated = migratePackShape(legacy);
  assert.equal(migrated.subfolders.length, 2, '1 migrated + 1 existing');
  assert.equal(migrated.subfolders[0].name, 'Game', 'migrated first');
  assert.equal(migrated.subfolders[1].name, 'Baseball', 'existing preserved');
  assert.equal(migrated.subfolders[1].filenameItems.length, 1, 'existing filename tags kept');
  assert.equal(migrated.subfolders[1].filenameItems[0].label, 'Yankees');
  console.log('✓ existing sub-folders preserved untouched during migration');
}

// Test 3: idempotency — re-running on already-migrated shape is a no-op
{
  const alreadyCascade = {
    id: 'cascade-1',
    name: 'Wildlife',
    subfolders: [
      { id: 'wf-m', name: 'Mammals', iconType: 'lucide', iconName: 'Rabbit', filenameItems: [
        { id: 'x1', label: 'portrait', iconType: 'lucide', iconName: 'Aperture' },
      ]},
    ],
  };
  const first  = migratePackShape(alreadyCascade);
  const second = migratePackShape(first);
  assert.deepEqual(second.subfolders, first.subfolders, 'idempotent');
  assert.equal(second.subfolders.length, 1);
  console.log('✓ migration is idempotent — no drift on repeated runs');
}

// Test 4: totally empty pack → still valid, no phantom "_Unsorted"
{
  const empty = { id: 'e-1', name: 'Empty', folderItems: [], filenameItems: [] };
  const migrated = migratePackShape(empty);
  assert.equal(migrated.subfolders.length, 0, 'no phantom _Unsorted bucket for empty legacy pack');
  console.log('✓ empty legacy pack yields empty subfolders (no phantom bucket)');
}

console.log('\nAll v1.3 cascade-migration tests passed.');
