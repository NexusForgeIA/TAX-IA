(function(){
"use strict";
var A=Almacen,C=Calculos,h=A.h,$=function(i){return document.getElementById(i)};
var lista=A.leer("carreras",[]),DIAS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
function tabla(dest,filas,etq){
 var d=$(dest);d.textContent="";
 if(!lista.length){h("p","nota","Aún no hay carreras anotadas.",d);return}
 var t=h("table","tabla-calculo",null,d),th=h("thead","",null,t).appendChild(document.createElement("tr"));
 [etq,"Carreras","Total","Media"].forEach(function(x){h("th","",x,th).scope="col"});
 var max=0;filas.forEach(function(f){if(f[2].total>max)max=f[2].total});
 var tb=h("tbody","",null,t);
 filas.forEach(function(f){var tr=h("tr","",null,tb);h("th","",f[0],tr).scope="row";h("td","",String(f[2].n),tr);var td=h("td","",A.eur(f[2].total),tr);if(max>0&&f[2].total===max){td.style.color="var(--accent)";td.style.fontWeight="800"}h("td","",A.eur(f[2].medio),tr)});
}
tabla("dias",C.porDiaSemana(lista).map(function(x,i){return [DIAS[i],i,x]}),"Día");
var fr=C.porFranja(lista);
tabla("franjas",fr.franjas.map(function(x,i){return [C.franjas[i],i,x]}),"Franja");
$("sinhora").textContent=fr.sinHora?fr.sinHora+" carreras no tienen hora y no entran en las franjas.":"";
})();
