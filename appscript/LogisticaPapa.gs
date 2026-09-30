/********************************************************
 LOGISTICA-PAPA
 PERSISTENCIA DE RUTAS Y ZONAS
********************************************************/
const LOGISTICA_PAPA_SHEET='LogisticaPapa';

function bd(){return SpreadsheetApp.openById(CONFIG.SHEET_ID);}
function hojaLogisticaPapa_(){
  const ss=bd();
  let sh=ss.getSheetByName(LOGISTICA_PAPA_SHEET);
  if(!sh){
    sh=ss.insertSheet(LOGISTICA_PAPA_SHEET);
    sh.getRange(1,1,1,7).setValues([[
      'ID','Nombre','Tipo','Puntos','Visible','FechaActualizacion','Usuario'
    ]]);
    sh.setFrozenRows(1);
    sh.getRange('A:G').setVerticalAlignment('middle');
    sh.getRange('A:G').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
  return sh;
}

function obtenerLogisticaPapa(e){
  const sh=hojaLogisticaPapa_();
  const last=sh.getLastRow();
  if(last<2)return {ok:true,datos:[],cantidad:0};
  const rows=sh.getRange(2,1,last-1,7).getValues();
  const datos=rows.map(function(r){
    let puntos=[];
    try{puntos=JSON.parse(String(r[3]||'[]'));}catch(_){}
    return {
      id:String(r[0]||'').trim(),
      name:String(r[1]||'').trim(),
      type:String(r[2]||'').trim(),
      points:Array.isArray(puntos)?puntos:[],
      visible:String(r[4]||'SI').toUpperCase()!=='NO'
    };
  }).filter(function(x){
    return x.id&&x.type&&Array.isArray(x.points)&&x.points.length>=2;
  });
  return {ok:true,datos:datos,cantidad:datos.length};
}

function guardarLogisticaPapa(e){
  const p=(e&&e.parameter)||{};
  const raw=String(p.datos||'').trim();
  if(!raw)return {ok:false,mensaje:'No se recibieron datos del mapa.'};

  let datos;
  try{datos=JSON.parse(raw);}catch(_){
    return {ok:false,mensaje:'Los datos del mapa no tienen formato JSON válido.'};
  }
  if(!Array.isArray(datos))datos=Array.isArray(datos.layers)?datos.layers:[];

  const sh=hojaLogisticaPapa_();
  const usuario=String(p.usuario||'LOGISTICA-PAPA').trim();
  const ahora=new Date();

  if(sh.getLastRow()>1){
    sh.getRange(2,1,sh.getLastRow()-1,7).clearContent();
  }

  const filas=datos.filter(function(l){
    return l&&l.id&&l.type&&Array.isArray(l.points)&&l.points.length>=2;
  }).map(function(l){
    return [
      String(l.id),
      String(l.name||''),
      String(l.type||''),
      JSON.stringify(l.points),
      l.visible===false?'NO':'SI',
      ahora,
      usuario
    ];
  });

  if(filas.length){
    sh.getRange(2,1,filas.length,7).setValues(filas);
    sh.getRange(2,6,filas.length,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  return {ok:true,cantidad:filas.length,mensaje:'Mapa guardado correctamente.'};
}
