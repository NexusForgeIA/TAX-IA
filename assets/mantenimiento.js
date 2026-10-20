(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("mantenimiento",null),km=A.leer("kmActual",""),f=$("f"),edit=null;
if(!lista)lista=[{id:A.id(),nombre:"Aceite y filtro"},{id:A.id(),nombre:"Frenos"},{id:A.id(),nombre:"Neumáticos"}];
$("kmact").value=km;
var TXT={ok:"Al día",pronto:"Pronto",vencido:"Toca ya",sin:"Faltan datos"},CL={ok:"ok",pronto:"duda",vencido:"vencido",sin:""};
function fmt(n){return new Intl.NumberFormat("es-ES").format(n)}
function pintar(){
 var ul=$("lista");ul.textContent="";
 lista.map(function(m){return {m:m,e:C.estadoMantenimiento(m,km)}}).sort(function(a,b){return (a.e.quedan==null?1e12:a.e.quedan)-(b.e.quedan==null?1e12:b.e.quedan)}).forEach(function(x){
  var li=h("li","item",null,ul),iz=h("div","",null,li);
  h("span","t",x.m.nombre,iz);
  h("small","",x.e.quedan==null?"Pon los km actuales, cada cuántos km y en cuáles se hizo.":(x.e.quedan<0?"Te pasaste "+fmt(-x.e.quedan)+" km":"Quedan "+fmt(x.e.quedan)+" km")+" · cada "+fmt(C.num(x.m.cadaKm))+" km · hecho en "+fmt(C.num(x.m.ultimoKm)),iz);
  h("span","chip "+CL[x.e.estado],TXT[x.e.estado],li);
  var dr=h("div","acciones",null,li);
  var hecho=h("button","boton-sec mini","Hecho ahora",dr);hecho.type="button";hecho.addEventListener("click",function(){if(km===""){$("msgkm").textContent="Primero guarda los km actuales.";return}x.m.ultimoKm=String(km);guardar()});
  var e=h("button","boton-sec mini","Editar",dr);e.type="button";e.addEventListener("click",function(){editar(x.m)});
  var b=h("button","boton-peligro mini","Borrar",dr);b.type="button";b.addEventListener("click",function(){if(confirm("¿Borrar «"+x.m.nombre+"»?")){lista=lista.filter(function(q){return q.id!==x.m.id});guardar()}});
 });
}
function guardar(){A.guardar("mantenimiento",lista);pintar()}
function editar(m){edit=m.id;$("ftit").textContent="Editar «"+m.nombre+"»";["nombre","cadaKm","ultimoKm","avisoKm"].forEach(function(k){f[k].value=m[k]==null?"":m[k]});$("cancel").hidden=false;f.scrollIntoView()}
function limpiar(){edit=null;f.reset();$("ftit").textContent="Añadir mantenimiento";$("cancel").hidden=true}
$("cancel").addEventListener("click",limpiar);
$("fkm").addEventListener("submit",function(e){e.preventDefault();var n=C.num($("kmact").value);if(!(n>=0)||$("kmact").value===""){$("msgkm").textContent="Pon los km.";return}km=n;A.guardar("kmActual",km);$("msgkm").textContent="Guardado.";pintar()});
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f),o={nombre:d.get("nombre"),cadaKm:C.num(d.get("cadaKm")),ultimoKm:C.num(d.get("ultimoKm")),avisoKm:d.get("avisoKm")||""};
 if(edit){lista=lista.map(function(m){return m.id===edit?Object.assign({id:edit},o):m})}else{o.id=A.id();lista.push(o)}
 limpiar();guardar();
});
pintar();
})();
