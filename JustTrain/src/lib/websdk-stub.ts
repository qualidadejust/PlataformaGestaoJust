// Stub vazio. O @digitalpersona/devices faz `import 'WebSdk'` apenas por efeito
// colateral, esperando o global `window.WebSdk`. Esse global é fornecido pelo
// <script src="/websdk.client.ui.js"> no index.html (carregado como script
// clássico). Portanto este import não precisa fazer nada.
export {};
