document.addEventListener('DOMContentLoaded',()=>{
  const year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();

  const form = document.getElementById('contactForm');
  const result = document.getElementById('formResult');
  if(form){
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get('name');
      result.textContent = `Thanks, ${name || 'friend'} — message received.`;
      form.reset();
    });
  }
});
