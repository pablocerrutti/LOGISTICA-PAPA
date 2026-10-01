/********************************************************
 LOGISTICA-PAPA
 API PRINCIPAL
********************************************************/
function doGet(e){
  e=e||{parameter:{}}; e.parameter=e.parameter||{};
  const accion=String(e.parameter.accion||'').trim();
  try{
    switch(accion){
      case 'obtenerLogisticaPapa': return json(obtenerLogisticaPapa(e));
      case 'guardarLogisticaPapa': return json(guardarLogisticaPapa(e));
      case 'ping': return json({ok:true,mensaje:'API LOGISTICA-PAPA funcionando correctamente.',fecha:new Date().toISOString()});
      case 'diagnosticoLogisticaPapa': return json(diagnosticoLogisticaPapa());
      case 'aplicarInformacionesLogisticaPapa': return json(aplicarInformacionesLogisticaPapa());
      default: return json({ok:false,mensaje:'Acción inválida: '+accion});
    }
  }catch(error){
    return json({ok:false,mensaje:error&&error.message?error.message:'Error interno del servidor.'});
  }
}
function doPost(e){
  e=e||{};
  e.parameter=e.parameter||{};

  // Algunos navegadores/proxies pueden entregar el cuerpo POST
  // en postData aunque e.parameter no quede poblado.
  if(e.postData&&e.postData.contents){
    try{
      const body=JSON.parse(e.postData.contents);
      if(body&&typeof body==='object'){
        Object.keys(body).forEach(function(k){
          if(e.parameter[k]===undefined)e.parameter[k]=body[k];
        });
      }
    }catch(_){
      // Si no es JSON, se utiliza e.parameter normalmente.
    }
  }

  return doGet(e);
}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
