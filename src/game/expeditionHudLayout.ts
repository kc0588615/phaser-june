export interface ExpeditionBoardSafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
  dualRail: boolean;
}

export function getExpeditionBoardSafeArea(width: number): ExpeditionBoardSafeArea {
  if (width >= 1024) {
    return { left: 152, right: 152, top: 12, bottom: 12, dualRail: true };
  }
  if (width >= 640) {
    return { left: 0, right: 152, top: 12, bottom: 76, dualRail: false };
  }
  return { left: 0, right: 120, top: 12, bottom: 106, dualRail: false };
}
