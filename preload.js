const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storeGet:     (key)        => ipcRenderer.invoke('store-get', key),
  storeSet:     (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete:  (key)        => ipcRenderer.invoke('store-delete', key),
  exportFile:   (opts)       => ipcRenderer.invoke('export-file', opts),

  listScenes:   ()    => ipcRenderer.invoke('list-scenes'),
  listSounds:   ()    => ipcRenderer.invoke('list-sounds'),
  listMoyu:     ()    => ipcRenderer.invoke('list-moyu'),

  copyScene:    (src) => ipcRenderer.invoke('copy-scene', src),
  copySound:    (src) => ipcRenderer.invoke('copy-sound', src),
  deleteScene:  (p)   => ipcRenderer.invoke('delete-scene', p),
  deleteSound:  (p)   => ipcRenderer.invoke('delete-sound', p),

  showInFinder: (sub) => ipcRenderer.invoke('show-in-finder', sub),

  isElectron: true
});
