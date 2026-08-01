import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./enhancements.css";
import "./premium.css";
export const metadata:Metadata={title:"DebtScope AI — National Debt Intelligence",description:"Authoritative U.S. national debt history, administration context, forecasts, and scenarios."};
const links=[["/overview","Overview"],["/history","History"],["/administrations","Administrations"],["/government-control","Government Control"],["/forecast","Forecast"],["/scenario","Scenario Lab"],["/methodology","Methodology"]];
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><header className="nav"><Link className="brand" href="/"><span>DS</span> DebtScope <b>AI</b></Link><nav>{links.map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</nav><Link className="navCta" href="/overview">Open terminal ↗</Link></header>{children}<footer><div className="brand"><span>DS</span> DebtScope AI</div><p>Independent fiscal intelligence built on official public data.</p><div><Link href="/methodology">Data & methodology</Link> · <Link href="/about">About & disclaimer</Link></div></footer></body></html>}
