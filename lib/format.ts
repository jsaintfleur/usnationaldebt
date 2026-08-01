export const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:2}).format(n);
export const pct=(n:number)=>`${n.toFixed(1)}%`;
