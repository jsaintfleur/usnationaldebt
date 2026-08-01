import fs from "node:fs";
import path from "node:path";
import type { Administration, AdminSummary, DebtPoint } from "./types";

const csvPath = path.join(process.cwd(), "data/historical-debt.csv");
const latestPath = path.join(process.cwd(), "data/debt-latest.json");

export function history(): DebtPoint[] {
  return fs.readFileSync(csvPath,"utf8").trim().split("\n").slice(1).map(line=>{const [date,value]=line.split(","); return {date,debt:Number(value)*1e6}}).filter(x=>Number.isFinite(x.debt));
}
export function latest() {
  const raw=JSON.parse(fs.readFileSync(latestPath,"utf8")); const x=raw.data[0];
  return {date:x.record_date,total:Number(x.tot_pub_debt_out_amt),publicDebt:Number(x.debt_held_public_amt),intragov:Number(x.intragov_hold_amt),source:"U.S. Treasury Fiscal Data — Debt to the Penny"};
}
export const administrations: Administration[] = [
 {president:"Lyndon B. Johnson",party:"Democratic",start:"1963-11-22",end:"1969-01-20"},{president:"Richard Nixon",party:"Republican",start:"1969-01-20",end:"1974-08-09"},{president:"Gerald Ford",party:"Republican",start:"1974-08-09",end:"1977-01-20"},{president:"Jimmy Carter",party:"Democratic",start:"1977-01-20",end:"1981-01-20"},{president:"Ronald Reagan",party:"Republican",start:"1981-01-20",end:"1989-01-20"},{president:"George H. W. Bush",party:"Republican",start:"1989-01-20",end:"1993-01-20"},{president:"Bill Clinton",party:"Democratic",start:"1993-01-20",end:"2001-01-20"},{president:"George W. Bush",party:"Republican",start:"2001-01-20",end:"2009-01-20"},{president:"Barack Obama",party:"Democratic",start:"2009-01-20",end:"2017-01-20"},{president:"Donald Trump (I)",party:"Republican",start:"2017-01-20",end:"2021-01-20"},{president:"Joe Biden",party:"Democratic",start:"2021-01-20",end:"2025-01-20"},{president:"Donald Trump (II)",party:"Republican",start:"2025-01-20",end:new Date().toISOString().slice(0,10),partial:true}
];
export function nearestPrior(points:DebtPoint[],date:string){return [...points].reverse().find(p=>p.date<=date) ?? points[0]}
export function summarize(points=history()):AdminSummary[]{return administrations.map(a=>{const s=nearestPrior(points,a.start),e=nearestPrior(points,a.end),days=Math.max(1,(Date.parse(a.end)-Date.parse(a.start))/86400000),years=days/365.2425,increase=e.debt-s.debt;return {...a,startDebt:s.debt,endDebt:e.debt,increase,percent:increase/s.debt*100,cagr:(Math.pow(e.debt/s.debt,1/years)-1)*100,daily:increase/days}})}
export function forecast(points=history(),years=20){const end=points.at(-1)!;const recent=points.filter(p=>Date.parse(p.date)>=Date.parse(end.date)-10*365.25*86400000);const cagr=Math.pow(end.debt/recent[0].debt,1/10)-1;return Array.from({length:years+1},(_,i)=>({year:Number(end.date.slice(0,4))+i,value:end.debt*Math.pow(1+cagr,i),low:end.debt*Math.pow(1+Math.max(0,cagr-.018),i),high:end.debt*Math.pow(1+cagr+.018,i),kind:i?"model":"observed"}));}
