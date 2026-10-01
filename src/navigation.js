// Keep a real home entry behind each mode. Back leaves the mode, not the site.
export function mountNavigation(renderRoute) {
  const key='noirRoute';
  let restoring=false;
  history.replaceState({...history.state,[key]:'home',noirData:null},'',location.href);
  function enter(route,data=null) {
    if(restoring||history.state?.[key]===route&&JSON.stringify(history.state?.noirData??null)===JSON.stringify(data))return;
    history.pushState({...history.state,[key]:route,noirData:data},'',location.href);
  }
  function home() {
    enter('home');
  }
  window.addEventListener('popstate',event=>{
    restoring=true;
    try {renderRoute(event.state?.[key]||'home',event.state?.noirData);}finally{restoring=false;}
  });
  return {enter,home};
}
