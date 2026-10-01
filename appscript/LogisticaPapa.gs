/********************************************************
 LOGISTICA-PAPA
 PERSISTENCIA DE RUTAS Y ZONAS
********************************************************/
const LOGISTICA_PAPA_SHEET='LogisticaPapa';

function bd(){
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function hojaLogisticaPapa_(){
  const ss=bd();
  let sh=ss.getSheetByName(LOGISTICA_PAPA_SHEET);
  if(!sh){
    sh=ss.insertSheet(LOGISTICA_PAPA_SHEET);
    sh.getRange(1,1,1,8).setValues([[
      'ID','Nombre','Tipo','Puntos','Visible','FechaActualizacion','Usuario','Informacion'
    ]]);
    sh.setFrozenRows(1);
  }
  if(sh.getLastColumn()<8)sh.getRange(1,8).setValue('Informacion');
  return sh;
}

function aplicarInformacionesLogisticaPapa(){
  const sh=hojaLogisticaPapa_();
  const info={
    'route_excursiones':'Uso exclusivo: ingreso y egreso de ómnibus y micros de excursiones.',
    'zone_excursiones':'Solo ómnibus y micros de excursiones. Prohibido estacionar automóviles.',
    'route_interdepartamental':'Uso exclusivo: ingreso y egreso de ómnibus interdepartamentales de línea.',
    'route_pontifice':'Uso exclusivo: ingreso y salida del Sumo Pontífice. Mantener totalmente despejada.',
    'route_intendente':'Uso exclusivo: ingreso y salida del Intendente Departamental. Mantener despejada.',
    'zone_exclusion':'Solo peatones. Prohibido el ingreso, estacionamiento o detención de vehículos.',
    'zone_descenso':'Solo descenso de pasajeros. No estacionar ni permanecer detenido.',
    'zone_estacionamiento':'Solo automóviles. Prohibido estacionar ómnibus, micros, camiones u otros vehículos.',
    'zone_discapacidad':'Exclusivo para vehículos de personas con discapacidad debidamente identificados.',
    'zone_prensa_nacional':'Solo prensa Nacional/Local acreditada.',
    'zone_prensa_vaticano':'Solo prensa del Vaticano acreditada.',
    'zone_terminal_temporal':'Solo ómnibus interdepartamentales de línea. Ascenso, descenso y maniobras.',
    'zone_estacionamiento_automoviles':'Solo automóviles. Prohibido estacionar ómnibus, micros, camiones u otros vehículos.'
  };
  const last=sh.getLastRow();
  if(last<2)return {ok:true,cantidad:0,mensaje:'No hay capas para actualizar.'};
  const rows=sh.getRange(2,1,last-1,8).getValues();
  let actualizadas=0;
  rows.forEach(function(r){
    const id=String(r[0]||'').trim();
    const tipo=String(r[2]||'').trim();
    const nombre=String(r[1]||'').trim().toLowerCase();

    let clave=info[id]?id:(info[tipo]?tipo:'');

    if(
      tipo==='zone_estacionamiento' &&
      (
        nombre.includes('exclusivo para automóviles') ||
        nombre.includes('exclusivo para automoviles')
      )
    ){
      clave='zone_estacionamiento_automoviles';
    }

    if(clave){
      r[7]=info[clave];
      actualizadas++;
    }
  });
  sh.getRange(2,1,last-1,8).setValues(rows);
  return {ok:true,cantidad:actualizadas,mensaje:'Descripciones cortas aplicadas a las capas existentes.',hoja:LOGISTICA_PAPA_SHEET};
}
/*
 * Acepta:
 *  - array de puntos
 *  - objeto {paths:[...]}
 *  - JSON serializado una o varias veces
 */
function parseJsonValue_(value){
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string')return value;

  let v=value;
  for(let i=0;i<4&&typeof v==='string';i++){
    v=v.trim();
    if(!v)return null;
    try{v=JSON.parse(v);}
    catch(_){return null;}
  }
  return v;
}

function normalizePaths_(obj){
  let paths=[];

  if(obj&&Array.isArray(obj.paths)){
    paths=obj.paths;
  }

  if(!paths.length&&obj&&Array.isArray(obj.points)){
    paths=[obj.points];
  }

  if(!paths.length&&obj){
    const parsed=parseJsonValue_(obj.points);

    if(parsed&&Array.isArray(parsed.paths)){
      paths=parsed.paths;
    }else if(
      Array.isArray(parsed)&&
      parsed.length&&
      Array.isArray(parsed[0])&&
      Array.isArray(parsed[0][0])
    ){
      paths=parsed;
    }else if(Array.isArray(parsed)&&parsed.length){
      paths=[parsed];
    }
  }

  return paths.filter(function(p){
    return Array.isArray(p)&&p.length>=2&&p.every(function(x){
      return x&&isFinite(Number(x.lat))&&isFinite(Number(x.lng));
    });
  }).map(function(p){
    return p.map(function(x){
      return {
        lat:Number(x.lat),
        lng:Number(x.lng)
      };
    });
  });
}

function obtenerLogisticaPapa(e){
  const sh=hojaLogisticaPapa_();
  const last=sh.getLastRow();

  if(last<2){
    return {
      ok:true,
      datos:[],
      cantidad:0,
      filasHoja:0,
      hoja:LOGISTICA_PAPA_SHEET
    };
  }

  const rows=sh.getRange(2,1,last-1,8).getValues();
  const datos=[];

  rows.forEach(function(r,i){
    const id=String(r[0]||('fila-'+(i+2))).trim();
    const name=String(r[1]||'').trim();
    const type=String(r[2]||'').trim();
    const paths=normalizePaths_({points:r[3]});
    const visible=String(r[4]===undefined?'SI':r[4]).toUpperCase()!=='NO';
    const informacion=String(r[7]||'').trim();

    if(!id||!type||!paths.length)return;

    datos.push({
      id:id,
      name:name,
      type:type,
      points:paths[0],
      paths:paths,
      visible:visible,
      informacion:informacion
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

  if(!raw){
    return {
      ok:false,
      mensaje:'No se recibieron datos del mapa. No se modificó Google Sheets.'
    };
  }

  let datos;
  try{
    datos=JSON.parse(raw);
  }catch(_){
    return {
      ok:false,
      mensaje:'Los datos del mapa no tienen formato JSON válido. No se modificó Google Sheets.'
    };
  }

  if(!Array.isArray(datos)){
    datos=Array.isArray(datos.layers)?datos.layers:[];
  }

  const normalizados=[];

  datos.forEach(function(l){
    if(!l)return;

    const paths=normalizePaths_(l);
    if(!l.id||!l.type||!paths.length)return;

    normalizados.push([
      String(l.id),
      String(l.name||''),
      String(l.type||''),
      JSON.stringify({paths:paths}),
      l.visible===false?'NO':'SI',
      new Date(),
      String(p.usuario||'LOGISTICA-PAPA').trim(),
      String(l.informacion||'').trim()
    ]);
  });

  const sh=hojaLogisticaPapa_();

  /*
   * Un mapa vacío nunca reemplaza al mapa existente.
   * Para borrar una capa se envía un snapshot que contiene las demás capas.
   */
  if(!normalizados.length){
    return {
      ok:false,
      cantidad:0,
      mensaje:'No se guardó: la petición no contiene rutas o zonas válidas. Se conservaron los datos existentes.'
    };
  }

  const last=sh.getLastRow();
  if(last>1){
    sh.getRange(2,1,last-1,8).clearContent();
  }

  sh.getRange(2,1,normalizados.length,8).setValues(normalizados);
  sh.getRange(2,6,normalizados.length,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  return {
    ok:true,
    cantidad:normalizados.length,
    filasHoja:normalizados.length,
    mensaje:'Mapa guardado correctamente en Google Sheets.',
    hoja:LOGISTICA_PAPA_SHEET
  };
}

function diagnosticoLogisticaPapa(){
  const sh=hojaLogisticaPapa_();
  const last=sh.getLastRow();
  const resultado={
    ok:true,
    hoja:LOGISTICA_PAPA_SHEET,
    sheetId:CONFIG.SHEET_ID,
    filasDatos:Math.max(0,last-1),
    capasValidas:0,
    errores:[],
    muestras:[]
  };

  if(last<2)return resultado;

  const rows=sh.getRange(2,1,last-1,8).getValues();

  rows.forEach(function(r,i){
    const paths=normalizePaths_({points:r[3]});
    if(String(r[0]||'').trim()&&String(r[2]||'').trim()&&paths.length){
      resultado.capasValidas++;
      if(resultado.muestras.length<5){
        resultado.muestras.push({
          fila:i+2,
          id:String(r[0]),
          nombre:String(r[1]),
          tipo:String(r[2]),
          caminos:paths.length,
          puntos:paths.reduce(function(n,p){return n+p.length;},0)
        });
      }
    }else{
      resultado.errores.push({
        fila:i+2,
        id:String(r[0]||''),
        nombre:String(r[1]||''),
        tipo:String(r[2]||''),
        tieneGeometria:paths.length>0
      });
    }
  });

  return resultado;
}
