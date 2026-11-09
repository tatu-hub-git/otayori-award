(() => {
  const byId = id => document.getElementById(id);
  const selected = new Set();
  let letters = [];
  let randomOrder = [];

  // Fisher-Yates shuffle: ロード時に1度だけ実施し、閲覧中の並び順は固定
  function shuffle(array) {
    const a = [...array];
    for(let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 本文が実際に切れているカードだけ「全文を見る」を表示する。
  function refreshExpandButtons() {
    document.querySelectorAll('.letter').forEach(article => {
      const excerpt = article.querySelector('.excerpt');
      const button = article.querySelector('.text-button');
      const wasOpen = article.classList.contains('open');
      if (wasOpen) article.classList.remove('open');
      const overflows = excerpt.scrollHeight > excerpt.clientHeight + 1;
      if (wasOpen && overflows) article.classList.add('open');
      button.hidden = !overflows;
      if (!overflows) button.textContent = '全文を見る';
    });
  }

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(refreshExpandButtons);
  });
  if (document.fonts) document.fonts.ready.then(refreshExpandButtons);

  function render() {
    const q = byId('search').value.trim().toLocaleLowerCase();
    const sorted = byId('sort').value === 'id' ? [...letters].sort((a,b) => a.id.localeCompare(b.id,'ja',{numeric:true})) : randomOrder;
    const visible = sorted.filter(x => `${x.id} ${x.text} ${x.author || ""} ${x.category || ""}`.toLocaleLowerCase().includes(q));
    byId('count').textContent = `${visible.length} / ${letters.length}件表示`;
    byId('empty').hidden = visible.length !== 0;
    const root = byId('letters');
    const fragment = document.createDocumentFragment();
    visible.forEach(item => {
      const article = document.createElement('article'); article.className = 'letter';
      const top = document.createElement('div'); top.className='top';
      const id = document.createElement('span'); id.className='id'; id.textContent=`No.${item.id}`;
      const tag = document.createElement('span'); tag.className='tag'; tag.textContent=item.date || '';
      const author = document.createElement('span'); author.className='author'; author.textContent='FROM '+(item.author || 'リスナー');
      top.append(id,tag);
      const authorRow=document.createElement('div'); authorRow.className='author-row'; authorRow.append(author);
      const p=document.createElement('p');p.className='excerpt';p.textContent=item.text;
      const actions=document.createElement('div');actions.className='letter-actions';
      const expand=document.createElement('button');expand.className='text-button';expand.type='button';expand.textContent='全文を見る';
      expand.addEventListener('click',()=>{const open=article.classList.toggle('open'); expand.textContent=open?'閉じる':'全文を見る';});
      const pick=document.createElement('button');pick.className='pick';pick.type='button';pick.dataset.id=item.id;
      pick.addEventListener('click',()=>{
        if(selected.has(item.id)) selected.delete(item.id);
        else if(selected.size < 3) selected.add(item.id);
        updatePicks();
      });
      actions.append(expand,pick);article.append(top,authorRow,p,actions);fragment.append(article);
    });
    root.replaceChildren(fragment);
    updatePicks();
    requestAnimationFrame(refreshExpandButtons);
  }
  function updatePicks(){
    byId('selected-count').textContent=selected.size;
    byId('selected-list').textContent=selected.size ? [...selected].map(id=>`No.${id}`).join(' / ') : '候補を選んでね';
    byId('vote-button').disabled=selected.size===0;
    document.querySelectorAll('.pick').forEach(btn=>{
      const picked=selected.has(btn.dataset.id);
      btn.setAttribute('aria-pressed',String(picked));
      btn.textContent=picked?'✓ 選択済み':'＋ 選ぶ';
      btn.disabled=!picked&&selected.size>=3;
    });
  }
  function formUrl(ids){
    const conf=window.AWARD_CONFIG||{};
    if(!conf.formBaseUrl) return null;
    try{
      const url=new URL(conf.formBaseUrl);
      url.searchParams.set('usp','pp_url');
      (conf.entryIds||[]).forEach((key,i)=>{if(key && ids[i]) url.searchParams.set(key, ids[i]);});
      return url.toString();
    }catch{return null;}
  }
  byId('search').addEventListener('input',render);
  byId('sort').addEventListener('change',render);
  byId('vote-button').addEventListener('click',()=>{
    const ids=[...selected];
    byId('vote-preview').textContent=ids.map(id=>`No.${id}`).join('、');
    const url=formUrl(ids);
    const link=byId('form-link');
    link.hidden=!url;
    if(url) link.href=url;
    byId('vote-help').textContent=url ? 'Googleフォームを開き、選択内容を確認して送信してください。' : 'GoogleフォームのURLはまだ設定されていません。番号をコピーし、管理者が案内するフォームで投票してください。';
    byId('vote-dialog').showModal();
  });
  byId('copy-button').addEventListener('click',async()=>{
    const text=[...selected].join(', ');
    try{await navigator.clipboard.writeText(text);byId('copy-button').textContent='コピーしました';}
    catch{byId('copy-button').textContent=`番号: ${text}`;}
  });
  fetch('letters.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(data=>{
    if(!Array.isArray(data)||data.some(x=>typeof x.id!=='string'||typeof x.text!=='string'))throw new Error('JSONの形式が不正です');
    const ids=data.map(x=>x.id);
    if(new Set(ids).size!==ids.length)throw new Error('お便りIDが重複しています');
    letters=data;randomOrder=shuffle(data);render();
  }).catch(err=>{byId('letters').textContent=`お便りデータを読み込めませんでした: ${err.message}。ローカル確認には簡易サーバーを使ってください。`;});
})();
