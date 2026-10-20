(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)},v=function(i){return $(i).value};
/* La tarifa se recuerda solo en este navegador para no reescribirla. */
var TK=["bajada","km","min","sup","minimo"],tar=A.leer("tarifa",{});
TK.forEach(function(k){if(tar[k]!=null)$("t-"+k).value=tar[k]});
function out(id,filas){var r=$(id);r.textContent="";filas.forEach(function(x){var p=h("p","",null,r);p.style.margin="4px 0";p.appendChild(document.createTextNode(x[0]+": "));h("b","",x[1],p)})}
$("t-go").addEventListener("click",function(){
 TK.forEach(function(k){tar[k]=v("t-"+k)});A.guardar("tarifa",tar);
 var t={bajada:v("t-bajada"),porKm:v("t-km"),porMinuto:v("t-min"),suplemento:v("t-sup"),minimo:v("t-minimo")};
 out("t-res",[["Importe de la carrera",A.eur(C.importeCarrera(t,v("t-dkm"),v("t-dmin")))]]);
});
$("b-go").addEventListener("click",function(){
 var r=C.beneficioTurno({recaudacion:v("b-rec"),combustible:v("b-comb"),peajes:v("b-peaje"),alquiler:v("b-alq"),otros:v("b-otros"),km:v("b-km"),horas:v("b-h")});
 out("b-res",[["Gastos",A.eur(r.gastos)],["Beneficio del turno",A.eur(r.neto)],["Por hora",A.eur(r.porHora)],["Por km",A.eur(r.porKm)],["Ingreso por km",A.eur(r.ingresoPorKm)]]);
});
$("r-go").addEventListener("click",function(){
 var r=C.reparto({recaudacion:v("r-rec"),gastos:v("r-gas"),porcentaje:v("r-pct"),base:v("r-base")});
 out("r-res",[["Base del reparto",A.eur(r.base)],["Para el asalariado",A.eur(r.asalariado)],["Para el titular, tras gastos",A.eur(r.titular)]]);
});
$("o-go").addEventListener("click",function(){
 var r=C.objetivo({objetivoMes:v("o-obj"),dias:v("o-dias"),importeMedio:v("o-medio")});
 out("o-res",[["Por día",A.eur(r.porDia)],["Carreras al día",r.carrerasDia==null?"—":String(r.carrerasDia)]]);
});
$("k-go").addEventListener("click",function(){out("k-res",[["Coste por km",A.eur(C.costeKm({gastos:v("k-gas"),km:v("k-km")}))]])});
if(location.hash&&$(location.hash.slice(1)))$(location.hash.slice(1)).scrollIntoView();
})();
