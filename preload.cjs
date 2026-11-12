const { contextBridge, ipcRenderer } = require('electron');
const methods = ['load','meta','list','new','open','switch','minimize','close','folder','export','import','archive','external'];
const api = Object.fromEntries(methods.map(name => [name, (...args) => ipcRenderer.invoke(name, ...args)]));
api.save = (content, revision) => ipcRenderer.sendSync('save', content, revision);
api.onChanged = callback => {
  const listener = () => callback();
  ipcRenderer.on('notes-changed', listener);
  return () => ipcRenderer.removeListener('notes-changed', listener);
};
contextBridge.exposeInMainWorld('notes', api);
