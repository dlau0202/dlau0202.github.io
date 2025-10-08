(function(){
  function sha256hex(str){
    const buf = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', buf).then(buf2 => {
      const arr = Array.from(new Uint8Array(buf2));
      return arr.map(b => b.toString(16).padStart(2,'0')).join('');
    });
  }

  async function askPass(expectedHash){
    const wrapper = document.createElement('div');
    wrapper.id = 'post-lock-overlay';
    wrapper.innerHTML = `
      <div class="post-lock-card">
        <h3>请输入密码</h3>
        <input type="password" id="post-lock-input" placeholder="Password" />
        <button id="post-lock-btn">解锁</button>
        <p id="post-lock-msg" class="hidden"></p>
      </div>`;
    document.body.appendChild(wrapper);

    return new Promise(resolve => {
      const input = wrapper.querySelector('#post-lock-input');
      const btn = wrapper.querySelector('#post-lock-btn');
      const msg = wrapper.querySelector('#post-lock-msg');
      function submit(){
        const v = input.value || '';
        sha256hex(v).then(hex => {
          if(hex === expectedHash){
            wrapper.remove();
            resolve(true);
          } else {
            msg.textContent = '密码错误';
            msg.classList.remove('hidden');
          }
        });
      }
      btn.addEventListener('click', submit);
      input.addEventListener('keydown', e => { if(e.key==='Enter'){ submit(); }});
      input.focus();
    });
  }

  async function guard(){
    const container = document.querySelector('[data-lock-hash]');
    if(!container) return;
    const expected = container.getAttribute('data-lock-hash');
    // hide content until unlocked
    container.style.display = 'none';
    const ok = await askPass(expected);
    if(ok){
      container.style.display = '';
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', guard);
  } else {
    guard();
  }
})();
