// Discovery facets are not approved food types and never unlock the random gate.
import {canonical} from './security';
export const FOOD_GROUPS=[{id:'all',label:'Tất cả',hint:'Một chút phân vân cũng không sao',icon:'✳'},{id:'meal',label:'Bữa no',hint:'Cho một bữa thật chắc bụng',icon:'🍽️'},{id:'snack',label:'Ăn chơi',hint:'Nhâm nhi một chút cho vui',icon:'🥟'},{id:'drink',label:'Uống gì?',hint:'Một ly cho ngày dễ chịu',icon:'🥤'},{id:'vegan',label:'Ăn chay',hint:'Nhẹ nhàng mà vẫn ngon',icon:'🥬'}];
export const FOOD_CHOICES=[
 {id:'rice',label:'Cơm',icon:'🍚',group:'meal',note:'Cơm tấm, cơm phần',categories:['Cơm']},
 {id:'pho',label:'Phở',icon:'🍜',group:'meal',note:'Một tô nóng hổi',categories:['Phở'],legacy:'Bún / Phở',terms:['pho']},
 {id:'bun',label:'Bún',icon:'🥢',group:'meal',note:'Nước, trộn hay chả',categories:['Bún'],legacy:'Bún / Phở',terms:['bun']},
 {id:'noodles',label:'Mì / Hủ tiếu',icon:'🍲',group:'meal',note:'Đổi vị một bữa',categories:['Mì / Hủ tiếu'],legacy:'Bún / Phở',terms:['mi','hu tieu']},
 {id:'bread',label:'Bánh mì',icon:'🥖',group:'meal',note:'Gọn mà đủ đầy',categories:['Bánh mì']},
 {id:'sticky',label:'Xôi',icon:'🍙',group:'meal',note:'Dẻo thơm, chắc bụng',categories:['Xôi']},
 {id:'soup',label:'Cháo / Súp',icon:'🥣',group:'meal',note:'Ấm bụng, dễ ăn',categories:['Cháo / Súp']},
 {id:'hotpot',label:'Lẩu',icon:'🫕',group:'meal',note:'Rủ thêm người nhé',categories:['Lẩu']},
 {id:'grill',label:'Đồ nướng',icon:'🔥',group:'meal',note:'Thơm từ xa',categories:['Đồ nướng']},
 {id:'pizza',label:'Pizza / Burger',icon:'🍕',group:'meal',note:'Một bữa khác thường',categories:['Pizza / Burger']},
 {id:'snacks',label:'Ăn vặt',icon:'🥟',group:'snack',note:'Đủ thứ để nhâm nhi',categories:['Ăn vặt']},
 {id:'ricepaper',label:'Bánh tráng',icon:'🫓',group:'snack',note:'Trộn, cuốn, nướng',categories:['Bánh tráng'],legacy:'Ăn vặt',terms:['banh trang']},
 {id:'fried',label:'Xiên / Đồ chiên',icon:'🍢',group:'snack',note:'Giòn giòn, vui miệng',categories:['Xiên / Đồ chiên'],legacy:'Ăn vặt',terms:['xien','chien']},
 {id:'snails',label:'Ốc / Hải sản',icon:'🦪',group:'snack',note:'Một buổi tụ tập',categories:['Ốc / Hải sản'],legacy:'Ăn vặt',terms:['oc','hai san']},
 {id:'cakes',label:'Bánh ngọt',icon:'🍰',group:'snack',note:'Thêm chút ngọt ngào',categories:['Bánh ngọt'],legacy:'Ăn vặt',terms:['banh ngot','banh kem']},
 {id:'dessert',label:'Chè / Kem',icon:'🍨',group:'snack',note:'Mát một chút thôi',categories:['Chè / Kem'],legacy:'Ăn vặt',terms:['che','kem']},
 {id:'coffee',label:'Cà phê',icon:'☕',group:'drink',note:'Chậm lại một nhịp',categories:['Cà phê'],legacy:'Đồ uống',terms:['ca phe','coffee','cafe']},
 {id:'milktea',label:'Trà sữa',icon:'🧋',group:'drink',note:'Ngọt theo ý bạn',categories:['Trà sữa'],legacy:'Đồ uống',terms:['tra sua']},
 {id:'tea',label:'Trà',icon:'🍵',group:'drink',note:'Thanh và thơm',categories:['Trà'],legacy:'Đồ uống',terms:['tra'],exclude:['tra sua']},
 {id:'juice',label:'Nước ép',icon:'🧃',group:'drink',note:'Một chút tươi mát',categories:['Nước ép'],legacy:'Đồ uống',terms:['nuoc ep','juice']},
 {id:'smoothie',label:'Sinh tố',icon:'🥑',group:'drink',note:'Trái cây trong ly',categories:['Sinh tố'],legacy:'Đồ uống',terms:['sinh to','smoothie']},
 {id:'drinks',label:'Đồ uống khác',icon:'🥤',group:'drink',note:'Tìm một ly hợp vị',categories:['Đồ uống']},
 {id:'vegan',label:'Món chay',icon:'🥬',group:'vegan',note:'Xanh lành, nhẹ bụng',categories:['Món chay']},
];
export const POPULAR_FOODS=['rice','pho','bun','noodles','bread','hotpot','grill','snacks','coffee','milktea','dessert','vegan'];
export const POST_CATEGORIES=[...new Set([...FOOD_CHOICES.flatMap(c=>c.categories),'Bún / Phở','Khác'])];
export function matchesFood(item:{category:string,name:string,type_name:string,vegetarian?:number},id:string){const c=FOOD_CHOICES.find(c=>c.id===id);if(!c)return false;if(id==='vegan'&&item.vegetarian===1)return true;if(c.categories.includes(item.category))return true;if(item.category===c.legacy){const content=' '+canonical(item.name+' '+item.type_name)+' ';return !!c.terms?.some(t=>content.includes(' '+t+' '))&&!c.exclude?.some(t=>content.includes(' '+t+' '))}return false}
export function matchesDiscovery(item:Parameters<typeof matchesFood>[0],selected:string[],family:string|null){const valid=selected.filter(id=>FOOD_CHOICES.some(c=>c.id===id));if(selected.length&&!valid.length)return false;if(valid.length)return valid.some(id=>matchesFood(item,id));if(family&&family!=='all'){const options=FOOD_CHOICES.filter(c=>c.group===family);return options.some(c=>matchesFood(item,c.id))}return true}
