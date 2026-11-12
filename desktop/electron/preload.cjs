'use strict'
const { contextBridge, ipcRenderer, webUtils } = require('electron')
const call = (name, data) => ipcRenderer.invoke(name, data)
contextBridge.exposeInMainWorld('printokDesktop', Object.freeze({
  authStatus: () => call('auth:status'),
  setupPassword: (password,confirm) => call('auth:setup',{password,confirm}),
  login: password => call('auth:login',{password}),
  logout: () => call('auth:logout'),
  changePassword: (oldPassword,newPassword,confirm) => call('auth:change',{oldPassword,newPassword,confirm}),
  load: () => call('data:load'),
  chooseFile: () => call('file:choose'),
  stageDroppedFile: file => {
    const filePath=webUtils.getPathForFile(file)
    if(!filePath) throw new Error('تعذر قراءة مسار الملف؛ استخدم زر اختيار الملف')
    return call('file:stagePath',{path:filePath})
  },
  createOrder: (fields,fileToken,draft) => call('order:create',{fields,fileToken,draft}),
  addVersion: (orderId,fileToken) => call('order:addVersion',{orderId,fileToken}),
  decide: (orderId,decision,note,fileToken) => call('order:decide',{orderId,decision,note,fileToken}),
  openFile: (orderId,version,kind='design',showInFolder=false) => call('file:open',{orderId,version,kind,showInFolder}),
  preview: (orderId,version,kind='design') => call('file:preview',{orderId,version,kind}),
  saveShopName: name => call('settings:shop',{name}),
  chooseStorageRoot: () => call('settings:chooseRoot'),
  openStorageRoot: () => call('settings:openRoot'),
  chooseClientFolder: phone => call('settings:chooseClientFolder',{phone}),
  resetClientFolder: phone => call('settings:resetClientFolder',{phone}),
  openClientFolder: (orderId,phone,client) => call('settings:openClientFolder',{orderId,phone,client}),
  backup: () => call('settings:backup'),
  checkUpdates: () => call('updates:check'),
  openUpdate: url => call('updates:open',{url})
}))
