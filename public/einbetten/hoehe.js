/* Der Kämmerer – passt eingebettete Grafiken (iframes von derkaemmerer.de) an ihre Inhaltshöhe an. */
(function () {
  addEventListener('message', function (e) {
    if (!/^https:\/\/([a-z]+\.)?derkaemmerer\.de$/.test(e.origin) || !e.data || !e.data.dkHoehe) return;
    var f = document.querySelectorAll('iframe');
    for (var i = 0; i < f.length; i++) if (f[i].contentWindow === e.source) f[i].style.height = e.data.dkHoehe + 'px';
  });
})();
