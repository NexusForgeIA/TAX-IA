(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("turnos",[]),f=$("f");f.fecha.value=C.hoy();
var pref=A.leer("turnos.pref",{});if(pref.pct!=null)f.pct.value=pref.pct;if(pref.base)f.base.value=pref.base;
function pintar(){
 var hoy=C.hoy(),k=$("kpis");k.textContent="";
 var mes=lista.filter(function(t){return t.fecha>=C.inicioMes(hoy)&&t.fecha<=hoy});
 var rec=0,neto=0,asal=0;mes.forEach(function(t){rec+=C.num(t.recaudacion);neto+=C.num(t.recaudacion)-C.num(t.gastos);asal+=C.num(t.asalariado)});
 [["Turnos este mes",String(mes.length)],["Recaudación",A.eur(C.r2(rec))],["Para asalariados",A.eur(C.r2(asal))],["Para el titular",A.eur(C.r2(neto-asal))]].forEach(function(p){var d=h("div","kpi",null,k);h("small","",p[0],d);h("strong","",p[1],d)});
 var ul=$("lista");ul.textContent="";
 if(!lista.length)h("li","item vacio","Todavía no has cerrado ningún turno.",ul);
 lista.slice().sort(function(a,b){return a.fecha<b.fecha?1:-1}).slice(0,100).forEach(function(t){
  var li=h("li","item",null,ul),iz=h("div","",null,li);
  h("span","t",t.fecha+(t.conductor?" · "+t.conductor:"")+" · "+A.eur(C.num(t.recaudacion)),iz);
  h("small","","Gastos "+A.eur(C.num(t.gastos))+" · asalariado "+A.eur(C.num(t.asalariado))+" · titular "+A.eur(C.num(t.titular))+(t.km?" · "+t.km+" km":"")+(t.horas?" · "+t.horas+" h":""),iz);
  var dr=h("div","acciones",null,li),x=h("button","boton-peligro mini","Borrar",dr);x.type="button";
  x.addEventListener("click",function(){if(confirm("¿Borrar este cierre?")){lista=lista.filter(function(q){return q.id!==t.id});A.guardar("turnos",lista);pintar()}});
 });
}
$("traer").addEventListener("click",function(){
 var r=C.resumen(C.enPeriodo(A.leer("carreras",[]),f.fecha.value,f.fecha.value));
 if(!r.n){$("msg").textContent="No hay carreras anotadas ese día.";return}
 f.recaudacion.value=String(r.total).replace(".",",");if(r.km)f.km.value=String(r.km).replace(".",",");$("msg").textContent="Traídas "+r.n+" carreras.";
});
f.addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(f),rec=C.num(d.get("recaudacion"));
 if(!(rec>0)){$("msg").textContent="Pon la recaudación.";return}
 var rp=C.reparto({recaudacion:rec,gastos:d.get("gastos"),porcentaje:d.get("pct"),base:d.get("base")});
 lista.push({id:A.id(),fecha:d.get("fecha"),conductor:d.get("conductor")||"",recaudacion:rec,gastos:C.num(d.get("gastos")),km:d.get("km")||"",horas:d.get("horas")||"",pct:C.num(d.get("pct")),base:d.get("base"),asalariado:rp.asalariado,titular:rp.titular});
 A.guardar("turnos.pref",{pct:d.get("pct"),base:d.get("base")});
 if(!A.guardar("turnos",lista)){lista.pop();$("msg").textContent="No se pudo guardar en este navegador.";return}
 f.recaudacion.value="";f.gastos.value="";f.km.value="";f.horas.value="";$("msg").textContent="Cierre guardado.";setTimeout(function(){$("msg").textContent=""},2500);pintar();
});
$("csv").addEventListener("click",function(){
 var cab=["fecha","conductor","recaudacion","gastos","km","horas","pct","asalariado","titular"],c=function(v){var t=String(v==null?"":v);return /[;"\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
 var txt="﻿"+cab.join(";")+"\n"+lista.slice().sort(function(a,b){return a.fecha<b.fecha?-1:1}).map(function(t){return cab.map(function(k){return c(typeof t[k]==="number"?String(t[k]).replace(".",","):t[k])}).join(";")}).join("\n");
 A.descargar("turnos-"+C.hoy()+".csv",txt,"text/csv;charset=utf-8");
});
pintar();
})();
