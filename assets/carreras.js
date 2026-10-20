(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("carreras",[]),prov=A.leer("justificante",{});
var f=$("f");f.fecha.value=C.hoy();
["nombre","nif","lic","mat"].forEach(function(k){var e=$("j-"+k);e.value=prov[k]||"";e.addEventListener("input",function(){prov[k]=e.value;A.guardar("justificante",prov)})});
var ML={efectivo:"Efectivo",tarjeta:"Tarjeta",app:"App",otro:"Otro"};
function periodo(){
 var v=$("per").value,hoy=C.hoy();
 if(v==="hoy")return C.enPeriodo(lista,hoy,hoy);
 if(v==="semana")return C.enPeriodo(lista,C.inicioSemana(hoy),hoy);
 if(v==="mes")return C.enPeriodo(lista,C.inicioMes(hoy),hoy);
 return lista.slice();
}
function kpis(){
 var k=$("kpis");k.textContent="";var hoy=C.hoy();
 [["Hoy",C.enPeriodo(lista,hoy,hoy)],["Esta semana",C.enPeriodo(lista,C.inicioSemana(hoy),hoy)],["Este mes",C.enPeriodo(lista,C.inicioMes(hoy),hoy)]].forEach(function(p){
  var r=C.resumen(p[1]),d=h("div","kpi",null,k);h("small","",p[0]+" · "+r.n+" carreras",d);h("strong","",A.eur(r.total),d);
  if(r.medio!=null)h("small","","Media "+A.eur(r.medio)+(r.porKm!=null?" · "+A.eur(r.porKm)+"/km":""),d);
 });
}
function pintar(){
 kpis();var ul=$("lista");ul.textContent="";
 var l=periodo().sort(function(a,b){return (b.fecha+(b.hora||""))<(a.fecha+(a.hora||""))?-1:1});
 if(!l.length)h("li","item vacio","Todavía no hay carreras en este periodo.",ul);
 l.slice(0,200).forEach(function(c){
  var li=h("li","item",null,ul),iz=h("div","",null,li);
  h("span","t",A.eur(C.num(c.importe))+" · "+(ML[c.metodo]||"Otro"),iz);
  h("small","",c.fecha+(c.hora?" "+c.hora:"")+(c.km?" · "+c.km+" km":"")+(c.origen||c.destino?" · "+(c.origen||"?")+" → "+(c.destino||"?"):"")+(c.nota?" · "+c.nota:""),h("div","",null,iz));
  var dr=h("div","acciones",null,li);
  var j=h("button","boton-sec mini","Justificante",dr);j.type="button";j.addEventListener("click",function(){justificante(c)});
  var x=h("button","boton-peligro mini","Borrar",dr);x.type="button";x.addEventListener("click",function(){if(confirm("¿Borrar esta carrera?")){lista=lista.filter(function(q){return q.id!==c.id});A.guardar("carreras",lista);pintar()}});
 });
}
function justificante(c){
 var j=$("just");j.textContent="";
 h("h1","","Justificante de carrera de taxi",j);
 var t=h("table","",null,j);
 [["Fecha",c.fecha+(c.hora?" "+c.hora:"")],["Origen",c.origen],["Destino",c.destino],["Kilómetros",c.km],["Importe",A.eur(C.num(c.importe))],["Forma de pago",ML[c.metodo]||"Otro"],["Titular / razón social",prov.nombre],["NIF",prov.nif],["Nº de licencia",prov.lic],["Matrícula",prov.mat]].forEach(function(r){
  if(!r[1]&&r[1]!==0)return;var tr=h("tr","",null,t);h("td","",r[0],tr);h("td","",String(r[1]),tr).style.fontWeight="600";
 });
 h("p","","Documento informativo de la carrera. No sustituye a la factura ni al recibo oficial.",j).style.marginTop="16px";
 window.print();
}
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f),imp=C.num(d.get("importe"));
 if(!(imp>0)){$("msg").textContent="Pon un importe mayor que 0.";return}
 lista.push({id:A.id(),fecha:d.get("fecha"),hora:d.get("hora")||"",importe:imp,metodo:d.get("metodo"),km:d.get("km")?C.num(d.get("km")):"",origen:d.get("origen")||"",destino:d.get("destino")||"",nota:d.get("nota")||""});
 if(!A.guardar("carreras",lista)){lista.pop();$("msg").textContent="No se pudo guardar en este navegador.";return}
 f.importe.value="";f.km.value="";f.origen.value="";f.destino.value="";f.nota.value="";$("msg").textContent="Guardada.";setTimeout(function(){$("msg").textContent=""},2500);pintar();
});
$("per").addEventListener("change",pintar);
$("csv").addEventListener("click",function(){A.descargar("carreras-"+C.hoy()+".csv",C.csv(periodo()),"text/csv;charset=utf-8")});
pintar();
})();
