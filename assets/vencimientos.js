(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("vencimientos",null),f=$("f"),edit=null;
if(!lista)lista=[{id:A.id(),nombre:"ITV del taxi"},{id:A.id(),nombre:"Revisión del taxímetro"},{id:A.id(),nombre:"Revisión municipal"},{id:A.id(),nombre:"Seguro"}];
var TXT={ok:"Al día",pronto:"Pronto",vencido:"Vencido",sin:"Sin fecha"};
function pintar(){
 var ul=$("lista");ul.textContent="";
 var l=lista.map(function(v){return {v:v,e:C.estadoVencimiento(v)}}).sort(function(a,b){return (a.e.dias==null?1e9:a.e.dias)-(b.e.dias==null?1e9:b.e.dias)});
 l.forEach(function(x){
  var li=h("li","",null,ul),iz=h("div","",null,li);
  h("span","t",x.v.nombre,iz);
  h("small","",x.e.fecha?"Vence el "+x.e.fecha+(x.e.dias<0?" · hace "+(-x.e.dias)+" días":" · en "+x.e.dias+" días"):"Pon una fecha para que te avise",h("div","",null,iz));
  var dr=h("div","",null,li);h("span","estado "+x.e.estado,TXT[x.e.estado],dr);dr.appendChild(document.createTextNode(" "));
  var e=h("button","mini sec","Editar",dr);e.type="button";e.addEventListener("click",function(){editar(x.v)});
  var b=h("button","mini peligro","Borrar",dr);b.type="button";b.addEventListener("click",function(){if(confirm("¿Borrar «"+x.v.nombre+"»?")){lista=lista.filter(function(q){return q.id!==x.v.id});guardar()}});
 });
 var nv=l.filter(function(x){return x.e.estado==="vencido"||x.e.estado==="pronto"}).length;
 document.title=(nv?"("+nv+") ":"")+"Vencimientos · Taxi-IA";
}
function guardar(){A.guardar("vencimientos",lista);pintar()}
function editar(v){edit=v.id;$("ftit").textContent="Editar «"+v.nombre+"»";["nombre","fecha","ultima","cadaMeses","aviso"].forEach(function(k){f[k].value=v[k]==null?"":v[k]});$("cancel").hidden=false;f.scrollIntoView()}
function limpiar(){edit=null;f.reset();$("ftit").textContent="Añadir vencimiento";$("cancel").hidden=true}
$("cancel").addEventListener("click",limpiar);
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f),o={nombre:d.get("nombre"),fecha:d.get("fecha")||"",ultima:d.get("ultima")||"",cadaMeses:d.get("cadaMeses")||"",aviso:d.get("aviso")||""};
 if(edit){lista=lista.map(function(v){return v.id===edit?Object.assign({id:edit},o):v})}else{o.id=A.id();lista.push(o)}
 limpiar();guardar();
});
pintar();
})();
