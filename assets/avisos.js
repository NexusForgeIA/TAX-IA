(function(){
"use strict";
var A=Almacen,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("avisos",[]),f=$("f");
function seguro(u){try{var x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"?x.href:null}catch(e){return null}}
function pintar(){
 var ul=$("lista");ul.textContent="";
 if(!lista.length)h("li","item vacio","Aún no has apuntado ningún aviso.",ul);
 lista.slice().sort(function(a,b){return (b.fecha||"")<(a.fecha||"")?-1:1}).forEach(function(a){
  var li=h("li","item",null,ul),iz=h("div","",null,li);
  h("span","t",a.titulo,iz);
  h("small","",(a.fecha?a.fecha+" · ":"")+(a.texto||""),h("div","",null,iz));
  var dr=h("div","acciones",null,li),u=a.url&&seguro(a.url);
  if(u){var l=h("a","boton-sec mini","Abrir enlace",dr);l.href=u;l.target="_blank";l.rel="noopener noreferrer"}
  var b=h("button","boton-peligro mini","Borrar",dr);b.type="button";b.addEventListener("click",function(){lista=lista.filter(function(q){return q.id!==a.id});A.guardar("avisos",lista);pintar()});
 });
}
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f);
 lista.push({id:A.id(),titulo:d.get("titulo"),fecha:d.get("fecha")||"",url:d.get("url")||"",texto:d.get("texto")||""});
 A.guardar("avisos",lista);f.reset();pintar();
});
pintar();
})();
