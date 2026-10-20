/* Datos solo en este navegador (localStorage). Nada sale del dispositivo. */
(function(){
  "use strict";
  var P="taxiia.";
  function leer(k,def){try{var v=localStorage.getItem(P+k);return v==null?def:JSON.parse(v)}catch(e){return def}}
  function guardar(k,v){try{localStorage.setItem(P+k,JSON.stringify(v));return true}catch(e){return false}}
  function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function h(t,c,x,p){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;if(p)p.appendChild(n);return n}
  function eur(n){return n==null?"—":new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n)}
  function descargar(nombre,texto,tipo){var b=new Blob([texto],{type:tipo||"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=nombre;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
  window.Almacen={leer:leer,guardar:guardar,id:id,h:h,eur:eur,descargar:descargar};
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("sw.js").catch(function(){});
})();
