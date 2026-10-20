(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)},v=function(i){return $(i).value};
var TK=["bajada","km","min","sup","minimo"],tar=A.leer("tarifa",{});
TK.forEach(function(k){if(tar[k]!=null)$("t-"+k).value=tar[k]});
function out(id,filas){var r=$(id);r.textContent="";var dl=h("dl","cifras",null,r);filas.forEach(function(x){h("dt","",x[0],dl);h("dd","",x[1],dl)})}
function on(id,fn){$("f-"+id).addEventListener("submit",function(e){e.preventDefault();fn()})}
on("tarifa",function(){
 TK.forEach(function(k){tar[k]=v("t-"+k)});A.guardar("tarifa",tar);
 var t={bajada:v("t-bajada"),porKm:v("t-km"),porMinuto:v("t-min"),suplemento:v("t-sup"),minimo:v("t-minimo")};
 out("r-tarifa",[["Importe de la carrera",A.eur(C.importeCarrera(t,v("t-dkm"),v("t-dmin")))]]);
});
on("turno",function(){
 var r=C.beneficioTurno({recaudacion:v("b-rec"),combustible:v("b-comb"),peajes:v("b-peaje"),alquiler:v("b-alq"),otros:v("b-otros"),km:v("b-km"),horas:v("b-h")});
 out("r-turno",[["Gastos",A.eur(r.gastos)],["Beneficio del turno",A.eur(r.neto)],["Por hora",A.eur(r.porHora)],["Por km",A.eur(r.porKm)],["Ingreso por km",A.eur(r.ingresoPorKm)]]);
});
on("reparto",function(){
 var r=C.reparto({recaudacion:v("r-rec"),gastos:v("r-gas"),porcentaje:v("r-pct"),base:v("r-base")});
 out("r-reparto",[["Base del reparto",A.eur(r.base)],["Para el asalariado",A.eur(r.asalariado)],["Para el titular, tras gastos",A.eur(r.titular)]]);
});
on("objetivo",function(){
 var r=C.objetivo({objetivoMes:v("o-obj"),dias:v("o-dias"),importeMedio:v("o-medio")});
 out("r-objetivo",[["Por día",A.eur(r.porDia)],["Carreras al día",r.carrerasDia==null?"—":String(r.carrerasDia)]]);
});
on("coste",function(){out("r-coste",[["Coste por km",A.eur(C.costeKm({gastos:v("k-gas"),km:v("k-km")}))]])});
if(location.hash&&$(location.hash.slice(1)))$(location.hash.slice(1)).scrollIntoView();
})();
