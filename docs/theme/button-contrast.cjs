// Inspect enabled, visible control labels. Image/gradient surfaces need visual review.
module.exports = async function buttonContrast(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    const rgb = s => { ctx.clearRect(0,0,1,1); ctx.fillStyle=s; ctx.fillRect(0,0,1,1); const v=ctx.getImageData(0,0,1,1).data; return [v[0],v[1],v[2],v[3]/255]; };
    const luminance = a => a.slice(0, 3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
    const failures = [];
    for (const control of document.querySelectorAll('button,a[href]')) {
      if (control.disabled || !control.getClientRects().length) continue;
      const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const e = node.parentElement, style = getComputedStyle(e);
        if (!e.getClientRects().length || style.visibility === 'hidden' || e.closest('.sr-only,[aria-hidden="true"]')) continue;
        let bg = [255, 255, 255], layers = [], image = false, opacity = 1;
        for (let a = e; a; a = a.parentElement) {
          const s = getComputedStyle(a); opacity *= Number(s.opacity);
          if (s.backgroundImage !== 'none') image = true;
          const b = rgb(s.backgroundColor); layers.push(b);
          if (b.length === 3 || b[3] === 1) break;
        }
        if (image || opacity < .95) continue;
        for (const b of layers.reverse()) {
          const alpha = b.length === 4 ? b[3] : 1;
          bg = bg.map((x, i) => (b[i] || 0) * alpha + x * (1 - alpha));
        }
        const fg = rgb(style.color), alpha = fg[3] ?? 1;
        const l1 = luminance(fg.slice(0, 3).map((x, i) => x * alpha + bg[i] * (1 - alpha))), l2 = luminance(bg);
        const ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
        if (ratio < 4.5) failures.push({ label: node.textContent.trim().slice(0, 75), ratio: +ratio.toFixed(2), color: style.color, background: bg, className: e.className });
      }
    }
    return failures;
  });
};
