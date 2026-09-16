// Electron Preload Script for FaceLock Desktop Guard
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  lockWindows: () => ipcRenderer.invoke('lock-workstation'),
  minimizeToTray: () => ipcRenderer.send('window-minimize'),
  showWindow: () => ipcRenderer.send('window-restore'),
  closeApp: () => ipcRenderer.send('window-close'),

  // Independent Floating Desktop Bubble (Bóng nổi thoát ra ngoài Desktop)
  showDesktopBubble: () => ipcRenderer.send('bubble:show'),
  hideDesktopBubble: () => ipcRenderer.send('bubble:hide'),
  sendBubbleAction: (action, payload) => ipcRenderer.send('bubble:action', action, payload),
  onBubbleAction: (callback) => {
    const sub = (_event, action, payload) => callback(action, payload);
    ipcRenderer.on('bubble:action', sub);
    return () => ipcRenderer.removeListener('bubble:action', sub);
  },
  syncBubbleState: (state) => ipcRenderer.send('bubble:sync-state', state),
  onBubbleStateUpdate: (callback) => {
    const sub = (_event, state) => callback(state);
    ipcRenderer.on('bubble:state-update', sub);
    return () => ipcRenderer.removeListener('bubble:state-update', sub);
  },
  onBubbleClosed: (callback) => {
    const sub = () => callback();
    ipcRenderer.on('bubble:closed', sub);
    return () => ipcRenderer.removeListener('bubble:closed', sub);
  },
});

