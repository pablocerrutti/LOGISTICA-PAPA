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
  }
  return sh;
}

function parseGeometry_(value){
  if(value===null||value===undefined||value==='')return [];
  if(Array.isArray(value))return value;
  let v=value;
  for(let i=0;i<3&&typeof v==='string';i++){
    v=v.trim();
    if(!v) return [];
    try{v=JSON.parse(v);}catch(_){return [];}
  }
  return Array.isArray(v)?v:[];
}

function normalizePaths_(obj){
  let paths=[];
  if(obj&&Array.isArray(obj.paths)) paths=obj.paths;
  if(!paths.length&&obj&&Array.isArray(obj.points)) paths=[obj.points];
  if(!paths.length&&obj){
    const parsed=parseGeometry_(obj.points);
    if(parsed.length&&Array.isArray(parsed[0])&&Array.isArray(parsed[0][0])) paths=parsed;
    else if(parsed.length) paths=[parsed];
  }
  return paths.filter(function(p){
    return Array.isArray(p)&&p.length>=2;
  });
}

function obtenerLogisticaPapa(e){
  const sh=hojaLogisticaPapa_();
  const last=sh.getLastRow();
  if(last<2)return {ok:true,datos:[],cantidad:0,hoja:LOGISTICA_PAPA_SHEET};

  const rows=sh.getRange(2,1,last-1,7).getValues();
  const datos=[];

  rows.forEach(function(r,i){
    const id=String(r[0]||('fila-'+(i+2))).trim();
    const name=String(r[1]||'').trim();
    const type=String(r[2]||'').trim();
    const paths=normalizePaths_({points:r[3]});
    const visible=String(r[4]===undefined?'SI':r[4]).toUpperCase()!=='NO';

    if(!id||!type||!paths.length)return;

    datos.push({
      id:id,
      name:name,
      type:type,
      points:paths[0],
      paths:paths,
      visible:visible
    });
  });

  return {
    ok:true,
    datos:datos,
    cantidad:datos.length,
    filasHoja:rows.length,
    hoja:LOGISTICA_PAPA_SHEET
  };
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

  const normalizados=[];
  datos.forEach(function(l){
    if(!l)return;
    const paths=normalizePaths_(l);
    if(!l.id||!l.type||!paths.length)return;

    normalizados.push([
      String(l.id),
      String(l.name||''),
      String(l.type||''),
      JSON.stringify(paths[0]),
      l.visible===false?'NO':'SI',
      new Date(),
      String(p.usuario||'LOGISTICA-PAPA').trim()
    ]);
  });

  const sh=hojaLogisticaPapa_();

  // Nunca borrar los datos existentes si la petición llega vacía.
  if(!normalizados.length){
    return {
      ok:false,
      cantidad:0,
      mensaje:'No se guardó: la petición no contiene rutas o zonas válidas. Se conservaron los datos existentes.'
    };
  }

  const last=sh.getLastRow();
  if(last>1)sh.getRange(2,1,last-1,7).clearContent();

  sh.getRange(2,1,normalizados.length,7).setValues(normalizados);
  sh.getRange(2,6,normalizados.length,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  return {
    ok:true,
    cantidad:normalizados.length,
    mensaje:'Mapa guardado correctamente en Google Sheets.',
    hoja:LOGISTICA_PAPA_SHEET
  };
}