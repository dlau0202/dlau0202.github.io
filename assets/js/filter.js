(function(){
  function setActive(btn, group){
    group.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  function matchTag(filter, tagsAttr){
    if (!tagsAttr) return false;
    const tags = tagsAttr.split(',').map(s => s.trim());
    return tags.includes(filter);
  }
  function applyFilter(filter){
    const posts = Array.from(document.querySelectorAll('.posts .post'));
    posts.forEach(p => {
      const tagsAttr = p.getAttribute('data-tags') || '';
      const show = (filter === 'all') ? true : matchTag(filter, tagsAttr);
      p.style.display = show ? '' : 'none';
    });
  }
  document.addEventListener('DOMContentLoaded', function(){
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    if (!buttons.length) return;
    buttons.forEach(btn => {
      btn.addEventListener('click', function(){
        setActive(btn, buttons);
        applyFilter(btn.getAttribute('data-filter'));
      });
    });
    // Default: show all
    setActive(buttons[0], buttons);
    applyFilter('all');
  });
})();
