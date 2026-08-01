export type DebtPoint = { date: string; debt: number };
export type Administration = { president:string; party:"Democratic"|"Republican"; start:string; end:string; partial?:boolean };
export type AdminSummary = Administration & { startDebt:number; endDebt:number; increase:number; percent:number; cagr:number; daily:number };
