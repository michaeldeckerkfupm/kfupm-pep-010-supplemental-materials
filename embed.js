'use strict';
(() => {
 const embedded=new URLSearchParams(location.search).get('embed')==='1';
 if(embedded)document.documentElement.classList.add('embed-mode');

 // Keep the mode in page URLs rather than storage, so ordinary visits stay normal.
 window.materialsEmbedURL=href=>{
  if(!embedded)return href;
  const url=new URL(href,location.href);
  if(url.origin===location.origin&&(/\.html$/.test(url.pathname)||url.pathname.endsWith('/'))){
   url.searchParams.set('embed','1');
   return url.pathname+url.search+url.hash;
  }
  return href;
 };
 document.addEventListener('DOMContentLoaded',()=>{
  if(!embedded)return;
  document.querySelectorAll('a[href]').forEach(link=>{
   link.setAttribute('href',window.materialsEmbedURL(link.getAttribute('href')));
  });
 });
})();
