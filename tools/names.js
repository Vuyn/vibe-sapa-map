// Name clean-up shared by parse-osm.js (streets) and parse-osm2.js (shops).
// OpenStreetMap names around Sa Pa are typed by many hands: some have no accents, some are all lower or upper case,
// and some shop "names" are really visitor notes with prices. Only fixes that are certain are made here.
// Road names are also matched by the page (treks, the pass road, the valley road) after accents are stripped,
// so a fix must never change the unaccented words those rules look for.
const STREETS={
 'pho pham ngoc thach':'Phố Phạm Ngọc Thạch',
 'Sapa - Hang Da':'Đường Sa Pa - Hang Đá',
 'Cat Cat Road':'Đường Cát Cát','Cát Cát':'Đường Cát Cát',
 'Ta Van':'Đường Tả Van','Tả Van':'Đường Tả Van','Road to Ta Van':'Đường Tả Van',
 'Tuệ Tĩnh':'Phố Tuệ Tĩnh',
 'Đường Fan Si Pan':'Đường Fansipan',
 'Đường Ô Quý Hồ':'Đường Ô Quy Hồ',
 'Đường đi Má Cha':'Đường Má Cha','Đường bộ đến Má Cha':'Đường Má Cha','Đường đi Má Cha, nối đến đường đi Tả Phìn':'Đường Má Cha',
 'Quốc lộ 4D, TTSa Pa, Lào Cai':'Quốc lộ 4D','Quốc lộ 4D, Trung Chải':'Quốc lộ 4D','Quốc lộ 4D, Sơn Bình':'Quốc lộ 4D',
 'Ham Rong trail':'Đường mòn Hàm Rồng',
 'Cầu Treo Lao Chải San II':'Cầu treo Lao Chải San II',
 'Đường bộ đi Đội 1 Thôn Sả Xéng, xã Tả Phìn':'Đường Sả Xéng',
};
const cleanStreet=n=>{n=(n||'').trim();return STREETS[n]||n;};

// shop "names" that are notes, prices or complaints: the shop keeps its icon and kind, without a name
const JUNK=/\d+\s?k\b|\bvnd\b|\d+\s?dong\b|\d{2,3}[ .]?000|ripped|bad motorbike|, cheap|overnight\.|marzec|pujceni|con phong nghi|ein thoai|^6 ng\.|^\d+$|^er$|^mechanic$|stan smith|thuyen truong|turning in|kebsik|place overnight/i;
// accents restored where the words are unmistakable
const ACCENTS=[
 [/nha hang chay/i,'Nhà hàng chay'],[/nhà hãng hãn quốc/i,'Nhà hàng Hàn Quốc'],[/\bnha hang\b/i,'Nhà hàng'],
 [/sua xe dinh nghia/i,'Sửa xe Đình Nghĩa'],[/\bsua xe\b/i,'Sửa xe'],[/^dinh nghia$/i,'Đình Nghĩa'],
 [/\bbanh mi\b/i,'Bánh mì'],[/\bbanh my\b/i,'Bánh mỳ'],[/^pho bo$/i,'Phở bò'],[/^pho, bun, com$/i,'Phở, bún, cơm'],
 [/pho ly quoc su/i,'Phở Lý Quốc Sư'],[/tiêm pho ngon/i,'Tiệm Phở Ngon'],[/^phô minh$/i,'Phở Minh'],
 [/\bbia hoi\b/i,'Bia hơi'],[/am thuc bình dan/i,'Ẩm thực bình dân'],[/mua sam tong hop/i,'Mua sắm tổng hợp'],
 [/quan gio/i,'Quán Gió'],[/thang co a quynh/i,'Thắng cố A Quỳnh'],[/ca phê bao câ/i,'Cà Phê Bao Cấp'],
 [/xuân trúong/i,'Xuân Trường'],[/^cau mây$/i,'Cầu Mây'],[/ven dô/i,'Ven Đô'],[/bao yen bakery/i,'Bảo Yến Bakery'],
 [/\blaundy\b/i,'Laundry'],[/homesray/i,'Homestay'],[/home stay/i,'Homestay'],[/\bcoffe\b/i,'Coffee'],[/little viet nam/i,'Little Vietnam'],
];
const KEEP_UPPER=/^(BIDV|ATM|MB|HK|TV|KAFA|TOM|BBQ|GH|LINKE|II|S88|X6)$/;
const titleWord=w=>KEEP_UPPER.test(w.toUpperCase())&&w===w.toUpperCase()?w:w.charAt(0).toLocaleUpperCase('vi')+w.slice(1).toLocaleLowerCase('vi');
function cleanShop(n){
 n=(n||'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').replace(/[.,;:!]+$/,'').trim();
 if(!n||JUNK.test(n))return '';
 for(const [re,to] of ACCENTS)n=n.replace(re,to);
 const letters=n.replace(/[^\p{L}]/gu,'');
 // all lower case, or a long name shouted in capitals: give each word a capital instead
 if(letters&&(n===n.toLocaleLowerCase('vi')||(n===n.toLocaleUpperCase('vi')&&letters.length>6)))n=n.split(' ').map(titleWord).join(' ');
 else n=n.charAt(0).toLocaleUpperCase('vi')+n.slice(1);
 return n;
}
module.exports={cleanStreet,cleanShop};
