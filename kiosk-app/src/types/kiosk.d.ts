export interface KioskBridge {
  onCardScanned: (callback: (value: string) => void) => () => void;
}

declare global {
  interface Window {
    kiosk: KioskBridge;
  }
}
