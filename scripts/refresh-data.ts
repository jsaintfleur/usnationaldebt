import fs from "node:fs/promises";import path from "node:path";
const root=process.cwd();async function get(url:string){const r=await fetch(url,{headers:{"User-Agent":"DebtScopeAI/1.0 research"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text()}
const latest="https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=5";
const fred="https://fred.stlouisfed.org/graph/fredgraph.csv?id=GFDEBTN";
await Promise.all([get(latest).then(x=>fs.writeFile(path.join(root,"data/debt-latest.json"),x)),get(fred).then(x=>fs.writeFile(path.join(root,"data/historical-debt.csv"),x))]);console.log("Official snapshots refreshed.");
