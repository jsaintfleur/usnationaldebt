"use client";

import { useId, useMemo, useState } from "react";
import { availableResolutions, computeChartStats, observationsInTrailingYears, resampleObservations, type ChartResolution } from "@/lib/chart-stats";

type Interval = { low: number; high: number };
type Marker = { index: number; label: string };
type Props = { values:number[]; labels?:string[]; dates?:string[]; realValues?:Array<number|undefined>; dark?:boolean; unit?:"USD"|"%"; seriesLabel?:string; xLabel?:string; yLabel?:string; forecastStart?:number; intervals?:Interval[]; markers?:Marker[]; compact?:boolean; intervalControls?:boolean };
type RangePreset = 1 | 5 | 10 | 25 | 50 | 100 | null;

const shortMoney=(v:number)=>Math.abs(v)>=1e12?`${v<0?"-":""}$${(Math.abs(v)/1e12).toFixed(Math.abs(v)>=1e14?0:1)}T`:Math.abs(v)>=1e9?`${v<0?"-":""}$${(Math.abs(v)/1e9).toFixed(1)}B`:`${v<0?"-":""}$${Math.abs(v).toLocaleString()}`;
const fullValue=(v:number,unit:string)=>unit==="%"?`${v.toFixed(1)}%`:`$${(v/1e12).toFixed(2)} trillion`;
const signedMoney=(v:number)=>`${v>=0?"+":"−"}${shortMoney(Math.abs(v))}`;
const signedPct=(v:number|null)=>v==null?"—":`${v>=0?"+":""}${v.toFixed(1)}%`;

export default function LineChart({values,labels=values.map((_,i)=>String(i)),dates,realValues,dark=false,unit="USD",seriesLabel="Total public debt",xLabel="Period",yLabel="USD, nominal",forecastStart,intervals,markers=[],compact=false,intervalControls=false}:Props){
  const uid=useId().replace(/:/g,"");
  const [active,setActive]=useState<number|null>(null);
  const [rangePreset,setRangePreset]=useState<RangePreset>(null);
  const [resolution,setResolution]=useState<ChartResolution>("auto");
  const sourceDates=dates??labels;
  const options=useMemo(()=>availableResolutions(values.map((value,index)=>({date:sourceDates[index],value}))),[sourceDates,values]);
  const rows=useMemo(()=>{
    const source=values.map((value,index)=>({date:sourceDates[index],label:labels[index],value,realValue:realValues?.[index],interval:intervals?.[index],originalIndex:index}));
    const ranged=observationsInTrailingYears(source,rangePreset);
    const sampled=resampleObservations(ranged,resolution);
    return sampled as typeof source;
  },[values,sourceDates,labels,realValues,intervals,rangePreset,resolution]);
  const shownValues=rows.map(row=>row.value),shownLabels=rows.map(row=>row.label),shownIntervals=intervals?rows.map(row=>row.interval!).filter(Boolean):undefined;
  const stats=computeChartStats(rows);
  const shownMarkers=markers.flatMap(marker=>{const original=labels[marker.index];const index=shownLabels.indexOf(original);return index>=0?[{index,label:marker.label}]:[]});
  const w=720,h=compact?248:330,left=64,right=20,top=30,bottom=54;
  if(shownValues.length===0)return <div className="chartEmpty">No observations are available for this selection.</div>;
  const lows=shownIntervals?.map(item=>item.low)??[],highs=shownIntervals?.map(item=>item.high)??[];
  const rawMin=Math.min(...shownValues,...lows),rawMax=Math.max(...shownValues,...highs),spread=Math.max(1,rawMax-rawMin);
  const min=Math.max(0,rawMin-spread*.08),max=rawMax+spread*.1,chartRange=max-min;
  const x=(i:number)=>left+(shownValues.length===1?0:i/(shownValues.length-1))*(w-left-right);
  const y=(v:number)=>top+(max-v)/chartRange*(h-top-bottom);
  const line=(from=0,to=shownValues.length-1)=>shownValues.slice(from,to+1).map((v,j)=>`${j?"L":"M"} ${x(from+j)} ${y(v)}`).join(" ");
  const yTicks=Array.from({length:5},(_,i)=>min+(chartRange*i/4));
  const xTickIdx=Array.from(new Set([0,1,2,3,4].map(i=>Math.round(i*(shownValues.length-1)/4))));
  const area=`${line()} L ${x(shownValues.length-1)} ${h-bottom} L ${left} ${h-bottom} Z`;
  const band=shownIntervals?`${shownIntervals.map((d,i)=>`${i?"L":"M"} ${x(i)} ${y(d.high)}`).join(" ")} ${[...shownIntervals].reverse().map((d,j)=>`L ${x(shownIntervals.length-1-j)} ${y(d.low)}`).join(" ")} Z`:"";
  const ai=Math.min(active??shownValues.length-1,shownValues.length-1);
  const visibleForecastStart=forecastStart===undefined?undefined:rows.findIndex(row=>row.originalIndex>=forecastStart);
  return <div className={`intelChart ${dark?"dark":""} ${compact?"compact":""}`}>
    {intervalControls&&<div className="chartControls"><div className="rangePresets" role="group" aria-label="Chart time range">{([1,5,10,25,50,100] as const).map(years=><button key={years} className={rangePreset===years?"active":""} onClick={()=>{setRangePreset(years);setActive(null)}}>{years}Y</button>)}<button className={rangePreset===null?"active":""} onClick={()=>{setRangePreset(null);setActive(null)}}>All</button></div><label className="resolutionPicker"><span>Resolution</span><select value={resolution} onChange={event=>{setResolution(event.target.value as ChartResolution);setActive(null)}}>{options.map(option=><option value={option} key={option}>{option[0].toUpperCase()+option.slice(1)}</option>)}</select></label></div>}
    <div className="chartLegend"><span><i className="legendLine observedLine"/>{seriesLabel}</span>{visibleForecastStart!==undefined&&visibleForecastStart>=0&&<span><i className="legendLine forecastLine"/>Model estimate</span>}{shownIntervals&&<span><i className="legendBand"/>90% interval</span>}</div>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${seriesLabel} over ${xLabel.toLowerCase()}, measured in ${yLabel}`} onMouseLeave={()=>setActive(null)}>
      <defs><linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#347fec" stopOpacity=".22"/><stop offset="1" stopColor="#347fec" stopOpacity="0"/></linearGradient><pattern id={`forecast-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill={dark?"#6e56cf18":"#7057e810"}/><line x1="0" y1="0" x2="0" y2="8" stroke="#8d78ef" strokeWidth="2"/></pattern></defs>
      {visibleForecastStart!==undefined&&visibleForecastStart>=0&&<rect x={x(visibleForecastStart)} y={top} width={w-right-x(visibleForecastStart)} height={h-top-bottom} fill={`url(#forecast-${uid})`}/>}
      {yTicks.map((v,i)=><g key={i}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} className="chartGrid"/><text x={left-10} y={y(v)+4} textAnchor="end" className="axisTick">{unit==="USD"?shortMoney(v):`${v.toFixed(0)}%`}</text></g>)}
      {xTickIdx.map(i=><g key={i}><line x1={x(i)} x2={x(i)} y1={h-bottom} y2={h-bottom+5} className="axisLine"/><text x={x(i)} y={h-bottom+20} textAnchor={i===0?"start":i===shownValues.length-1?"end":"middle"} className="axisTick">{shownLabels[i]}</text></g>)}
      <line x1={left} x2={w-right} y1={h-bottom} y2={h-bottom} className="axisLine"/><line x1={left} x2={left} y1={top} y2={h-bottom} className="axisLine"/>
      <text x={(left+w-right)/2} y={h-5} textAnchor="middle" className="axisTitle">{xLabel}</text><text transform={`translate(15 ${(top+h-bottom)/2}) rotate(-90)`} textAnchor="middle" className="axisTitle">{yLabel}</text>
      {band&&<path d={band} className="confidenceBand"/>}<path d={area} fill={`url(#fill-${uid})`}/>
      {visibleForecastStart===undefined||visibleForecastStart<0?<path d={line()} className="observedPath"/>:<><path d={line(0,visibleForecastStart)} className="observedPath"/><path d={line(visibleForecastStart)} className="modelPath"/></>}
      {shownMarkers.map(m=><g key={`${m.index}-${m.label}`}><line x1={x(m.index)} x2={x(m.index)} y1={top} y2={h-bottom} className="eventLine"/><text x={x(m.index)+5} y={top+11} className="eventLabel">{m.label}</text></g>)}
      {shownValues.map((_,i)=><rect key={i} x={Math.max(left,x(i)-(w-left-right)/shownValues.length/2)} y={top} width={Math.max(8,(w-left-right)/shownValues.length)} height={h-top-bottom} fill="transparent" onMouseEnter={()=>setActive(i)} tabIndex={0} onFocus={()=>setActive(i)} aria-label={`${shownLabels[i]}: ${fullValue(shownValues[i],unit)}`}/>)}
      <line x1={x(ai)} x2={x(ai)} y1={top} y2={h-bottom} className="crosshair"/><circle cx={x(ai)} cy={y(shownValues[ai])} r="5" className="activePoint"/>
      <g className="svgTooltip" transform={`translate(${Math.min(w-174,Math.max(left+8,x(ai)+10))} ${Math.max(top+6,y(shownValues[ai])-54)})`}><rect width="156" height="45" rx="6"/><text x="10" y="17" className="tooltipDate">{shownLabels[ai]}</text><text x="10" y="35" className="tooltipValue">{fullValue(shownValues[ai],unit)}</text></g>
    </svg>
    {intervalControls&&stats&&<div className="windowInsights" aria-live="polite"><div><span>Selected window</span><b>{stats.startDate} → {stats.endDate}</b><small>{stats.observations} observations</small></div><div><span>Start → end</span><b>{shortMoney(stats.startValue)} → {shortMoney(stats.endValue)}</b><small>{Math.round(stats.days).toLocaleString()} days</small></div><div><span>Change</span><b>{unit==="USD"?signedMoney(stats.change):signedPct(stats.change)}</b><small>{signedPct(stats.percentChange)}</small></div><div><span>Annualized</span><b>{signedPct(stats.cagr)}</b><small>CAGR</small></div><div><span>Average pace</span><b>{stats.averagePerDay==null?"—":unit==="USD"?`${signedMoney(stats.averagePerDay)}/day`:signedPct(stats.averagePerDay)}</b><small>Across selected window</small></div>{unit==="USD"&&<div><span>Real-dollar change</span><b>{stats.realChange==null?"Unavailable":signedMoney(stats.realChange)}</b><small>{stats.realChange==null?"No CPI coverage":"2026 dollars"}</small></div>}</div>}
    <div className="chartFoot"><span>Source: U.S. Treasury Fiscal Data / FRED</span><span>Hover or focus to inspect</span></div>
  </div>;
}
