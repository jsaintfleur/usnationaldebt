"use client";

import {useId,useState} from "react";

type Interval={low:number;high:number};
type Marker={index:number;label:string};
type Props={values:number[];labels?:string[];dark?:boolean;unit?:"USD"|"%";seriesLabel?:string;xLabel?:string;yLabel?:string;forecastStart?:number;intervals?:Interval[];markers?:Marker[];compact?:boolean};

const shortMoney=(v:number)=>v>=1e12?`$${(v/1e12).toFixed(v>=1e14?0:1)}T`:v>=1e9?`$${(v/1e9).toFixed(1)}B`:`$${v.toLocaleString()}`;
const fullValue=(v:number,unit:string)=>unit==="%"?`${v.toFixed(1)}%`:`$${(v/1e12).toFixed(2)} trillion`;

export default function LineChart({values,labels=values.map((_,i)=>String(i)),dark=false,unit="USD",seriesLabel="Total public debt",xLabel="Period",yLabel="USD, nominal",forecastStart,intervals,markers=[],compact=false}:Props){
  const uid=useId().replace(/:/g,"");
  const [active,setActive]=useState<number|null>(null);
  const w=720,h=compact?248:330,left=64,right=20,top=30,bottom=54;
  const lows=intervals?.map(x=>x.low)??[],highs=intervals?.map(x=>x.high)??[];
  const rawMin=Math.min(...values,...lows),rawMax=Math.max(...values,...highs),spread=Math.max(1,rawMax-rawMin);
  const min=Math.max(0,rawMin-spread*.08),max=rawMax+spread*.1,range=max-min;
  const x=(i:number)=>left+(values.length===1?0:i/(values.length-1))*(w-left-right);
  const y=(v:number)=>top+(max-v)/range*(h-top-bottom);
  const line=(from=0,to=values.length-1)=>values.slice(from,to+1).map((v,j)=>`${j?"L":"M"} ${x(from+j)} ${y(v)}`).join(" ");
  const yTicks=Array.from({length:5},(_,i)=>min+(range*i/4));
  const xTickIdx=Array.from(new Set([0,1,2,3,4].map(i=>Math.round(i*(values.length-1)/4))));
  const area=`${line()} L ${x(values.length-1)} ${h-bottom} L ${left} ${h-bottom} Z`;
  const band=intervals?`${intervals.map((d,i)=>`${i?"L":"M"} ${x(i)} ${y(d.high)}`).join(" ")} ${[...intervals].reverse().map((d,j)=>`L ${x(intervals.length-1-j)} ${y(d.low)}`).join(" ")} Z`:"";
  const ai=active??values.length-1;
  return <div className={`intelChart ${dark?"dark":""} ${compact?"compact":""}`}>
    <div className="chartLegend"><span><i className="legendLine observedLine"/>{seriesLabel}</span>{forecastStart!==undefined&&<span><i className="legendLine forecastLine"/>Model estimate</span>}{intervals&&<span><i className="legendBand"/>90% interval</span>}</div>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${seriesLabel} over ${xLabel.toLowerCase()}, measured in ${yLabel}`} onMouseLeave={()=>setActive(null)}>
      <defs><linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#347fec" stopOpacity=".22"/><stop offset="1" stopColor="#347fec" stopOpacity="0"/></linearGradient><pattern id={`forecast-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill={dark?"#6e56cf18":"#7057e810"}/><line x1="0" y1="0" x2="0" y2="8" stroke="#8d78ef" strokeWidth="2"/></pattern></defs>
      {forecastStart!==undefined&&<rect x={x(forecastStart)} y={top} width={w-right-x(forecastStart)} height={h-top-bottom} fill={`url(#forecast-${uid})`}/>} 
      {yTicks.map((v,i)=><g key={i}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} className="chartGrid"/><text x={left-10} y={y(v)+4} textAnchor="end" className="axisTick">{unit==="USD"?shortMoney(v):`${v.toFixed(0)}%`}</text></g>)}
      {xTickIdx.map(i=><g key={i}><line x1={x(i)} x2={x(i)} y1={h-bottom} y2={h-bottom+5} className="axisLine"/><text x={x(i)} y={h-bottom+20} textAnchor={i===0?"start":i===values.length-1?"end":"middle"} className="axisTick">{labels[i]}</text></g>)}
      <line x1={left} x2={w-right} y1={h-bottom} y2={h-bottom} className="axisLine"/><line x1={left} x2={left} y1={top} y2={h-bottom} className="axisLine"/>
      <text x={(left+w-right)/2} y={h-5} textAnchor="middle" className="axisTitle">{xLabel}</text><text transform={`translate(15 ${(top+h-bottom)/2}) rotate(-90)`} textAnchor="middle" className="axisTitle">{yLabel}</text>
      {band&&<path d={band} className="confidenceBand"/>}<path d={area} fill={`url(#fill-${uid})`}/>
      {forecastStart===undefined?<path d={line()} className="observedPath"/>:<><path d={line(0,forecastStart)} className="observedPath"/><path d={line(forecastStart)} className="modelPath"/></>}
      {markers.filter(m=>m.index>=0&&m.index<values.length).map(m=><g key={`${m.index}-${m.label}`}><line x1={x(m.index)} x2={x(m.index)} y1={top} y2={h-bottom} className="eventLine"/><text x={x(m.index)+5} y={top+11} className="eventLabel">{m.label}</text></g>)}
      {values.map((_,i)=><rect key={i} x={Math.max(left,x(i)-(w-left-right)/values.length/2)} y={top} width={Math.max(8,(w-left-right)/values.length)} height={h-top-bottom} fill="transparent" onMouseEnter={()=>setActive(i)} tabIndex={0} onFocus={()=>setActive(i)} aria-label={`${labels[i]}: ${fullValue(values[i],unit)}`}/>)}
      <line x1={x(ai)} x2={x(ai)} y1={top} y2={h-bottom} className="crosshair"/><circle cx={x(ai)} cy={y(values[ai])} r="5" className="activePoint"/>
      <g className="svgTooltip" transform={`translate(${Math.min(w-174,Math.max(left+8,x(ai)+10))} ${Math.max(top+6,y(values[ai])-54)})`}><rect width="156" height="45" rx="6"/><text x="10" y="17" className="tooltipDate">{labels[ai]}</text><text x="10" y="35" className="tooltipValue">{fullValue(values[ai],unit)}</text></g>
    </svg>
    <div className="chartFoot"><span>Source: U.S. Treasury Fiscal Data / FRED</span><span>Hover or focus to inspect</span></div>
  </div>;
}
