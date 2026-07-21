const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
const $ = id => document.getElementById(id);

// Временная диагностика — покажет прямо на странице, видит ли она Telegram WebApp API.
document.addEventListener('DOMContentLoaded', () => {
  const debug = document.createElement('p');
  debug.style.cssText = 'font-size:10px;opacity:.6;word-break:break-all;padding:4px 8px;';
  const unsafeKeys = tg?.initDataUnsafe ? Object.keys(tg.initDataUnsafe).join(',') : 'нет';
  debug.textContent =
    `debug: tg=${!!tg}, initData.length=${(tg?.initData || '').length}, platform=${tg?.platform || 'n/a'}, version=${tg?.version || 'n/a'} | ` +
    `hash.length=${location.hash.length}, search.length=${location.search.length} | unsafeKeys=${unsafeKeys}`;
  document.querySelector('main')?.prepend(debug);
});

function drawChart(candles, direction) {
  const canvas = $('chart'), ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = 250 * dpr; ctx.scale(dpr, dpr);
  const w = rect.width, h = 250, pad = 22;
  ctx.clearRect(0,0,w,h);
  const values = candles.map(c => c.close), min = Math.min(...values), max = Math.max(...values), range = max-min || 1;
  ctx.strokeStyle = direction === 'UP' ? '#2fd28f' : direction === 'DOWN' ? '#ff647c' : '#4f8cff';
  ctx.lineWidth = 2.5; ctx.beginPath();
  values.forEach((v,i)=>{ const x=pad+i*(w-pad*2)/(values.length-1); const y=h-pad-(v-min)/range*(h-pad*2); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.stroke();
}
function render(data){
  const p=data.prediction;
  const map={UP:['ВВЕРХ','↗'],DOWN:['ВНИЗ','↘'],WAIT:['ПРОПУСТИТЬ','•']};
  $('direction').textContent=map[p.direction][0]; $('signalIcon').textContent=map[p.direction][1];
  $('confidence').textContent=p.confidence+'%'; $('explanation').textContent=p.explanation;
  $('metrics').innerHTML=`<div class="metric"><span>RSI 14</span><strong>${p.indicators.rsi14}</strong></div><div class="metric"><span>EMA 8</span><strong>${p.indicators.ema8.toFixed(5)}</strong></div><div class="metric"><span>EMA 21</span><strong>${p.indicators.ema21.toFixed(5)}</strong></div><div class="metric"><span>P(вверх)</span><strong>${p.probabilityUp}%</strong></div>`;
  drawChart(data.candles,p.direction);
}
$('analyze').addEventListener('click',async()=>{
  $('status').textContent='Анализ…'; $('analyze').disabled=true;
  try{
    const response=await fetch('/api/signal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pair:$('pair').value,interval:$('interval').value,initData:tg?.initData||''})});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||'Ошибка');
    render(data); $('status').textContent=data.source==='demo'?'Демо‑данные':'Онлайн‑данные'; tg?.HapticFeedback?.notificationOccurred('success');
  }catch(e){$('status').textContent='Ошибка'; $('explanation').textContent=e.message; tg?.HapticFeedback?.notificationOccurred('error');}
  finally{$('analyze').disabled=false;}
});
