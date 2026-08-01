import fs from "node:fs";
import path from "node:path";

export type PricePoint={date:string;value:number};
export function cpiSeries():PricePoint[]{return fs.readFileSync(path.join(process.cwd(),"data/cpi.csv"),"utf8").trim().split("\n").slice(1).map(r=>{const [date,value]=r.split(",");return {date,value:Number(value)}}).filter(x=>Number.isFinite(x.value)&&x.value>0)}
export function priceAtOrPrior(date:string,series=cpiSeries()){const x=[...series].reverse().find(p=>p.date<=date);if(!x)throw new Error(`No CPI observation on or before ${date}`);return x}
export function realValue(nominal:number,date:string,baseYear=2026,series=cpiSeries()){const base=priceAtOrPrior(`${baseYear}-12-31`,series);const observed=priceAtOrPrior(date,series);return nominal*(base.value/observed.value)}
export function adjustSeries<T extends {date:string;debt:number}>(points:T[],baseYear=2026){const cpi=cpiSeries();return points.map(p=>({...p,debt:realValue(p.debt,p.date,baseYear,cpi)}))}
