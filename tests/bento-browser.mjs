// UI fixtures are intercepted only inside these isolated browser pages.
// Nothing is inserted into the application's database or Firebase.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
const item={id:'ui-item',restaurant:'ui-place',restaurant_name:'UI TEST Quán',name:'UI TEST Món ăn',category:'Cơm',meal:'Trưa',photos:['ui-photo'],front:'ui-photo',price:35000,total:35000,unit:'phan',price_date:'2026-11-08',rating:4.5,review_count:2,address:'Địa chỉ chỉ dùng kiểm thử giao diện',city:'Test City',district:'Test District',lat:21.0285,lng:105.8542,hours:'24/7',distance:1.2};
async function fixture(page){let saved=false;await page.route('**/api/state?*',route=>route.fulfill({json:{authProvider:'sites',user:{id:'ui-test',name:'UI Test',admin:false},items:[item],total:1,page:1,hasMore:false,eligibleTypes:10,unlocked:true,cities:[],saved:saved?[{kind:'dish',target:item.id}]:[]}}));await page.route('**/api/photo/ui-photo',route=>route.fulfill({contentType:'image/jpeg',body:readFileSync('public/images/pho.jpg')}));await page.route('**/api/save',route=>{saved=!saved;return route.fulfill({json:{saved}})});await page.route('**/api/random?*',route=>route.fulfill({json:{item,count:1}}));}
async function filterAction(page,action){const response=page.waitForResponse(r=>r.url().includes('/api/state?'));await action();await response;await page.locator('.food-card').waitFor()}
const summary=[];
try{
 for(const [name,width] of [['desktop',1440],['tablet',820],['phone',390],['small-phone',320]]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<=600,isMobile:width<=600}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);await page.goto('http://localhost:3000/');await page.locator('.food-choice').first().waitFor();assert.equal(await page.locator('.food-choice').count(),12);
  await page.getByRole('button',{name:'Xem thêm 11 lựa chọn',exact:true}).click();assert.equal(await page.locator('.food-choice').count(),23);
  await filterAction(page,()=>page.locator('.food-choice[data-food=coffee]').click());assert.equal(await page.locator('.food-choice[data-food=coffee]').getAttribute('aria-pressed'),'true');
  const family=page.getByRole('tab',{name:/Tất cả/});await family.focus();await filterAction(page,()=>page.keyboard.press('ArrowRight'));await page.waitForFunction(()=>document.querySelector('#food-family-meal')?.getAttribute('aria-selected')==='true');assert.equal(await page.locator('.food-choice').count(),10);
  await filterAction(page,()=>page.getByRole('tab',{name:/Tất cả/}).click());await page.locator('.food-card').waitFor();assert.match(await page.locator('.card-photo-price').innerText(),/35\.000đ/);assert.equal(await page.locator('.card-distance').innerText(),'1.2 km');assert.match(await page.locator('.opening-badge').innerText(),/Đang mở cửa/);
  const heart=page.getByRole('button',{name:'Lưu món',exact:true});await heart.click();await page.getByRole('button',{name:'Bỏ lưu món',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Bỏ lưu món',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('.food-card').scrollIntoViewIfNeeded();assert.equal(await page.locator('.site-header').evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);await page.getByRole('button',{name:'Chọn quán ngẫu nhiên',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.locator('.discovery-panel').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.discovery-panel').screenshot({path:'outputs/bento-'+name+'-discovery.png'});await page.locator('.food-card').screenshot({path:'outputs/bento-'+name+'-card.png'});
  if(name==='desktop'){
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'outputs/bento-desktop-hero.png'});
   const measurement=page.evaluate(()=>new Promise(resolve=>{const times=[];function next(t){times.push(t);if(times.length===61){const elapsed=times.at(-1)-times[0];resolve({frames:60,fps:Math.round(60000/elapsed)})}else requestAnimationFrame(next)}requestAnimationFrame(next)}));await page.locator('.food-card').hover();const frame=await measurement;summary.push({viewport:name,...frame});
   await page.getByRole('button',{name:'Xem bản đồ',exact:true}).click();await page.locator('.leaflet-marker-icon[title="UI TEST Quán"]').click();await page.locator('.map-popup-card').waitFor();assert.equal(await page.locator('.map-popup-photo').getAttribute('alt'),'Mặt tiền UI TEST Quán');assert.equal(await page.getByRole('button',{name:'Xem chi tiết',exact:true}).count(),1);await page.locator('.map-canvas').screenshot({path:'outputs/bento-map-popup.png'});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await fixture(reduced);await reduced.goto('http://localhost:3000/');await reduced.locator('.opening-badge i').waitFor();assert.equal(await reduced.locator('.opening-badge i').evaluate(e=>getComputedStyle(e).animationName),'none');await reduced.getByRole('button',{name:'Chọn quán ngẫu nhiên',exact:true}).click();await reduced.getByRole('dialog').waitFor();assert.equal(await reduced.locator('.dialog').evaluate(e=>getComputedStyle(e).animationName),'none');await reduced.close();
 console.log('PASS: 23 facets, pastel families, keyboard tabs, selections, price/distance badges, save state, sticky random shortcut, modal animation, reduced motion, Leaflet photo popup and 320/390/820/1440px layouts.');console.log(JSON.stringify({sampledCardInteractionFrames:summary}));
}finally{await browser.close()}
