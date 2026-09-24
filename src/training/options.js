// Complexity ordering, not a claim about real-world popularity.
export const optionRank=s=>(s.bank?30:s.pocket!==undefined?20:0)+(Math.abs(s.tip.x)>.1?10:0)+Math.hypot(s.tip.x,s.tip.y);
export const orderOptions=options=>[...options].sort((a,b)=>optionRank(a)-optionRank(b));
export const optionLevel=(s,i)=>i===0?'Tập sự · thử trước':optionRank(s)>=10?'Nâng cao':'Luyện thêm';
