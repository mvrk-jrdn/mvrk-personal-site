if (location.protocol === 'file:') {
  const about = document.getElementById('about');
  if (about) {
    const hint = document.createElement('div');
    hint.className = 'card out';
    hint.style.marginTop = '12px';
    hint.textContent = 'Note: To load posts and images this site must be served over HTTP. Run `python -m http.server` in this folder and open http://localhost:8000/';
    about.appendChild(hint);
  }
  console.warn('Opened via file:// — fetch requests may fail. Serve files with a local HTTP server.');
}
const chans = document.querySelectorAll('.chan[data-view]');
const views = document.querySelectorAll('.view');

function showView(view, chan){
  const current = document.querySelector('.view.active');
  if (current === view) {
    if (chan) {
      chans.forEach(c => c.classList.remove('active'));
      chan.classList.add('active');
    }
    return;
  }
  const container = document.querySelector('.terminal');

  if (current && container){
    const h = current.getBoundingClientRect().height;
    container.style.height = Math.ceil(h) + 'px';
  }

  if (current) {
    current.classList.remove('active');
    const onOldEnd = (e) => {
      if (e.propertyName === 'opacity'){
        current.hidden = true;
        current.removeEventListener('transitionend', onOldEnd);
      }
    };
    current.addEventListener('transitionend', onOldEnd);
  }

  view.hidden = false;
  requestAnimationFrame(() => view.classList.add('active'));

  const onNewEnd = (e) => {
    if (e.propertyName === 'opacity'){
      if (container) container.style.height = '';
      view.removeEventListener('transitionend', onNewEnd);
    }
  };
  view.addEventListener('transitionend', onNewEnd);

  if (chan) {
    chans.forEach(c => c.classList.remove('active'));
    chan.classList.add('active');
  }
}

chans.forEach(chan => {
  chan.addEventListener('click', () => {
    const id = chan.dataset.view;
    const view = document.getElementById(id);
    if (!view) return;
    showView(view, chan);
  });
});

(function(){
  const initial = document.querySelector('.view:not([hidden])') || document.getElementById('about');
  if (initial){ initial.hidden = false; initial.classList.add('active'); }
})();

/* -------- Blog formatting helpers -------- */
function escapeHTML(str){
  return str.replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s] || s));
}

function formatBlogText(text){
  if (!text) return '';
  text = text.replace(/\r\n/g,'\n');

  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length>0);

  return paras.map(p => {
    const html = escapeHTML(p).replace(/\n/g,'<br>');
    return `<p>${html}</p>`;
  }).join('\n');
}

/* -------- Blog loader -------- */
fetch('blog/index.json')
  .then(r => r.json())
  .then(posts => {
    const wrap = document.getElementById('blog-posts');
    if (!wrap) return;

    // ensure posts are sorted numerically by leading number (highest first)
    posts.sort((a,b) => {
      const numa = parseInt(a.match(/^\d+/)?.[0]||0,10);
      const numb = parseInt(b.match(/^\d+/)?.[0]||0,10);
      return numb - numa; // descending
    });

    posts.forEach(file => {
      fetch('blog/' + file)
        .then(r => r.text())
        .then(text => {
          const details = document.createElement('details');
          details.className = 'card blog-post';

          const summary = document.createElement('summary');

          let title = file.replace(/\.txt$/i,'');
          const lines = text.replace(/\r\n/g,'\n').split('\n');
          for (let i=0;i<lines.length;i++){
            const ln = lines[i].trim();
            if (!ln) continue;
            const m = ln.match(/^#{1,6}\s+(.*)$/);
            if (m){ title = m[1].trim();
              lines.splice(i,1);
            }
            break;
          }
          summary.textContent = title;

          const body = document.createElement('div');
          body.className = 'out';

          const contentText = lines.join('\n').trim();
          body.innerHTML = formatBlogText(contentText);

          details.appendChild(summary);
          details.appendChild(body);
          wrap.appendChild(details);
        })
        .catch(err => console.error('Failed to load blog post:', file, err));
    });
  })
  .catch(err => console.error('Failed to load blog/index.json', err));

/* -------- Art loader -------- */
fetch('art/art.json')
  .then(r => r.json())
  .then(images => {
    const grid = document.getElementById('art-grid');
    if (!grid) return;

    images.forEach(src => {
      const img = document.createElement('img');
      img.src = 'art/' + src;
      img.loading = 'lazy';
      img.className = 'card';
      grid.appendChild(img);
      img.addEventListener('click', () => openLightbox(img.src));
    });
  })
  .catch(err => console.error('Failed to load art/art.json', err));

/* -------- Ref sheet loader -------- */
fetch('refs/refs.json')
  .then(r => r.json())
  .then(images => {
    const grid = document.getElementById('refs-grid');
    if (!grid) return;

    images.forEach(src => {
      const img = document.createElement('img');
      img.src = 'refs/' + src;
      img.loading = 'lazy';
      img.className = 'card';
      grid.appendChild(img);
      img.addEventListener('click', () => openLightbox(img.src));
    });
  })
  .catch(err => console.error('Failed to load refs/refs.json', err));

function createLightbox(){
  if (document.querySelector('.lightbox')) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox';

  const img = document.createElement('img');
  lb.appendChild(img);

  const close = document.createElement('button');
  close.className = 'close';
  close.textContent = 'Close';
  lb.appendChild(close);

  close.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

  document.body.appendChild(lb);
}

function openLightbox(src){
  createLightbox();
  const lb = document.querySelector('.lightbox');
  const img = lb.querySelector('img');
  img.src = src;
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(){
  const lb = document.querySelector('.lightbox');
  if (!lb) return;
  lb.classList.remove('active');
  document.body.style.overflow = '';
  const img = lb.querySelector('img');
  setTimeout(() => { if (img) img.src = ''; }, 300);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

function setTheme(name){
  try{ document.documentElement.setAttribute('data-theme', name); localStorage.setItem('site-theme', name); }catch(e){}
  updateThemeButtons();
}

function updateThemeButtons(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const ids = ['theme-dark','theme-light','theme-dusk','theme-terminal','theme-arctic','theme-amethyst','theme-rain','theme-onyx','theme-crimson','theme-tuah','theme-verdant','theme-contrast'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const themeName = id.replace('theme-','');
    el.classList.toggle('active', cur === themeName);
  });
}

(function(){
  const mapping = {
    'theme-dark':'dark',
    'theme-light':'light',
    'theme-dusk':'dusk',
    'theme-terminal':'terminal',
    'theme-arctic':'arctic',
    'theme-amethyst':'amethyst',
    'theme-rain':'rain',
    'theme-onyx':'onyx',
    'theme-crimson':'crimson',
    'theme-tuah':'tuah',
    'theme-verdant':'verdant',
    'theme-contrast':'contrast'
  };
  Object.keys(mapping).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => setTheme(mapping[id]));
  });
  updateThemeButtons();
})();