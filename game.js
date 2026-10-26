(()=>{'use strict';
const $=id=>document.getElementById(id),C=$('game'),g=C.getContext('2d'),W=960,H=540,TAU=Math.PI*2;
const HEROES=[['Chase','chase','#2575e4','⚡ Supervelocidade'],['Marshall','marshall','#ef4a4a','💦 Apagar fogo'],['Skye','skye','#ee85ba','🪽 Planar'],['Rubble','rubble','#e8b324','🔨 Quebrar blocos'],['Rocky','rocky','#4db86a','🛠️ Ponte temporária'],['Zuma','zuma','#ef903a','🌊 Nadar rápido']];
const THEMES=[{name:'BAÍA DA AVENTURA',sky:['#69c8ff','#d6f8ff'],soil:'#94552c',grass:'#54c941',back:'#6eaf92',enemy:'crab'}, {name:'FLORESTA',sky:['#79c9e3','#baf4d8'],soil:'#704326',grass:'#41ba56',back:'#337b65',enemy:'bird'}, {name:'CAVERNA',sky:['#20294f','#62558b'],soil:'#67516a',grass:'#a578a1',back:'#403959',enemy:'chest'}, {name:'NEVE',sky:['#86c9f4','#e2f7ff'],soil:'#7896af',grass:'#e8fbff',back:'#9cbad5',enemy:'bird'}, {name:'CIDADE',sky:['#70b9f8','#e7edff'],soil:'#756b77',grass:'#8ac0a0',back:'#7395c1',enemy:'crab'}, {name:'TORRE FINAL',sky:['#37275b','#a85e57'],soil:'#554052',grass:'#e49a58',back:'#653d63',enemy:'chest'}];


const sprites=HEROES.map(h=>Array.from({length:8},(_,i)=>{const img=new Image();img.decoding='async';img.src='assets/characters/'+h[1]+'_'+i+'.png';return img}));
const saveKey='patrol-super-resgate-master-v1';let saved={unlocked:1,bests:[0,0,0,0,0,0],hero:0};try{Object.assign(saved,JSON.parse(localStorage.getItem(saveKey)||'{}'))}catch{}
let hero=Math.min(5,Math.max(0,saved.hero|0)),stage=0,level,player,cam=0,gameTime=0,score=0,coins=0,bones=0,stars=0,shield=0,particles=[],running=false,paused=false,overlay=false,last=0,raf=0,toastUntil=0,wasJump=false,wasPower=false,gameOver=false,stageDone=false,shake=0,checkpoint=70;
const held=new Set();let musicOn=false,sfxOn=true,audio=null,musicTick=0,musicIndex=0;const melodies=[[0,4,7,9,7,4,2,4],[0,2,5,7,9,7,5,2],[0,3,7,10,7,3,5,7],[0,4,7,12,7,4,2,0],[0,5,9,7,5,4,2,0],[0,3,5,8,7,5,3,0]];
function persist(){saved.hero=hero;try{localStorage.setItem(saveKey,JSON.stringify(saved))}catch{}}
function audioStart(){try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch{}}
function beep(freq=500,dur=.09,type='sine',volume=.045){if(!sfxOn||!audio)return;const o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(volume,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}
function tune(dt){if(!musicOn||!audio||paused||!running)return;musicTick-=dt;if(musicTick>0)return;musicTick=.26;const note=melodies[stage][musicIndex++%8],o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.value=261.63*Math.pow(2,note/12);v.gain.setValueAtTime(.018,audio.currentTime);v.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.21);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+.22)}
$('music').onclick=()=>{audioStart();musicOn=!musicOn;$('music').textContent='♫ Música: '+(musicOn?'ON':'OFF')};$('sfx').onclick=()=>{audioStart();sfxOn=!sfxOn;$('sfx').textContent='🔊 Efeitos: '+(sfxOn?'ON':'OFF')};
function page(name){for(const id of ['menu','levels','play'])$(id).hidden=id!==name;$('overlay').hidden=true;overlay=false}
function announce(text,ms=1200){$('toast').textContent=text;toastUntil=performance.now()+ms}
function modal(title,text,buttons){overlay=true;$('overlay').hidden=false;$('overlayTitle').textContent=title;$('overlayText').textContent=text;const target=$('overlayButtons');target.replaceChildren();for(const [label,fn] of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{overlay=false;$('overlay').hidden=true;fn()};target.append(b)}}
HEROES.forEach((h,i)=>{const b=document.createElement('button');b.className='hero';b.setAttribute('aria-pressed',String(i===hero));b.innerHTML=`<img src="assets/characters/${h[1]}_0.png" alt=""><span>${h[0]}</span>`;b.onclick=()=>chooseHero(i);$('heroes').append(b)});
HEROES.forEach((h,i)=>{const b=document.createElement('button');b.className='pup-choice';b.dataset.pup=h[1];b.setAttribute('aria-pressed',String(i===hero));b.innerHTML=`<img src="assets/characters/${h[1]}_0.png" alt=""><span>${h[0]}</span>`;b.onclick=()=>chooseHero(i);$('quickHeroes').append(b)});
function levelsPage(){page('levels');const list=$('levelCards');list.replaceChildren();THEMES.forEach((t,i)=>{const b=document.createElement('button');b.disabled=i>=saved.unlocked;b.textContent=(i>=saved.unlocked?'🔒 ':'')+'FASE 1-'+(i+1)+' — '+t.name+'\n⭐ '+(saved.bests[i]||0);b.onclick=()=>launch(i);list.append(b)})}
function chooseHero(i){hero=i;persist();document.querySelectorAll('.hero').forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));document.querySelectorAll('[data-pup]').forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));if(running)updateHud()}
$('levelsBtn').onclick=levelsPage;$('backLevels').onclick=()=>page('menu');$('start').onclick=()=>launch(0);$('pause').onclick=()=>pauseGame();
function pauseGame(){if(!running||overlay)return;paused=true;modal('⏸ Jogo pausado','Escolha como continuar.',[['▶ Continuar',()=>{paused=false;last=performance.now()}],['🔄 Reiniciar fase',()=>launch(stage)],['🐾 Trocar filhote',()=>{running=false;paused=false;page('menu')}],['🏠 Início',()=>{running=false;paused=false;page('menu')}]])}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown',' ','a','d','w','s','shift','e','escape','enter'].includes(k)){e.preventDefault();if(k==='escape'){if(running&&!overlay)pauseGame();else if(overlay&&paused){$('overlay').hidden=true;overlay=false;paused=false}}else held.add(k)}});window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();audioStart();held.add(key);b.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(key))});
function pad(){const p=navigator.getGamepads?.()?.find(q=>q&&q.connected);if(!p)return {x:0,j:false,p:false};return{x:(Math.abs(p.axes[0]||0)>.24?p.axes[0]:0)+(p.buttons[15]?.pressed?1:0)-(p.buttons[14]?.pressed?1:0),j:!!(p.buttons[0]?.pressed||p.buttons[12]?.pressed),p:!!(p.buttons[2]?.pressed||p.buttons[1]?.pressed)}}
function control(){const gp=pad(),k=(...a)=>a.some(v=>held.has(v));return{x:Math.max(-1,Math.min(1,gp.x+(k('right','arrowright','d')?1:0)-(k('left','arrowleft','a')?1:0))),jump:gp.j||k('jump',' ','w','arrowup','up'),power:gp.p||k('power','e'),run:k('shift'),down:k('arrowdown','s')}}
const R=(a,b)=>a+Math.random()*(b-a),overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function buildLevel(i){const len=3200+i*270,ground=453,holes=[],platforms=[],blocks=[],items=[],enemies=[],hazards=[],bridges=[];
for(let n=0;n<4+i;n++){const x=600+n*450+(n%2)*35;if(x<len-290)holes.push({x,w:96+(i>=3?12:0),water:i===0||i===5||i===4})}
for(let n=0;n<12+i*2;n++){const x=225+n*215,y=ground-110-(n%3)*48;platforms.push({x,y,w:132,h:18,moving:n%7===5,origin:y,phase:n*.6,breakable:n%9===7,broken:false});if(n%2===0)items.push({x:x+62,y:y-36,type:'coin',taken:false});if(n%4===1)items.push({x:x+105,y:y-34,type:'bone',taken:false})}
for(let n=0;n<5;n++){const p=platforms[n*2+1];items.push({x:p.x+65,y:p.y-47,type:'star',taken:false})}
for(let n=0;n<7+i;n++){const x=380+n*340;if(x<len-200){blocks.push({x,y:ground-160-(n%3)*34,w:48,h:45,type:n%4===2?'brick':'question',used:false,broken:false,prize:['speed','shield','jump','magnet','heart','coin'][n%6]});if(n%3===0)enemies.push({x:x+110,y:ground-35,w:45,h:34,base:x+80,range:130,dir:1,type:i===0?'crab':THEMES[i].enemy,alive:true,phase:n,vy:0})}}
for(let n=0;n<3+i;n++){const x=850+n*620;if(x<len-200)hazards.push({x,y:ground-27,w:58,h:27,type:i===2||i===5?'fire':'spikes'})}
if(i===0||i===4||i===5)for(const hole of holes)bridges.push({x:hole.x-15,y:ground-8,w:hole.w+30,h:11,rope:true});
if(i===5)enemies.push({x:len-340,y:ground-100,w:95,h:90,base:len-340,range:110,dir:-1,type:'boss',alive:true,hp:4,phase:0});
return {len,ground,holes,platforms,blocks,items,enemies,hazards,bridges,goal:{x:len-95,y:ground-95,w:70,h:95},checkpoint:{x:Math.floor(len*.52),active:false}}}
function launch(i){audioStart();stage=i;level=buildLevel(stage);player={x:65,y:level.ground-76,w:58,h:76,vx:0,vy:0,grounded:false,face:1,anim:0,lives:3,invuln:0,power:'',powerTime:0,ability:0,glide:0,coyote:0,jumpBuffer:0,doubleJump:false,score:0};score=0;coins=0;bones=0;stars=0;shield=0;cam=0;gameTime=240;checkpoint=65;particles=[];shake=0;gameOver=false;stageDone=false;running=true;paused=false;wasJump=false;wasPower=false;musicIndex=0;musicTick=0;page('play');updateHud();announce('🐾 '+THEMES[stage].name+' — Encontre 5 estrelas!',2200);last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function updateHud(){$('hudHero').textContent=HEROES[hero][0].toUpperCase();$('hudLives').textContent='❤️'.repeat(Math.max(0,player.lives));$('hudItems').textContent=`⭐ ${stars}/5 · 🦴 ${bones} · 🪙 ${coins} · 🛡️ ${shield}`;$('hudLevel').textContent='FASE 1-'+(stage+1)+' '+THEMES[stage].name;$('hudTime').textContent='⏱ '+Math.max(0,Math.ceil(gameTime))}
function sparks(x,y,color,count=12){for(let i=0;i<count;i++)particles.push({x,y,vx:R(-170,170),vy:R(-220,10),life:R(.25,.8),color,size:R(3,7)})}
function hurt(){if(player.invuln>0)return;if(shield){shield--;player.invuln=1.1;beep(650,.16);announce('🛡️ Escudo protegeu!');updateHud();return}player.lives--;player.invuln=1.8;shake=9;beep(155,.3,'sawtooth');sparks(player.x+30,player.y+30,'#ff7777');updateHud();if(player.lives<=0){running=false;gameOver=true;modal('💙 Tente novamente!','Você foi muito corajoso! Quer repetir esta fase?',[['🔄 Tentar de novo',()=>launch(stage)],['🏠 Menu',()=>page('menu')]])}else{player.x=checkpoint;player.y=level.ground-140;player.vx=0;player.vy=0;announce('Vamos tentar mais uma vez!')}}
function give(type){if(type==='heart')player.lives=Math.min(3,player.lives+1);else if(type==='shield')shield++;else if(type==='coin')coins+=5;else{player.power=type;player.powerTime=12}beep(900,.17);announce(({speed:'⚡ Supervelocidade!',shield:'🛡️ Escudo!',jump:'🚀 Superpulo!',magnet:'🧲 Ímã!',heart:'❤️ Vida extra!',coin:'🪙 +5 moedas!'})[type]||'Poder!');updateHud()}
function useAbility(dt,inp){player.ability=Math.max(0,player.ability-dt);if(hero===2&&inp.jump&&player.vy>0&&player.glide>0){player.vy=Math.min(player.vy,65);player.glide-=dt}if(hero===5&&level.holes.some(h=>h.water&&player.x+player.w/2>h.x&&player.x+player.w/2<h.x+h.w)&&player.y>level.ground-15){player.vy=Math.max(-110,player.vy-1400*dt)}if(inp.power&&!wasPower&&player.ability===0){player.ability=4;switch(hero){case 0:player.power='speed';player.powerTime=4;announce('⚡ Chase acelerou!');break;case 1:level.hazards.filter(h=>h.type==='fire'&&Math.abs(h.x-player.x)<220).forEach(h=>h.disabled=true);announce('💦 Marshall apagou o fogo!');break;case 2:player.glide=3;player.vy=-210;announce('🪽 Skye vai planar!');break;case 3:level.blocks.filter(b=>b.type==='brick'&&Math.abs(b.x-player.x)<150).forEach(b=>{b.broken=true;sparks(b.x,b.y,'#bd7e4a')});announce('🔨 Rubble quebrou os tijolos!');break;case 4:level.holes.filter(h=>Math.abs(h.x-player.x)<220).forEach(h=>level.bridges.push({x:h.x-5,y:level.ground-6,w:h.w+10,h:12,temp:7}));announce('🛠️ Rocky construiu uma ponte!');break;case 5:player.vy=-300;player.invuln=.8;announce('🌊 Zuma: impulso aquático!');break}beep(700,.12)}wasPower=inp.power}
function physics(dt){const inp=control(),p=player;useAbility(dt,inp);p.invuln=Math.max(0,p.invuln-dt);p.powerTime=Math.max(0,p.powerTime-dt);if(!p.powerTime)p.power='';p.glide=Math.max(0,p.glide-dt*.07);p.jumpBuffer=inp.jump&&!wasJump?.14:Math.max(0,p.jumpBuffer-dt);wasJump=inp.jump;
const speed=p.power==='speed'?400:inp.run?325:265,acc=p.grounded?1900:1250;p.vx+=Math.max(-acc*dt,Math.min(acc*dt,inp.x*speed-p.vx));if(Math.abs(inp.x)<.05)p.vx*=Math.max(0,1-7*dt);if(inp.x)p.face=inp.x>0?1:-1;p.anim+=Math.abs(p.vx)*dt/27;
p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);if(p.jumpBuffer>0&&(p.coyote>0||(p.power==='jump'&&!p.doubleJump))){p.vy=p.power==='jump'?-950:-820;p.grounded=false;if(p.coyote<=0)p.doubleJump=true;p.coyote=0;p.jumpBuffer=0;beep(480,.1);sparks(p.x+29,p.y+70,'#fff',6)}
if(!inp.jump&&p.vy< -130)p.vy+=420*dt;
const prevX=p.x,prevY=p.y,oldBottom=p.y+p.h;p.vy=Math.min(950,p.vy+1450*dt);p.x=Math.max(0,Math.min(level.len-p.w,p.x+p.vx*dt));p.y+=p.vy*dt;p.grounded=false;
const surfaces=[...level.platforms.filter(a=>!a.broken),...level.bridges];const center=p.x+p.w/2;
if(!level.holes.some(h=>center>h.x+4&&center<h.x+h.w-4))surfaces.push({x:0,y:level.ground,w:level.len,h:20});
for(const s of surfaces){if(p.x+p.w>s.x+7&&p.x<s.x+s.w-7&&oldBottom<=s.y+11&&p.y+p.h>=s.y&&p.vy>=0){p.y=s.y-p.h;p.vy=0;p.grounded=true;p.doubleJump=false;if(s.breakable){s.breakTimer=(s.breakTimer||0)+dt;if(s.breakTimer>.55){s.broken=true;sparks(s.x+50,s.y,'#d39a5d')}}}}
for(const b of level.blocks){if(b.broken)continue;const box={x:b.x,y:b.y,w:b.w,h:b.h};if(overlap(p,box)){if(prevY>=b.y+b.h-12&&p.vy<0){p.y=b.y+b.h;p.vy=80;if(b.type==='question'&&!b.used){b.used=true;give(b.prize);sparks(b.x+24,b.y,'#ffda33',18)}else if(b.type==='brick'&&hero===3){b.broken=true;sparks(b.x,b.y,'#c27e4a')}}else if(oldBottom<=b.y+16&&p.vy>=0){p.y=b.y-p.h;p.vy=0;p.grounded=true;p.doubleJump=false}else{p.x=prevX;p.vx=0}}}
if(p.y>H+130){hurt();if(gameOver)return}
for(const item of level.items){if(item.taken)continue;const distance=Math.hypot(center-item.x,p.y+p.h/2-item.y);if(p.power==='magnet'&&distance<185){item.x+=(center-item.x)*dt*5;item.y+=(p.y+p.h/2-item.y)*dt*5}if(distance<42){item.taken=true;if(item.type==='star')stars++;if(item.type==='coin')coins++;if(item.type==='bone')bones++;score+=item.type==='star'?100:20;beep(item.type==='star'?850:650,.09);sparks(item.x,item.y,'#ffda38',10);updateHud();if(stars===5)announce('⭐ 5 ESTRELAS! Vá até o resgate!',1900)}}
for(const h of level.hazards){if(h.disabled)continue;if(overlap(p,{x:h.x+8,y:h.y+5,w:h.w-16,h:h.h-5}))hurt()}
for(const e of level.enemies){if(!e.alive)continue;const d=center-(e.x+e.w/2);if(e.type==='bird'){e.y=level.ground-140+Math.sin(gameTime*2+e.phase)*42;e.x+=e.dir*65*dt}else if(e.type==='boss'){e.x+=e.dir*115*dt;e.y=level.ground-92+Math.sin(gameTime*3)*10}else{e.x+=e.dir*(Math.abs(d)<230?95:54)*dt;e.y=level.ground-e.h}if(Math.abs(e.x-e.base)>e.range)e.dir*=-1;if(e.x<20||e.x>level.len-e.w)e.dir*=-1;
if(overlap(p,e)){if(p.vy>90&&oldBottom<=e.y+23){p.vy=-350;sparks(e.x+20,e.y,'#ffe55d');beep(750,.14);if(e.type==='boss'){e.hp--;if(e.hp<=0){e.alive=false;announce('🏆 Chefe derrotado!',1700)}}else{e.alive=false;score+=80}}else hurt()}}
if(!level.checkpoint.active&&center>=level.checkpoint.x){level.checkpoint.active=true;checkpoint=level.checkpoint.x;beep(1000,.15);announce('🚩 Checkpoint salvo!')}
if(overlap(p,level.goal)&&stars>=5&&(stage!==5||!level.enemies.some(e=>e.type==='boss'&&e.alive))){finishStage();return}
for(const bridge of level.bridges)if(bridge.temp!==undefined)bridge.temp-=dt;level.bridges=level.bridges.filter(b=>b.temp===undefined||b.temp>0);
for(const platform of level.platforms)if(platform.moving&&!platform.broken)platform.y=platform.origin+Math.sin(gameTime*1.8+platform.phase)*25;
for(const particle of particles){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=300*dt;particle.life-=dt}particles=particles.filter(q=>q.life>0);if(p.grounded&&Math.abs(p.vx)>160&&Math.random()<.22)sparks(p.x+25,p.y+p.h,'#e7d6b1',2);
cam+=((Math.max(0,Math.min(level.len-W,p.x-W*.32+p.face*45)))-cam)*Math.min(1,dt*5);shake=Math.max(0,shake-dt*30);
}
function finishStage(){running=false;stageDone=true;const total=score+coins*10+bones*15+Math.ceil(gameTime);saved.bests[stage]=Math.max(saved.bests[stage]||0,total);saved.unlocked=Math.max(saved.unlocked,Math.min(6,stage+2));persist();beep(900,.28);modal(stage===5?'🏆 MISSÃO FINAL CUMPRIDA!':'🎉 FASE CONCLUÍDA!',`Estrelas: ${stars}/5 · Moedas: ${coins} · Ossos: ${bones} · Pontos: ${total}`,[...(stage<5?[['➡️ Próxima fase',()=>launch(stage+1)]]:[]),['🗺️ Fases',levelsPage],['🏠 Menu',()=>page('menu')]])}
function drawRect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}function round(x,y,w,h,r,c){g.fillStyle=c;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
function cloud(x,y,s){g.fillStyle='#fffbe9c9';for(const [a,b,r] of [[0,0,23],[23,-10,29],[51,0,22]]){g.beginPath();g.ellipse(x+a*s,y+b*s,r*s,r*.66*s,0,0,TAU);g.fill()}}

// Cenários desenhados em camadas independentes: nenhum recorte da imagem de interface.
function hill(x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill()}
function mountain(x,base,w,height,fill,snow=false){
 g.fillStyle=fill;g.beginPath();g.moveTo(x-w/2,base);g.lineTo(x,base-height);g.lineTo(x+w/2,base);g.closePath();g.fill();
 if(snow){g.fillStyle='#f6fdff';g.beginPath();g.moveTo(x,base-height);g.lineTo(x-w*.105,base-height*.76);g.lineTo(x-w*.02,base-height*.79);g.lineTo(x+w*.09,base-height*.72);g.closePath();g.fill()}
}
function tree(x,y,s=1,autumn=false){
 g.fillStyle='#83542c';g.fillRect(x-8*s,y-88*s,16*s,88*s);
 for(const [dx,dy,r] of [[0,-103,38],[-27,-86,29],[26,-91,31],[4,-132,27]]){
 hill(x+dx*s,y+dy*s,r*s,r*.8*s,autumn?'#d7824c':'#2b925d');
 hill(x+(dx-7)*s,y+(dy-9)*s,r*.62*s,r*.48*s,autumn?'#ffbc62':'#5dc47b');
 }
}
function tower(x,y,s=1){
 g.save();g.translate(x,y);g.scale(s,s);
 round(-26,-152,52,150,9,'#e5f3fc');round(-18,-142,36,133,5,'#7aa9d5');
 round(-56,-184,112,34,16,'#168fd5');round(-62,-193,124,17,9,'#ed4c79');
 round(-39,-175,78,19,6,'#39d0f4');round(-30,-146,60,30,9,'#124f96');
 g.fillStyle='#fff';g.font='25px system-ui';g.textAlign='center';g.fillText('🐾',0,-121);
 round(-39,-15,78,15,6,'#f9f9ff');g.restore();
}
function backdrop(t){
 const th=THEMES[stage],grad=g.createLinearGradient(0,0,0,H);
 grad.addColorStop(0,th.sky[0]);grad.addColorStop(1,th.sky[1]);drawRect(0,0,W,H,grad);
 if(stage!==2){hill(780,92,44,44,stage===5?'#ffc67b':'#fff2b0')}
 for(let i=0;i<9;i++){let x=((i*210-cam*.11)%(W+300)+W+300)%(W+300)-160;cloud(x,70+i%3*42,.65+i%3*.15)}
 // distant layer: moves much slower than the foreground
 for(let i=-1;i<7;i++){
  const x=i*245+95-cam*.14;
  if(stage===0||stage===3)mountain(x,403,325,205+(i%3)*42,stage===3?'#88b9d7':'#84b4ca',stage===3||i%2===0);
  else if(stage===2||stage===5)mountain(x,448,330,190+(i%3)*36,stage===2?'#393b69':'#704667');
  else hill(x,440,190,174,stage===1?'#4f9c7a':'#87b7bf');
 }
 if(stage===0){
  for(let i=-1;i<8;i++){const x=i*225+75-cam*.26;hill(x,425,145,128,'#6cbd91');hill(x-30,435,115,95,'#469f77')}
  tower(740-cam*.17,352,.88);
  // Waterfall and river are far behind collision platforms
  const wx=1140-cam*.24;round(wx,245,118,205,12,'#8de7f9');for(let k=0;k<6;k++)round(wx+9+k*18,247,7,201,3,'#d9fcff99');
  for(let i=-1;i<8;i++)tree(i*260+140-cam*.42,448,.65);
 }else if(stage===1){
  for(let i=-1;i<11;i++){const x=i*190+40-cam*.38;tree(x,459,.9+(i%3)*.15);hill(x+80,467,80,70,'#2e8666')}
 }else if(stage===2){
  for(let i=-1;i<14;i++){const x=i*135-cam*.26;mountain(x,460,160,190+(i%4)*26,'#5d517b');mountain(x+35,455,95,125,'#8b77a5')}
  for(let i=-1;i<12;i++){const x=i*150-cam*.48;mountain(x,475,95,80+(i%3)*24,'#a9d8e7')}
  hill(740-cam*.1,260,68,68,'#ffb064');
 }else if(stage===3){
  for(let i=-1;i<9;i++){const x=i*235-cam*.38;mountain(x,467,260,210+(i%3)*22,'#c4e5f5',true);tree(x+90,460,.72)}
 }else if(stage===4){
  for(let i=-1;i<14;i++){const x=i*120-cam*.34;const h=155+(i*43)%125;round(x,460-h,95,h,5,['#e3bdad','#a7c8dd','#ead6b0'][((i%3)+3)%3]);for(let row=0;row<3;row++)for(let col=0;col<2;col++)round(x+17+col*35,475-h+row*39,17,21,2,'#4d8ab5')}
 }else{
  for(let i=-1;i<11;i++){const x=i*170-cam*.33;const h=190+(i*41)%110;round(x,465-h,130,h,8,'#3c2d51');for(let row=0;row<3;row++)round(x+48,475-h+row*55,31,30,6,'#e68c58')}
  tower(775-cam*.12,350,.72);
 }
 // atmospheric fade for readable foreground
 const haze=g.createLinearGradient(0,280,0,470);haze.addColorStop(0,'#ffffff00');haze.addColorStop(1,stage===2?'#aaa0c229':'#d8f7ef35');
 drawRect(0,280,W,190,haze);
}
function texturedTile(){return false} // legacy cropped atlas textures deliberately disabled
function terrain(x,y,w,h,grass=true){
 if(w<=0||h<=0)return;
 const th=THEMES[stage];
 g.save();g.beginPath();g.rect(x,y-13,w,h+13);g.clip();
 const dirt=g.createLinearGradient(x,y,x,y+Math.max(80,h));
 dirt.addColorStop(0,stage===3?'#8fa8c4':stage===2?'#7a5c82':stage===5?'#70475c':'#bc793d');
 dirt.addColorStop(1,th.soil);drawRect(x,y,w,h,dirt);
 const left=Math.max(x,Math.floor((cam-110-x)/64)*64+x),right=Math.min(x+w,cam+W+130);
 // clean soil stones; tile-independent procedural details
 for(let xx=left;xx<right;xx+=64){
  for(let yy=y+21;yy<Math.min(y+h,H+70);yy+=49){
   const ix=Math.floor(xx/64),iy=Math.floor(yy/49);
   const seed=Math.abs((ix*37+iy*73+stage*17)%11);
   hill(xx+13+seed,yy+10,14,9,stage===3?'#d4e9f4':stage===2?'#5c456d':'#88502c');
   hill(xx+43,yy+31,9,6,stage===3?'#e5f5ff':stage===5?'#965c59':'#d49151');
  }
 }
 if(grass){
  const top=stage===3?'#f5ffff':stage===2?'#ba9dd0':stage===5?'#f2a766':'#75dd43';
  const shadow=stage===3?'#b9ddeb':stage===2?'#765b9b':stage===5?'#b95d42':'#348e37';
  drawRect(x,y-12,w,14,shadow);drawRect(x,y-14,w,10,top);
  for(let xx=left;xx<right;xx+=20){
   g.fillStyle=top;g.beginPath();g.moveTo(xx,y-5);g.lineTo(xx+10,y+9+(Math.abs(xx)%3)*2);g.lineTo(xx+20,y-5);g.fill();
   hill(xx+9,y-12,8,4,stage===3?'#ffffff':'#a4ef63');
  }
 }
 g.restore();
}
function drawBridge(b){
 // Independent wooden planks, never soil/grass
 for(let x=b.x;x<b.x+b.w;x+=27){
  round(x,b.y,Math.min(25,b.x+b.w-x),b.h+8,3,'#a86a37');
  drawRect(x+2,b.y+3,Math.min(21,b.x+b.w-x-3),3,'#d79a54');
 }
 if(b.rope){
  for(const edge of [b.y-27,b.y-5]){
   g.strokeStyle='#88522a';g.lineWidth=5;g.beginPath();g.moveTo(b.x,edge);
   g.quadraticCurveTo(b.x+b.w/2,edge+17,b.x+b.w,edge);g.stroke();
  }
  for(let x=b.x;x<=b.x+b.w;x+=42)round(x-3,b.y-28,6,35,3,'#87502a');
 }
}
function drawBlock(block){
 if(block.broken)return;
 const q=block.type==='question'&&!block.used;
 const grad=g.createLinearGradient(block.x,block.y,block.x,block.y+block.h);
 grad.addColorStop(0,q?'#ffe77a':'#c8793a');grad.addColorStop(1,q?'#ef9b0b':'#854220');
 round(block.x,block.y,block.w,block.h,5,grad);
 g.strokeStyle=q?'#a86b08':'#66351c';g.lineWidth=3;g.strokeRect(block.x+3,block.y+3,block.w-6,block.h-6);
 if(q){g.textAlign='center';g.font='bold 32px system-ui';g.fillStyle='#fff';g.fillText('?',block.x+block.w/2,block.y+33)}
 else {drawRect(block.x+5,block.y+22,block.w-10,3,'#60351d');drawRect(block.x+block.w/2,block.y+4,3,18,'#60351d')}
}
function drawWorld(t){const th=THEMES[stage];g.save();g.translate(-cam,0);let cursor=0;for(const hole of level.holes){terrain(cursor,level.ground,Math.max(0,hole.x-cursor),H-level.ground);cursor=hole.x+hole.w}terrain(cursor,level.ground,level.len-cursor,H-level.ground);for(const hole of level.holes){drawRect(hole.x,level.ground-8,hole.w,H-level.ground+8,th.sky[1]);if(hole.water){const wave=g.createLinearGradient(0,level.ground,0,H);wave.addColorStop(0,'#51d4ff');wave.addColorStop(1,'#0872c8');drawRect(hole.x,level.ground+13,hole.w,H-level.ground,wave);g.strokeStyle='#e5ffff';g.lineWidth=3;g.beginPath();for(let x=hole.x;x<hole.x+hole.w;x+=5)g.lineTo(x,level.ground+15+Math.sin(x*.09+t*.004)*3);g.stroke()}}for(const b of level.bridges)drawBridge(b);
for(const plat of level.platforms)if(!plat.broken){
 // Plataformas flutuantes finas: nunca viram grandes paredes de terra.
 const x=plat.x,y=plat.y,w=plat.w,h=plat.h;
 const body=g.createLinearGradient(x,y,x,y+h+9);body.addColorStop(0,stage===3?'#a5c6dc':'#bc824b');body.addColorStop(1,stage===3?'#7d9fb9':'#83512e');
 round(x,y,w,h+8,5,body);
 for(let j=0;j<w;j+=31){g.strokeStyle=stage===3?'#e6f7ff':'#78401f';g.lineWidth=2;g.beginPath();g.moveTo(x+j,y+8);g.lineTo(x+j+9,y+14);g.stroke()}
 round(x,y-9,w,12,5,stage===3?'#e9faff':stage===2?'#bca2d3':stage===5?'#e4a76d':'#45aa36');
 for(let j=0;j<w;j+=16){g.fillStyle=stage===3?'#ffffff':stage===2?'#cfb8e0':stage===5?'#ffc37d':'#72df4b';g.beginPath();g.moveTo(x+j,y-4);g.lineTo(x+j+8,y+8);g.lineTo(x+j+16,y-4);g.fill()}
}
for(const block of level.blocks)drawBlock(block);
for(const item of level.items)if(!item.taken){g.save();g.translate(item.x,item.y);const pulse=1+Math.sin(t*.007+item.x)*.08;g.scale(pulse,pulse);if(item.type==='coin'){g.fillStyle='#ffd336';g.strokeStyle='#b87514';g.lineWidth=3;g.beginPath();g.ellipse(0,0,15*Math.abs(Math.cos(t*.003+item.x))+.9,18,0,0,TAU);g.fill();g.stroke();g.font='bold 17px system-ui';g.fillStyle='#a96d14';g.textAlign='center';g.fillText('🐾',0,6)}else{g.font='32px system-ui';g.textAlign='center';g.fillText(item.type==='star'?'⭐':'🦴',0,11)}g.restore()}
for(const h of level.hazards)if(!h.disabled){g.textAlign='center';g.font='35px system-ui';g.fillText(h.type==='fire'?'🔥':'⚙️',h.x+26,h.y+27)}
for(const e of level.enemies)if(e.alive){g.textAlign='center';g.font=e.type==='boss'?'75px system-ui':'43px system-ui';g.fillText(({crab:'🦀',bird:'🕊️',chest:'👾',boss:'🐊'})[e.type],e.x+e.w/2,e.y+e.h);if(e.type==='boss'){round(e.x,e.y-15,e.w,7,3,'#a51c27');round(e.x,e.y-15,e.w*e.hp/4,7,3,'#75e65a')}}
const flag=level.checkpoint;g.fillStyle='#fff';drawRect(flag.x,level.ground-97,5,97,'#f2e7c2');g.fillStyle=flag.active?'#58ed6d':'#ff5757';g.beginPath();g.moveTo(flag.x+5,level.ground-97);g.lineTo(flag.x+56,level.ground-81);g.lineTo(flag.x+5,level.ground-64);g.fill();
const goal=level.goal;round(goal.x,goal.y,goal.w,goal.h,15,stars>=5?'#f6c73c':'#8295b0');round(goal.x+10,goal.y+12,goal.w-20,goal.h-20,12,stars>=5?'#8aebff':'#b3c8d8');g.textAlign='center';g.font='43px system-ui';g.fillText(stage===5?'🏆':'🐾',goal.x+35,goal.y+64);g.font='bold 16px system-ui';g.fillStyle='#fff';g.fillText(stars>=5?'RESGATE!':'5 ESTRELAS',goal.x+35,goal.y-14);
for(const pt of particles){g.globalAlpha=Math.min(1,pt.life*2);round(pt.x,pt.y,pt.size,pt.size,2,pt.color)}g.globalAlpha=1;
const p=player,frame=sprites[hero][p.grounded&&Math.abs(p.vx)>18?Math.floor(p.anim*2.0)%8:0];if(!(p.invuln>0&&Math.floor(t/85)%2)){g.save();g.translate(p.x+p.w/2,p.y+p.h);if(p.face<0)g.scale(-1,1);if(p.power==='speed'){g.fillStyle='#ffff7077';g.beginPath();g.ellipse(-30,-45,58,38,0,0,TAU);g.fill()}if(shield){g.strokeStyle='#9dffb4';g.lineWidth=5;g.beginPath();g.ellipse(0,-42,47,51,0,0,TAU);g.stroke()}if(frame.complete&&frame.naturalWidth)g.drawImage(frame,-50,-117+(p.grounded&&Math.abs(p.vx)>18?Math.sin(p.anim*2.1)*1.3:0),100,115);else{g.font='75px system-ui';g.fillText('🐕',-38,-10)}g.restore()}
g.restore()}
function render(t){g.save();if(shake)g.translate(R(-shake,shake),R(-shake,shake));backdrop(t);drawWorld(t);g.restore();if(paused){drawRect(0,0,W,H,'#081d4677');g.fillStyle='white';g.textAlign='center';g.font='bold 44px system-ui';g.fillText('PAUSADO',W/2,H/2)}if(performance.now()>toastUntil)$('toast').textContent=''}
function loop(t){if(!running)return;const dt=Math.min(.033,Math.max(0,(t-last)/1000));last=t;if(!paused&&!overlay){gameTime-=dt;tune(dt);physics(dt);if(gameTime<=0){gameTime=0;hurt();if(running)gameTime=120}updateHud()}render(t);if(running)raf=requestAnimationFrame(loop)}

/* Menu com controle USB/Bluetooth: analógico ou direcional escolhe filhote;
   botão Y (índice 3 no mapeamento padrão) começa a aventura. */
let menuPadPreviousDirection=0,menuPadPreviousY=false,menuPadNextMove=0;
function menuGamepad(t){
 const p=navigator.getGamepads?.()?.find(q=>q&&q.connected);
 if(!p){menuPadPreviousDirection=0;menuPadPreviousY=false;return}
 const menuVisible=!$('menu').hidden&&!running&&!overlay;
 if(!menuVisible){menuPadPreviousDirection=0;menuPadPreviousY=!!p.buttons[3]?.pressed;return}
 const axis=p.axes[0]||0;
 const direction=(axis>.55||p.buttons[15]?.pressed)?1:(axis<-.55||p.buttons[14]?.pressed)?-1:0;
 if(direction&&(direction!==menuPadPreviousDirection||t>=menuPadNextMove)){
   chooseHero((hero+direction+HEROES.length)%HEROES.length);
   menuPadNextMove=t+260;
   const selected=$('heroes').children[hero];
   selected?.focus({preventScroll:true});
 }
 if(!direction)menuPadNextMove=0;
 menuPadPreviousDirection=direction;
 const yPressed=!!p.buttons[3]?.pressed;
 if(yPressed&&!menuPadPreviousY){launch(0)}
 menuPadPreviousY=yPressed;
}
function menuLoop(t){menuGamepad(t);requestAnimationFrame(menuLoop)}
requestAnimationFrame(menuLoop);

page('menu');
})();
