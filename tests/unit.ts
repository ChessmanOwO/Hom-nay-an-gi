import assert from 'node:assert/strict';
import {getAdminRole,canAdminAction} from '../lib/admin-role';
import {paginate,pageOptions} from '../lib/pagination';
import {openingStatus,isOpenNow} from '../lib/opening-hours';
import {directionsUrl} from '../lib/directions';
import {extractMapsCoords,isShortGoogleMapsUrl} from '../lib/maps';

const cfg={ADMIN_EMAILS:' Owner@Example.test , ',MODERATOR_EMAILS:'mod@example.test, owner@example.test'};
assert.equal(getAdminRole(null,cfg),null);assert.equal(getAdminRole({email:' OWNER@example.test '},cfg),'superadmin');assert.equal(getAdminRole({email:'MOD@example.test'},cfg),'moderator');assert.equal(getAdminRole({email:'other@example.test'},cfg),null);
for(const a of ['approve','hide','resolve'])assert(canAdminAction('moderator',a));for(const a of ['type','restaurant','mergeType','mergeRestaurant','backup'])assert(!canAdminAction('moderator',a));assert(!canAdminAction(null,'approve'));assert(!canAdminAction('superadmin','invented'));
assert.equal(pageOptions(new URLSearchParams('limit=0')).limit,1);assert.equal(pageOptions(new URLSearchParams('limit=-8')).limit,1);
const rows=Array.from({length:53},(_,i)=>i);assert.deepEqual(paginate(rows,new URLSearchParams()).items,rows.slice(0,24));assert.equal(paginate(rows,new URLSearchParams('page=3')).items.length,5);assert.equal(paginate(rows,new URLSearchParams('page=3')).hasMore,false);assert.equal(paginate(rows,new URLSearchParams('page=2')).hasMore,true);assert.equal(paginate(rows,new URLSearchParams('page=999')).items.length,0);assert.equal(pageOptions(new URLSearchParams('limit=999')).limit,50);for(const x of ['NaN','Infinity','-1','0',''])assert(Number.isFinite(pageOptions(new URLSearchParams('page='+x+'&limit='+x)).offset));
const local=(h:string)=>new Date('2026-11-07T'+h+':00+07:00');assert(isOpenNow('07:00–14:00',local('07:00')));assert(!isOpenNow('07:00–14:00',local('14:00')));assert(isOpenNow('22:00-02:00',local('23:00')));assert(isOpenNow('22:00-02:00',local('01:00')));assert(!isOpenNow('22:00-02:00',local('12:00')));assert(isOpenNow('07:00-14:00; 17:00-22:00',local('19:00')));assert.equal(openingStatus('07:00-14:00 thứ hai',local('10:00')),'unknown');assert.equal(openingStatus('25:00-26:00',local('10:00')),'unknown');assert.equal(openingStatus('',local('10:00')),'unknown');assert(isOpenNow('24/7',local('04:00')));
const url=new URL(directionsUrl({lat:21,lng:105},{lat:20,lng:104}));assert.equal(url.searchParams.get('travelmode'),'two-wheeler');assert.equal(url.searchParams.get('origin'),'20,104');assert.equal(new URL(directionsUrl({lat:21,lng:105},null,'walking')).searchParams.get('travelmode'),'walking');

// Tests for Google Maps extraction & URL parsing
assert(isShortGoogleMapsUrl('https://maps.app.goo.gl/abcdef'));
assert(isShortGoogleMapsUrl('https://goo.gl/maps/123456'));
assert(!isShortGoogleMapsUrl('https://www.google.com/maps/place/Pho+Thin'));

const p1 = extractMapsCoords('21.028511, 105.854167');
assert(p1 && Math.abs(p1.lat - 21.028511) < 1e-5 && Math.abs(p1.lng - 105.854167) < 1e-5);

const p2 = extractMapsCoords('https://www.google.com/maps/place/Ph%E1%BB%9F+Th%C3%ACn/@21.0189332,105.8542018,17z/data=...');
assert(p2 && Math.abs(p2.lat - 21.0189332) < 1e-5 && p2.name === 'Phở Thìn');

const p3 = extractMapsCoords('https://www.google.com/maps/search/?api=1&query=21.033333,105.850000');
assert(p3 && Math.abs(p3.lat - 21.033333) < 1e-5);

const p4 = extractMapsCoords('https://www.google.com/maps/place/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d21.022222!4d105.844444');
assert(p4 && Math.abs(p4.lat - 21.022222) < 1e-5 && Math.abs(p4.lng - 105.844444) < 1e-5);

console.log('PASS: role precedence and deny-by-default; pagination bounds and end pages; Vietnam opening times/overnight/unknown; official motorcycle deep link; google maps coord extraction.');
