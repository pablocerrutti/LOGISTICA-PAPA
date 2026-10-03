(()=>{const C={route_pontifice:{name:"Recorrido del Sumo Pontifice en Papamovil",color:"#e00000",kind:"route",weight:8},route_intendente:{name:"Ruta Alternativa",color:"#f28c00",kind:"route",weight:7},route_excursiones:{name:"Ruta de ingreso y egreso de ómnibus / micros de excursiones",color:"#ffd400",kind:"route",weight:7},route_interdepartamental:{name:"Ruta de ingreso y egreso de ómnibus de empresas interdepartamentales de línea",color:"#0066ff",kind:"route",weight:7},zone_exclusion:{name:"Zona de exclusión · solo peatonal",color:"#000",kind:"zone"},zone_estacionamiento:{name:"Estacionamiento permitido · EXCLUSIVO PARA AUTOMÓVILES · NO OTROS VEHÍCULOS",color:"#16a34a",kind:"zone"},zone_excursiones:{name:"Estacionamiento · EXCLUSIVO PARA ÓMNIBUS Y MICROS DE EXCURSIONES · NO AUTOMÓVILES U OTROS VEHÍCULOS",color:"#ffd400",kind:"zone"},zone_descenso:{name:"Zona de descenso de pasajeros únicamente",color:"#22cfe5",kind:"zone"},zone_prensa_vaticano:{name:"Zona exclusiva para Prensa del Vaticano",color:"#6f2da8",kind:"zone"},zone_prensa_nacional:{name:"Zona exclusiva para Prensa Nacional/Local",color:"#d63384",kind:"zone"},zone_discapacidad:{name:"Estacionamiento exclusivo para vehículos de personas con discapacidad",color:"#8b5a2b",kind:"zone"},zone_terminal_temporal:{name:"TERMINAL DE ÓMNIBUS DE LÍNEA INTERDEPARTAMENTAL (TEMPORAL)",color:"#7c3aed",kind:"zone"}};const API_URL="https://script.google.com/macros/s/AKfycbwuH_br7N-DhY6DIqn8v9IfWrXQ4uvswqQh4WKKQd9RnGn2sM5gkeV8HF1_h2KU9njo/exec";const $=id=>document.getElementById(id),design=document.body.dataset.module==="design",role=sessionStorage.getItem("logisticaPapaRole");if((design&&role!=="diseñador")||(!design&&role!=="presentador")){location.href="index.html";return;}document.querySelectorAll(".logoutBtn").forEach(b=>b.onclick=async()=>{if(design){if(drawing){const salir=confirm("Hay un dibujo en curso que todavía no fue finalizado.\n\n¿Deseás salir y descartarlo?");if(!salir)return;drawing=false;pts=[];if(draft)map.removeLayer(draft);draft=null;dirty=false}else if(dirty||editing){const guardar=confirm("Hay cambios sin guardar en el módulo Diseño.\n\nAceptar = guardar cambios y salir.\nCancelar = salir sin guardar.");if(guardar){if(editing){const ok=await finishEdit(editing);if(!ok)return}else{const ok=await save();if(!ok)return;dirty=false}}else{if(editing)clearEditMarkers();dirty=false}}}sessionStorage.removeItem("logisticaPapaRole");location.href="index.html"});const map=L.map("map",{preferCanvas:true}).setView([-34.0958,-56.2142],14);const baseLayer=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"© OpenStreetMap"}).addTo(map);setTimeout(()=>map.invalidateSize(true),100);setTimeout(()=>map.invalidateSize(true),600);window.addEventListener("resize",()=>setTimeout(()=>map.invalidateSize(true),50));window.addEventListener("orientationchange",()=>setTimeout(()=>map.invalidateSize(true),350));if(window.visualViewport)window.visualViewport.addEventListener("resize",()=>setTimeout(()=>map.invalidateSize(true),100));map.createPane("operationalZones");map.getPane("operationalZones").style.zIndex=410;map.createPane("operationalRoutes");map.getPane("operationalRoutes").style.zIndex=650;map.createPane("draftPane");map.getPane("draftPane").style.zIndex=700;map.createPane("selectedOperational");map.getPane("selectedOperational").style.zIndex=800;let layers=[],drawing=false,pts=[],type="route_pontifice",draft=null,selected=null,groups={},editing=null,editMarkers=[],saveQueue=Promise.resolve(),saveSeq=0,cloudReady=false,cloudLoadPromise=null,dirty=false,isolatedVisibility=null;function route(t){return C[t].kind==="route"}function canonicalType(r){const raw=String(r?.type||"").trim();if(C[raw])return raw;const n=String(r?.name||"").toLowerCase();if(n.includes("intendente"))return"route_intendente";if(n.includes("sumo")||n.includes("pontífice")||n.includes("pontifice"))return"route_pontifice";if(n.includes("excurs")&&n.includes("ruta"))return"route_excursiones";if(n.includes("interdepart"))return"route_interdepartamental";if(n.includes("exclus"))return"zone_exclusion";if(n.includes("estacionamiento")&&n.includes("ómnibus"))return"zone_excursiones";if(n.includes("estacionamiento"))return"zone_estacionamiento";if(n.includes("descenso"))return"zone_descenso";if(n.includes("prensa")&&n.includes("vaticano"))return"zone_prensa_vaticano";if(n.includes("prensa")&&(n.includes("nacional")||n.includes("local")))return"zone_prensa_nacional";if(n.includes("discapacidad")||n.includes("discapacitados"))return"zone_discapacidad";if(n.includes("terminal")&&n.includes("interdepart"))return"zone_terminal_temporal";return null}function popupInfo(l){const c=C[l.type]||{};const kind=c.kind==="route"?"Ruta operativa":"Zona operativa";const name=(l.type==="route_intendente"?"Ruta Alternativa":(l.name||c.name||"Elemento operativo"));const detail=l.type==="route_excursiones"?"Uso exclusivo: ingreso y egreso de ómnibus y micros de excursiones. Prohibido detenerse o estacionarse; busque la zona designada para tal fin.":(l.informacion?String(l.informacion):"Sin información adicional registrada para este elemento.");return "<div style=\"min-width:240px\"><div style=\"font-size:14px;font-weight:850;margin-bottom:7px\">"+String(name).replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;"}[m]))+"</div><div style=\"display:inline-block;padding:3px 8px;border-radius:999px;background:"+(c.color||"#173f67")+";color:#fff;font-size:10px;font-weight:800;margin-bottom:8px\">"+kind+"</div><div style=\"font-size:12px;line-height:1.45;color:#43535e\"><strong>Información:</strong><br>"+detail+"</div></div>"}function make(l,op){const c=C[l.type],paths=Array.isArray(l.paths)&&l.paths.length?l.paths:[l.points];const g=L.featureGroup();paths.filter(a=>Array.isArray(a)&&a.length>=2).forEach(a=>{const p=a.map(x=>[x.lat,x.lng]);const s=c.kind==="route"?L.polyline(p,{pane:"operationalRoutes",color:c.color,weight:c.weight,opacity:0.5,lineCap:"round",lineJoin:"round"}):L.polygon(p,{pane:"operationalZones",color:c.color,weight:3,opacity:.95,fillColor:c.color,fillOpacity:.5});s.bindPopup(popupInfo(l));s.on("click",()=>{if(design&&!drawing){isolateLayer(l);render();buttons();fit(l)}});s.addTo(g)});return g}function cleanLayers(){return layers.map(l=>({id:l.id,name:l.name,type:l.type,points:l.points,paths:l.paths||[l.points],visible:l.visible,informacion:l.informacion||''}))}
function applyRows(rows,addToMap=design){
 const incoming=[];
 rows.forEach(r=>{
  const ct=canonicalType(r),paths=Array.isArray(r.paths)&&r.paths.length?r.paths:[r.points];
  if(!ct||!paths.some(p=>Array.isArray(p)&&p.length>=2))return;
  let l=incoming.find(x=>x.type===ct&&String(x.name||"").trim().toLowerCase()===String(r.name||"").trim().toLowerCase());
  if(l){l.paths=(l.paths||[l.points]).concat(paths);l.points=l.paths[0]}
  else incoming.push({...r,type:ct,name:ct==="route_intendente"?"Ruta Alternativa":(String(r.name||"").trim()||C[ct].name),informacion:String(r.informacion||r.info||"").trim(),paths:paths,points:paths[0],visible:r.visible!==false});
 });
 layers.forEach(l=>{if(l.shape)map.removeLayer(l.shape)});
 layers=[];
 incoming.forEach(l=>{if(design){l.shape=make(l);if(addToMap&&l.visible)l.shape.addTo(map)}layers.push(l)});
 return incoming.length>0;
}
async function save(){
 if(!cloudReady&&cloudLoadPromise) await cloudLoadPromise;
 if(!cloudReady){
  console.error("Google Sheets todavía no está cargado; no se sobrescribirá la información.");
  return false;
 }
 const clean=cleanLayers();
 ++saveSeq;
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  try{
   const payload=new URLSearchParams({
    accion:"guardarLogisticaPapa",
    datos:JSON.stringify(clean),
    usuario:"LOGISTICA-PAPA"
   });

   /*
    * Apps Script /exec puede responder mediante una redirección.
    * Se evita forzar manualmente Content-Type y se utiliza un POST
    * simple para que el navegador pueda seguir esa redirección.
    */
   const r=await fetch(API_URL+"?t="+Date.now(),{
    method:"POST",
    body:payload,
    cache:"no-store",
    redirect:"follow"
   });

   const postText=await r.text();
   let x=null;
   try{x=JSON.parse(postText)}catch(_){}

   if(!r.ok||!x||!x.ok){
    const detalle=x&&x.mensaje
      ?x.mensaje
      :(postText&&postText.trim().startsWith("<")
        ?"Google Apps Script devolvió HTML al guardar. Compruebe que la implementación web esté publicada como 'Cualquiera'."
        :"No se pudo guardar en Google Sheets.");
    throw new Error(detalle);
   }

   const vr=await fetch(
    API_URL+"?accion=obtenerLogisticaPapa&t="+Date.now(),
    {cache:"no-store",redirect:"follow"}
   );
   const verifyText=await vr.text();

   let vd=null;
   try{vd=JSON.parse(verifyText)}catch(_){
    const preview=verifyText
      ?verifyText.replace(/\\s+/g," ").trim().slice(0,180)
      :"(respuesta vacía)";
    throw new Error(
      "Google Sheets guardó la información, pero la respuesta de confirmación no fue JSON. "+
      "Respuesta recibida: "+preview
    );
   }

   if(!vr.ok||!vd||vd.ok!==true){
    throw new Error(
      (vd&&vd.mensaje)||"Google Sheets no confirmó correctamente el guardado."
    );
   }

   let saved=vd.datos;
   if(typeof saved==="string"){
    try{saved=JSON.parse(saved)}catch(_){saved=[]}
   }

   if(!Array.isArray(saved)||saved.length!==clean.length){
    throw new Error(
      "Google Sheets no confirmó todas las rutas y zonas guardadas. "+
      "Enviadas: "+clean.length+" · Confirmadas: "+(Array.isArray(saved)?saved.length:0)
    );
   }

   const expected=clean.map(l=>String(l.id)).sort().join("|");
   const received=saved.map(l=>String(l.id)).sort().join("|");

   if(expected!==received){
    throw new Error("Google Sheets confirmó una lista de rutas/zonas diferente a la enviada.");
   }

   return true;

  }catch(e){
   console.error("Guardado Logistica Papa",e);
   try{
    alert(
     "NO SE PUDO GUARDAR EN GOOGLE SHEETS.\\n\\n"+
     (e&&e.message?e.message:"Error desconocido")+
     "\\n\\nLa capa quedó en pantalla, pero NO se considerará guardada hasta que Google Sheets confirme el guardado."
    );
   }catch(_){}
   return false;
  }
 });
 return saveQueue;
}
async function loadCloud(addToMap=design){
 const maxIntentos=3;
 let ultimoError=null;

 for(let intento=1;intento<=maxIntentos;intento++){
  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);

   const r=await fetch(
    API_URL+"?accion=obtenerLogisticaPapa&t="+Date.now(),
    {
     cache:"no-store",
     redirect:"follow",
     method:"GET",
     mode:"cors",
     signal:controller.signal
    }
   );

   const raw=await r.text();
   clearTimeout(timer);

   let d=null;
   try{d=JSON.parse(raw)}catch(_){
    ultimoError=new Error(
     raw&&raw.trim().startsWith("<")
      ?"Google Apps Script respondió HTML en lugar de JSON."
      :"Google Apps Script no devolvió JSON válido."
    );
   }

   if(r.ok&&d&&d.ok===true){
    let datos=d.datos;
    if(typeof datos==="string"){
     try{datos=JSON.parse(datos)}catch(_){datos=[]}
    }
    if(!Array.isArray(datos))datos=[];

    // Solo reemplazamos la información local cuando la respuesta
    // de Google Sheets fue válida.
    applyRows(datos,addToMap);
    return true;
   }

   if(d&&d.ok===false){
    ultimoError=new Error(d.mensaje||"Google Sheets rechazó la consulta.");
   }

  }catch(e){
   ultimoError=e&&e.name==="AbortError"
    ?new Error("Tiempo de espera agotado al consultar Google Sheets.")
    :e;
  }

  if(intento<maxIntentos){
   await new Promise(resolve=>setTimeout(resolve,900*intento));
  }
 }

 console.warn("No se pudo cargar Logistica Papa desde Google Sheets después de "+maxIntentos+" intentos.",ultimoError);
 return false;
}
function fit(l){const ps=(l?.paths&&l.paths.length?l.paths:[l?.points||[]]).flat();if(ps.length)map.fitBounds(L.latLngBounds(ps.map(p=>[p.lat,p.lng])).pad(.2),{maxZoom:17})}
function editVertexIcon(active=false){return L.divIcon({className:"editVertex"+(active?" selected":""),html:"<span></span>",iconSize:[20,20],iconAnchor:[10,10]})}
function hideVertexMenu(){const x=$("vertexContextMenu");if(x)x.style.display="none"}
function ensureVertexMenu(){let x=$("vertexContextMenu");if(x)return x;x=document.createElement("div");x.id="vertexContextMenu";x.innerHTML='<button type="button" id="moveContextVertex">↔ Mover este punto</button><button type="button" id="deleteContextVertex">🗑 Eliminar este punto</button>';Object.assign(x.style,{display:"none",position:"fixed",zIndex:"10000",background:"#fff",border:"1px solid #d9e1e7",borderRadius:"8px",boxShadow:"0 8px 24px #0003",padding:"4px",minWidth:"170px"});document.body.appendChild(x);x.querySelectorAll("button").forEach(b=>b.style.cssText="display:block;width:100%;border:0;background:#fff;text-align:left;padding:9px 12px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer");x.querySelector("#moveContextVertex").style.color="#173f67";x.querySelector("#deleteContextVertex").style.color="#b42318";x.querySelector("#moveContextVertex").onclick=()=>{hideVertexMenu();activateMoveSelectedVertex()};x.querySelector("#deleteContextVertex").onclick=()=>{hideVertexMenu();deleteSelectedVertex()};return x}
function clearEditMarkers(){hideVertexMenu();editMarkers.forEach(m=>map.removeLayer(m));editMarkers=[];editing=null;window.editingVertex=null;const b=$("deletePoint");if(b)b.disabled=true;const s=$("saveEdit");if(s)s.disabled=true}
function refreshEditMarkers(l){
 clearEditMarkers();
 editing=l;
 const paths=l.paths&&l.paths.length?l.paths:[l.points];
 paths.forEach((path,pathIndex)=>{
  path.forEach((p,pointIndex)=>{
   const m=L.marker([p.lat,p.lng],{draggable:true,zIndexOffset:2000,icon:editVertexIcon(false)}).addTo(map);
   m.__pathIndex=pathIndex;
   m.__pointIndex=pointIndex;
   m.on("click",()=>{
    hideVertexMenu();
    window.editingVertex={layer:l,pathIndex,pointIndex,marker:m};
    editMarkers.forEach(x=>x.setIcon(editVertexIcon(x===m)));
    const b=$("deletePoint");if(b)b.disabled=false;
   });
   m.on("dragstart",()=>{
    hideVertexMenu();
    window.editingVertex={layer:l,pathIndex,pointIndex,marker:m};
    editMarkers.forEach(x=>x.setIcon(editVertexIcon(x===m)));
    const b=$("deletePoint");if(b)b.disabled=false;
   });
   m.on("drag",()=>{
    p.lat=m.getLatLng().lat;
    p.lng=m.getLatLng().lng;
    l.points=paths[0];
    if(l.shape)map.removeLayer(l.shape);
    l.shape=make(l,.98);
    if(l.visible)l.shape.addTo(map);
   });
   m.on("dragend",()=>{dirty=true;});
   m.on("contextmenu",e=>{
    if(!editing||editing!==l||!route(l.type))return;
    L.DomEvent.stop(e);
    window.editingVertex={layer:l,pathIndex,pointIndex,marker:m};
    editMarkers.forEach(x=>x.setIcon(editVertexIcon(x===m)));
    const b=$("deletePoint");if(b)b.disabled=false;
    const menu=ensureVertexMenu();
    const oe=e.originalEvent;
    const x=Math.min(oe.clientX,window.innerWidth-190),y=Math.min(oe.clientY,window.innerHeight-55);
    menu.style.left=Math.max(6,x)+"px";menu.style.top=Math.max(6,y)+"px";menu.style.display="block";
   });
   editMarkers.push(m);
  });
 });
}
function isolateLayer(l){if(!l)return;if(isolatedVisibility===null)isolatedVisibility=new Map(layers.map(x=>[x.id,x.visible]));layers.forEach(x=>{x.visible=x===l;if(x.shape){if(x===l)x.shape.addTo(map);else map.removeLayer(x.shape)}});selected=l.id}
function restoreIsolatedLayers(){if(isolatedVisibility===null)return;layers.forEach(x=>{const v=isolatedVisibility.get(x.id);if(v!==undefined)x.visible=v;if(x.shape){if(x.visible)x.shape.addTo(map);else map.removeLayer(x.shape)}});isolatedVisibility=null}
function activateMoveSelectedVertex(){const v=window.editingVertex;if(!v||!editing||v.layer!==editing)return;v.marker.dragging.enable();v.marker.setIcon(editVertexIcon(true));try{v.marker.bindTooltip("Arrastrá este punto para moverlo",{permanent:true,direction:"top",offset:[0,-10],opacity:.9}).openTooltip();setTimeout(()=>{try{v.marker.closeTooltip();v.marker.unbindTooltip()}catch(_){ }},2200)}catch(_){ }buttons()}
function selectVertex(l,pathIndex,pointIndex){
 const marker=editMarkers.find(m=>m.__pathIndex===pathIndex&&m.__pointIndex===pointIndex);
 if(!marker)return;
 window.editingVertex={layer:l,pathIndex,pointIndex,marker};
 editMarkers.forEach(x=>x.setIcon(editVertexIcon(x===marker)));
 const b=$("deletePoint");if(b)b.disabled=false;
}
function deleteSelectedVertex(){
 hideVertexMenu();
 const v=window.editingVertex;
 if(!v||!editing||v.layer!==editing)return;
 const paths=editing.paths&&editing.paths.length?editing.paths:[editing.points];
 const path=paths[v.pathIndex];
 if(!Array.isArray(path))return;
 const min=route(editing.type)?2:3;
 if(path.length<=min){
  alert(route(editing.type)
   ?"Una ruta debe conservar al menos 2 puntos."
   :"Una zona debe conservar al menos 3 puntos.");
  return;
 }
 path.splice(v.pointIndex,1);
 dirty=true;
 editing.paths=paths;
 editing.points=paths[0];
 if(editing.shape)map.removeLayer(editing.shape);
 editing.shape=make(editing,.98);
 if(editing.visible)editing.shape.addTo(map);
 window.editingVertex=null;
 refreshEditMarkers(editing);
 render();
}
async function finishEdit(l){
 if(editing!==l)return true;
 const target=l;
 clearEditMarkers();
 if(target.shape)map.removeLayer(target.shape);
 target.shape=make(target,.98);
 if(target.visible)target.shape.addTo(map);
 const ok=await save();
 if(ok)dirty=false;
 render();
 restoreIsolatedLayers();
 fit(target);
 buttons();
 return ok;
}
async function editLayer(l){
 if(editing&&editing!==l)await finishEdit(editing);
 if(editing===l)return;
 if(drawing)return;
 isolateLayer(l);
 selected=l.id;
 // Para editar una capa que estaba oculta, la hacemos visible automáticamente.
 // Así sus vértices siempre quedan visibles y editables sobre el mapa.
 if(!l.visible){
  l.visible=true;
  if(l.shape)l.shape.addTo(map);
 }
 refreshEditMarkers(l);
 buttons();
 render();
 fit(l);
}function render(){const b=$("list");if(!b)return;b.innerHTML="";
 const head=document.createElement("div");
 head.className="checklistHead";
 head.innerHTML='<span>Checklist de elementos</span><div><button type="button" class="checkAction" id="showAllDesign">Mostrar todos</button><button type="button" class="checkAction" id="hideAllDesign">Ocultar todos</button></div>';
 b.append(head);
 layers.forEach(l=>{const c=C[l.type],d=document.createElement("div");d.className="layer"+(l.visible?"":" off")+(selected===l.id?" selected":"");d.innerHTML='<input class="layerVisible" type="checkbox" title="Mostrar u ocultar elemento" '+(l.visible?"checked":"")+'><span class="swatch" style="background:'+c.color+'"></span><div class="body"><div class="name">'+l.name+'</div><div class="meta">'+(c.kind==="route"?"Ruta":"Zona")+" · "+l.points.length+' puntos</div></div><button class="icon editBtn" title="Editar puntos">✎</button><button class="icon deleteLayer" title="Eliminar elemento">×</button>';const vis=d.querySelector(".layerVisible"),edit=d.querySelector(".editBtn"),del=d.querySelector(".deleteLayer");vis.onclick=e=>{e.stopPropagation();l.visible=vis.checked;l.visible?l.shape.addTo(map):map.removeLayer(l.shape);if(!l.visible&&editing===l)clearEditMarkers();save().then(ok=>{if(!ok){l.visible=!l.visible;vis.checked=l.visible;l.visible?l.shape.addTo(map):map.removeLayer(l.shape)}render()})};edit.onclick=e=>{e.stopPropagation();editLayer(l)};del.onclick=e=>{e.stopPropagation();if(confirm("¿Eliminar "+l.name+"?")){if(editing===l)clearEditMarkers();if(l.shape)map.removeLayer(l.shape);layers=layers.filter(x=>x.id!==l.id);dirty=true;save().then(ok=>{if(ok)dirty=false;render()})}};d.onclick=()=>{if(editing===l)return;isolateLayer(l);render();fit(l)};b.append(d)});
 const show=$("showAllDesign"),hide=$("hideAllDesign");
 if(show)show.onclick=()=>{layers.forEach(l=>{l.visible=true;if(l.shape)l.shape.addTo(map)});dirty=true;save().then(ok=>{if(!ok)console.warn("No se pudo guardar la visibilidad de todas las capas.");render()})};
 if(hide)hide.onclick=()=>{if(editing)clearEditMarkers();layers.forEach(l=>{l.visible=false;if(l.shape)map.removeLayer(l.shape)});dirty=true;save().then(ok=>{if(!ok)console.warn("No se pudo guardar la visibilidad de todas las capas.");render()})};
}function load(addToMap=design){try{const a=[];a.forEach(r=>{const ct=canonicalType(r),paths=Array.isArray(r.paths)&&r.paths.length?r.paths:[r.points];if(!ct||!paths.some(p=>Array.isArray(p)&&p.length>=2))return;const l={...r,type:ct,name:ct==="route_intendente"?"Ruta Alternativa":(String(r.name||"").trim()||C[ct].name),informacion:String(r.informacion||r.info||"").trim(),paths:paths,points:paths[0],visible:r.visible!==false};if(design){l.shape=make(l);if(addToMap&&l.visible)l.shape.addTo(map)}layers.push(l)})}catch(e){console.warn("No se pudieron cargar las capas",e)}}function clearOperationalLayers(){map.eachLayer(layer=>{if(layer!==baseLayer)map.removeLayer(layer)})}function presenterShape(l){return make(l,.65)}function showPresenterType(t){if(groups[t])map.removeLayer(groups[t]);const g=L.featureGroup();layers.filter(l=>l.type===t).forEach(l=>presenterShape(l).addTo(g));groups[t]=g;if(g.getLayers().length)g.addTo(map)}function hidePresenterType(t){if(groups[t]){map.removeLayer(groups[t]);groups[t]=null}}function buildPresenter(){groups={};Object.keys(C).forEach(t=>groups[t]=null);clearOperationalLayers()}function renderPresenter(){const b=$("presenterList");if(!b)return;b.innerHTML="";Object.entries(C).forEach(([t,c])=>{const n=layers.filter(l=>l.type===t).length,row=document.createElement("label");row.className="presenterItem";row.dataset.type=t;row.innerHTML='<input type="checkbox" '+(n?"":"disabled")+'><span class="presenterSwatch" style="background:'+c.color+'"></span><div><div class="presenterName">'+c.name+'</div><div class="presenterMeta">'+(c.kind==="route"?"Ruta":"Zona")+" · "+n+" elemento"+(n===1?"":"s")+"</div></div>";const cb=row.querySelector("input");cb.onchange=()=>{if(cb.checked)showPresenterType(t);else hidePresenterType(t)};b.append(row)})}if(design){if(document.querySelectorAll(".type").length){document.querySelectorAll(".type").forEach(b=>b.onclick=()=>{document.querySelectorAll(".type").forEach(x=>x.classList.remove("active"));b.classList.add("active");type=b.dataset.type})}function buttons(){$("editSelected").disabled=drawing||!!editing||!layers.find(x=>x.id===selected);$("start").disabled=drawing||!!editing;$("finish").disabled=!drawing;$("cancel").disabled=!drawing;$("deletePoint").disabled=!editing||!window.editingVertex;$("saveEdit").disabled=!editing}function redraw(){if(!draft)return;draft.clearLayers();pts.forEach(p=>L.circleMarker([p.lat,p.lng],{pane:"draftPane",radius:5,color:"#173f67",weight:2,fillColor:"#fff",fillOpacity:1}).addTo(draft));if(pts.length>1){const a=pts.map(p=>[p.lat,p.lng]);route(type)?L.polyline(a,{pane:"draftPane",color:C[type].color,weight:4,dashArray:"7 6"}).addTo(draft):pts.length>2&&L.polygon(a,{pane:"draftPane",color:C[type].color,fillColor:C[type].color,fillOpacity:.18,dashArray:"5 4"}).addTo(draft)}}$("editSelected").onclick=async()=>{const l=layers.find(x=>x.id===selected);if(l)await editLayer(l)};$("start").onclick=async()=>{if(!cloudReady)return alert("Esperá a que termine de cargar el mapa desde Google Sheets.");if(editing)await finishEdit(editing);drawing=true;dirty=true;pts=[];draft=L.layerGroup().addTo(map);buttons()};$("cancel").onclick=()=>{drawing=false;pts=[];draft&&map.removeLayer(draft);draft=null;if(!editing)dirty=false;buttons()};$("deletePoint").onclick=()=>deleteSelectedVertex();$("saveEdit").onclick=async()=>{if(editing)await finishEdit(editing);else if(dirty){const ok=await save();if(ok)dirty=false}buttons();render()};$("finish").onclick=()=>{const min=route(type)?2:3;if(pts.length<min)return alert(route(type)?"Marcá al menos 2 puntos.":"Marcá al menos 3 puntos.");const nm=C[type].name;let l=layers.find(x=>x.type===type&&x.name.trim().toLowerCase()===nm.trim().toLowerCase());if(l){l.paths=(l.paths&&l.paths.length?l.paths:[l.points]);l.paths.push(pts.slice());l.points=l.paths[0];if(l.shape)map.removeLayer(l.shape);l.shape=make(l,.98).addTo(map)}else{l={id:"z"+Date.now(),name:nm,type:type,informacion:"",points:pts.slice(),paths:[pts.slice()],visible:true};l.shape=make(l,.98).addTo(map);layers.push(l)}$("cancel").click();save().then(ok=>{if(ok)dirty=false;render();fit(l)})};map.on("click",e=>{hideVertexMenu();if(drawing){pts.push({lat:e.latlng.lat,lng:e.latlng.lng});redraw()}});$("back").onclick=()=>$("modal").classList.remove("open");$("save").onclick=()=>{const t=canonicalType({type:$("zoneType").value})||$("zoneType").value,nm=$("zoneName").value.trim()||C[t].name,info=$("zoneInfo").value.trim();let l=layers.find(x=>x.type===t&&x.name.trim().toLowerCase()===nm.trim().toLowerCase());if(l){l.paths=(l.paths&&l.paths.length?l.paths:[l.points]);l.paths.push(pts.slice());l.points=l.paths[0];l.informacion=info;if(l.shape)map.removeLayer(l.shape);l.shape=make(l,.98).addTo(map)}else{l={id:"z"+Date.now(),name:nm,type:t,informacion:info,points:pts.slice(),paths:[pts.slice()],visible:true};l.shape=make(l,.98).addTo(map);layers.push(l)}$("modal").classList.remove("open");$("cancel").click();save().then(ok=>{if(ok)dirty=false;render();fit(l)})};Object.entries(C).forEach(([k,c])=>{const o=document.createElement("option");o.value=k;o.textContent=c.name;$("zoneType").append(o)});buttons();render();
cloudLoadPromise=loadCloud(true).then(ok=>{cloudReady=ok;buttons();render();if(!ok)alert("No se pudo cargar el mapa desde Google Sheets. No se habilitó el dibujo para evitar perder datos.");return ok});
}else{buildPresenter();renderPresenter();cloudLoadPromise=(async()=>{let ok=false;for(let intento=1;intento<=3&&!ok;intento++){ok=await loadCloud(false);if(!ok&&intento<3)await new Promise(r=>setTimeout(r,900));}cloudReady=ok;buildPresenter();renderPresenter();if(ok){Object.keys(C).forEach(t=>showPresenterType(t));document.querySelectorAll("#presenterList input:not(:disabled)").forEach(x=>x.checked=true);const pts=layers.flatMap(l=>(l.paths&&l.paths.length?l.paths:[l.points]).flat()).filter(p=>p&&isFinite(p.lat)&&isFinite(p.lng));if(pts.length)map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lng])).pad(.12),{maxZoom:16});}setTimeout(()=>map.invalidateSize(true),100);setTimeout(()=>map.invalidateSize(true),600);setTimeout(()=>map.invalidateSize(true),1500);if(!ok)console.warn("Presentador: no se pudo cargar Google Sheets");return ok})();$("showAll").onclick=()=>{Object.keys(C).forEach(t=>showPresenterType(t));document.querySelectorAll("#presenterList input:not(:disabled)").forEach(x=>x.checked=true);setTimeout(()=>map.invalidateSize(true),100)};$("hideAll").onclick=()=>{Object.keys(C).forEach(t=>hidePresenterType(t));document.querySelectorAll("#presenterList input:not(:disabled)").forEach(x=>x.checked=false)}}})();