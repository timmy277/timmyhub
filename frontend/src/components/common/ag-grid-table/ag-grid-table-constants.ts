// Hằng thuần của AgGridTable, tách khỏi file có AG Grid để nơi dùng import được mà không kéo gói lưới vào bundle.
export const AG_GRID_TABLE_DEFAULT_HEIGHT = 520

// Gắn `context: AG_GRID_NO_EXPORT` vào ColDef để bỏ cột đó khỏi file CSV (cột thao tác, ảnh…).
export const AG_GRID_NO_EXPORT = { excludeFromExport: true } as const
