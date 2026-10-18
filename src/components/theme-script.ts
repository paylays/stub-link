// Runs before first paint: marks JS as available (shows the theme switch) and applies a saved theme.
// Shared by the app layout and the static status pages so the two cannot drift.
export const THEME_HEAD_SCRIPT =
  '(function(){var r=document.documentElement;r.setAttribute("data-js","");try{var t=localStorage.getItem("stub-theme");if(t==="light"||t==="dark")r.setAttribute("data-theme",t)}catch(e){}})();';
