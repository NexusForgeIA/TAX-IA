(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("gastos",[]),f=$("f");f.fecha.value=C.hoy();
var CAT={combustible:"Combustible",taller:"Taller y reparaciones",neumaticos:"Neumáticos",seguro:"Seguro",peajes:"Peajes",aparcamiento:"Aparcamiento",licencia:"Licencia, cuotas o alquiler",lavado:"Lavado",otros:"Otros"};
function periodo(){
 var v=$("per").value,hoy=C.hoy();
 if(v==="mes")return C.enPeriodo(lista,C.inicioMes(hoy),hoy);
 if(v==="anio")return C.enPeriodo(lista,hoy.slice(0,4)+"-01-01",hoy);
 return lista.slice();
}
function pintar(){
 var hoy=C.hoy(),k=$("kpis");k.textContent="";
 [["Este mes",C.enPeriodo(lista,C.inicioMes(hoy),hoy)],["Este año",C.enPeriodo(lista,hoy.slice(0,4)+"-01-01",hoy)]].forEach(function(p){var r=C.resumenGastos(p[1]),d=h("div","kpi",null,k);h("small","",p[0]+" · "+r.n+" gastos",d);h("strong","",A.eur(r.total),d)});
 var l=periodo(),r=C.resumenGastos(l),dl=$("desglose");dl.textContent="";
 Object.keys(r.porCategoria).sort(function(a,b){return r.porCategoria[b]-r.porCategoria[a]}).forEach(function(c){h("dt","",CAT[c]||c,dl);h("dd","",A.eur(r.porCategoria[c]),dl)});
 var ul=$("lista");ul.textContent="";
 if(!l.length)h("li","item vacio","Todavía no hay gastos en este periodo.",ul);
 l.sort(function(a,b){return a.fecha<b.fecha?1:-1}).slice(0,200).forEach(function(g){
  var li=h("li","item",null,ul),iz=h("div","",null,li);
  h("span","t",A.eur(C.num(g.importe))+" · "+(CAT[g.categoria]||g.categoria),iz);h("small","",g.fecha+(g.nota?" · "+g.nota:""),iz);
  var dr=h("div","acciones",null,li),x=h("button","boton-peligro mini","Borrar",dr);x.type="button";
  x.addEventListener("click",function(){if(confirm("¿Borrar este gasto?")){lista=lista.filter(function(q){return q.id!==g.id});A.guardar("gastos",lista);pintar()}});
 });
}
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f),imp=C.num(d.get("importe"));
 if(!(imp>0)){$("msg").textContent="Pon un importe mayor que 0.";return}
 lista.push({id:A.id(),fecha:d.get("fecha"),categoria:d.get("categoria"),importe:imp,nota:d.get("nota")||""});
 if(!A.guardar("gastos",lista)){lista.pop();$("msg").textContent="No se pudo guardar en este navegador.";return}
 f.importe.value="";f.nota.value="";$("msg").textContent="Guardado.";setTimeout(function(){$("msg").textContent=""},2500);pintar();
});
$("per").addEventListener("change",pintar);
$("csv").addEventListener("click",function(){A.descargar("gastos-"+C.hoy()+".csv",C.csvGastos(periodo()),"text/csv;charset=utf-8")});
pintar();
})();
