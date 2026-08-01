"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { money, pct } from "@/lib/format";
import { windowStats, RANGE_PRESETS } from "@/lib/chart-stats";
import { partyColor } from "@/lib/parties";
import type { ChartPoint, ControlSegment, TimelineEvent } from "@/lib/timeline-data";

/**
 * Dependency-free interactive fiscal chart:
 *  - time x-axis with intelligent tick spacing; linear/log y with nice ticks
 *  - nominal / real(BASE_YEAR $) basis toggle; USD left axis, % right axis
 *  - drag-zoom, pan mode, wheel zoom, double-click reset, brush preview
 *  - crosshair with a rich hover card incl. president, chamber control,
 *    unified/divided status, and active fiscal events
 *  - recession shading, presidential/House/Senate control strips,
 *    legislation/event markers, data-quality tier indicator
 *  - automatic resolution upgrade to daily Treasury data on tight zooms
 *  - PNG / SVG / CSV export, print view for PDF
 *
 * Axes never truncate misleadingly: linear USD axes start at 0 unless the
 * visible range is far from zero AND `allowNonZeroBase` (never for bars);
 * log axes label actual decades. Every real-dollar label carries the base year.
 */

export type OverlaySeries = {
  id: string;
  label: string;
  unit: "usd" | "pct";
  color: string;
  points: ChartPoint[];
  dash?: boolean;
};

type Props = {
  primary: { label: string; points: ChartPoint[]; color?: string };
  daily?: ChartPoint[];
  /** Pure single-resolution series enabling the explicit interval picker. */
  resolutions?: { annual?: ChartPoint[]; quarterly?: ChartPoint[]; daily?: ChartPoint[] };
  /** Quick range presets (1Y … All) anchored at the latest observation. */
  showRangePresets?: boolean;
  /** Computed insights (Δ, %, CAGR, per-day, real Δ) for the visible window. */
  showWindowStats?: boolean;
  baseYear: number;
  overlays?: OverlaySeries[];
  recessions?: Array<{ start: string; end: string }>;
  control?: ControlSegment[];
  events?: TimelineEvent[];
  tiers?: Array<{ start: string; end: string; label: string }>;
  band?: { low: ChartPoint[]; high: ChartPoint[]; label: string };
  height?: number;
  initialStart?: string;
  showControlStrips?: boolean;
  allowReal?: boolean;
  exportName?: string;
  defaultVisible?: string[];
};

const DAY = 86400000;
const ms = (d: string) => Date.parse(d + (d.length === 10 ? "T00:00:00Z" : ""));

function niceTicks(min: number, max: number, count = 6): number[] {
  if (!(max > min)) return [min];
  const span = max - min;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step0;
  const step = step0 * (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(v);
  return out;
}

function logTicks(min: number, max: number): number[] {
  const out: number[] = [];
  const lo = Math.floor(Math.log10(Math.max(min, 1)));
  const hi = Math.ceil(Math.log10(max));
  for (let e = lo; e <= hi; e++) {
    for (const m of hi - lo > 5 ? [1] : [1, 2, 5]) {
      const v = m * Math.pow(10, e);
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

function timeTicks(t0: number, t1: number): Array<{ t: number; label: string }> {
  const spanY = (t1 - t0) / (365.2425 * DAY);
  const out: Array<{ t: number; label: string }> = [];
  const d0 = new Date(t0);
  const d1 = new Date(t1);
  if (spanY > 6) {
    const step = spanY > 160 ? 25 : spanY > 80 ? 20 : spanY > 40 ? 10 : spanY > 15 ? 5 : spanY > 8 ? 2 : 1;
    const y0 = Math.ceil(d0.getUTCFullYear() / step) * step;
    for (let y = y0; y <= d1.getUTCFullYear(); y += step) out.push({ t: Date.UTC(y, 0, 1), label: String(y) });
  } else if (spanY > 1.2) {
    for (let y = d0.getUTCFullYear(); y <= d1.getUTCFullYear(); y++)
      for (const m of spanY > 3 ? [0] : [0, 6]) {
        const t = Date.UTC(y, m, 1);
        if (t >= t0 && t <= t1) out.push({ t, label: m === 0 ? String(y) : `${y}-07` });
      }
  } else if (spanY > 0.2) {
    for (let y = d0.getUTCFullYear(); y <= d1.getUTCFullYear(); y++)
      for (let m = 0; m < 12; m++) {
        const t = Date.UTC(y, m, 1);
        if (t >= t0 && t <= t1) out.push({ t, label: `${y}-${String(m + 1).padStart(2, "0")}` });
      }
  } else {
    const stepD = Math.max(1, Math.round((t1 - t0) / DAY / 8));
    for (let t = Math.ceil(t0 / DAY) * DAY; t <= t1; t += stepD * DAY) out.push({ t, label: new Date(t).toISOString().slice(5, 10) });
  }
  // Declutter: keep ~8 labels max
  const keep = Math.max(1, Math.ceil(out.length / 8));
  return out.filter((_, i) => i % keep === 0);
}

const fmtUsd = (v: number) => money(v);
const fmtPct = (v: number) => pct(v);

export default function FiscalChart({
  primary,
  daily,
  resolutions,
  showRangePresets = false,
  showWindowStats = false,
  baseYear,
  overlays = [],
  recessions = [],
  control = [],
  events = [],
  tiers = [],
  band,
  height = 430,
  initialStart,
  showControlStrips = true,
  allowReal = true,
  exportName = "debtscope-chart",
  defaultVisible = [],
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(960);
  const [basis, setBasis] = useState<"nominal" | "real">("nominal");
  const [scale, setScale] = useState<"linear" | "log">("linear");
  const [mode, setMode] = useState<"zoom" | "pan">("zoom");
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(defaultVisible.map((id) => [id, true])));
  const fullDomain = useMemo<[number, number]>(() => {
    // The domain spans every series, so forecast bands extending past the last
    // observation stay in view.
    let lo = Infinity;
    let hi = -Infinity;
    const scan = (pts: ChartPoint[]) => {
      if (!pts.length) return;
      lo = Math.min(lo, ms(pts[0].d));
      hi = Math.max(hi, ms(pts[pts.length - 1].d));
    };
    scan(primary.points);
    for (const o of overlays) scan(o.points);
    if (band) {
      scan(band.low);
      scan(band.high);
    }
    return [lo, hi];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary.points]);
  const [domain, setDomain] = useState<[number, number]>(() => [initialStart ? ms(initialStart) : fullDomain[0], fullDomain[1]]);
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.max(360, entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stripRows = showControlStrips ? 3 : 0;
  const margin = { top: 26, right: 62, bottom: 34 + stripRows * 15, left: 74 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const [t0, t1] = domain;
  const xOf = (t: number) => margin.left + ((t - t0) / (t1 - t0)) * plotW;
  const tOf = (x: number) => t0 + ((x - margin.left) / plotW) * (t1 - t0);

  // --- Resolution: auto-upgrade to daily on tight windows, or honor an explicit pick
  const [interval, setIntervalPick] = useState<"auto" | "annual" | "quarterly" | "daily">("auto");
  const spanYears = (t1 - t0) / (365.2425 * DAY);
  const autoDaily = !!daily && daily.length > 0 && spanYears <= 3 && t0 >= ms(daily[0].d) - 90 * DAY;
  // An explicit interval is only honored where its series has coverage in-window.
  const covers = (pts?: ChartPoint[]) => !!pts && pts.length > 0 && ms(pts[pts.length - 1].d) >= t0 && ms(pts[0].d) <= t1;
  const picked = interval !== "auto" && covers(resolutions?.[interval]) ? resolutions![interval]! : null;
  const usingDaily = picked ? interval === "daily" : autoDaily;
  const activePoints = picked ?? (autoDaily ? daily! : primary.points);
  const intervalOptions = (["auto", "annual", "quarterly", "daily"] as const).filter(
    (k) => k === "auto" || covers(resolutions?.[k]),
  );

  const val = (p: ChartPoint): number | null => (basis === "real" ? (p.r === undefined ? p.v : p.r) : p.v);
  const inWin = activePoints.filter((p) => {
    const t = ms(p.d);
    return t >= t0 - 90 * DAY && t <= t1 + 90 * DAY;
  });
  // Downsample by stride so paths stay light at any zoom.
  const stride = Math.max(1, Math.floor(inWin.length / (plotW * 1.5)));
  const shown = inWin.filter((_, i) => i % stride === 0 || i === inWin.length - 1);

  const activeOverlays = overlays.filter((o) => visible[o.id]);
  const usdValues: number[] = shown.map(val).filter((v): v is number => v !== null && Number.isFinite(v));
  for (const o of activeOverlays.filter((o) => o.unit === "usd"))
    for (const p of o.points) {
      const t = ms(p.d);
      if (t >= t0 && t <= t1 && p.v !== null) usdValues.push(p.v);
    }
  if (band)
    for (const arr of [band.low, band.high])
      for (const p of arr) {
        const t = ms(p.d);
        if (t >= t0 && t <= t1 && p.v !== null) usdValues.push(p.v);
      }
  const pctValues: number[] = [];
  for (const o of activeOverlays.filter((o) => o.unit === "pct"))
    for (const p of o.points) {
      const t = ms(p.d);
      if (t >= t0 && t <= t1 && p.v !== null) pctValues.push(p.v);
    }

  let yMin = 0;
  let yMax = Math.max(...usdValues, 1);
  if (scale === "log") {
    const positives = usdValues.filter((v) => v > 0);
    yMin = Math.min(...positives, yMax) * 0.8;
    yMax = yMax * 1.1;
  } else {
    const lo = Math.min(...usdValues, 0);
    yMin = lo < 0 ? lo * 1.1 : 0; // zero-baseline unless negatives (deficit overlay) exist
    yMax = yMax * 1.06;
  }
  const yOf = (v: number) =>
    scale === "log"
      ? margin.top + plotH - ((Math.log(Math.max(v, yMin)) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin))) * plotH
      : margin.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const p2Min = Math.min(...pctValues, 0);
  const p2Max = Math.max(...pctValues, 1) * 1.05;
  const y2Of = (v: number) => margin.top + plotH - ((v - p2Min) / (p2Max - p2Min)) * plotH;

  const yTicks = scale === "log" ? logTicks(yMin, yMax) : niceTicks(yMin, yMax);
  const xTicks = timeTicks(t0, t1);

  const pathOf = (pts: ChartPoint[], v: (p: ChartPoint) => number | null, yfn: (v: number) => number) => {
    let dstr = "";
    let pen = false;
    for (const p of pts) {
      const t = ms(p.d);
      if (t < t0 - 90 * DAY || t > t1 + 90 * DAY) continue;
      const value = v(p);
      if (value === null || !Number.isFinite(value) || (scale === "log" && value <= 0)) {
        pen = false;
        continue;
      }
      dstr += `${pen ? "L" : "M"}${xOf(t).toFixed(1)},${yfn(value).toFixed(1)}`;
      pen = true;
    }
    return dstr;
  };

  const primaryPath = pathOf(shown, val, yOf);
  const bandPath = (() => {
    if (!band) return "";
    const lows = band.low.filter((p) => p.v !== null);
    const highs = band.high.filter((p) => p.v !== null);
    if (!lows.length || !highs.length) return "";
    const up = highs.map((p) => `${xOf(ms(p.d)).toFixed(1)},${yOf(p.v as number).toFixed(1)}`).join(" L");
    const down = [...lows].reverse().map((p) => `${xOf(ms(p.d)).toFixed(1)},${yOf(p.v as number).toFixed(1)}`).join(" L");
    return `M${up} L${down} Z`;
  })();

  // --- Hover resolution ---------------------------------------------------------
  const hoverInfo = (() => {
    if (!hover) return null;
    const t = hover.t;
    const dateISO = new Date(t).toISOString().slice(0, 10);
    let nearest: ChartPoint | null = null;
    let best = Infinity;
    for (const p of shown) {
      const d = Math.abs(ms(p.d) - t);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    const seg = control.find((c) => dateISO >= c.start && dateISO < c.end) ?? null;
    const active = events.filter((e) => (e.end ? dateISO >= e.start && dateISO <= e.end : Math.abs(ms(e.start) - t) < 200 * DAY));
    const tier = tiers.find((x) => dateISO >= x.start && dateISO < x.end) ?? null;
    const overlayVals = activeOverlays.map((o) => {
      let ov: ChartPoint | null = null;
      let ob = Infinity;
      for (const p of o.points) {
        const d = Math.abs(ms(p.d) - t);
        if (d < ob && p.v !== null) {
          ob = d;
          ov = p;
        }
      }
      return { o, p: ob < 400 * DAY ? ov : null };
    });
    return { dateISO, nearest, seg, active, tier, overlayVals };
  })();

  // --- Interaction handlers ------------------------------------------------------
  const posOf = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height };
  };
  const clampDomain = (a: number, b: number): [number, number] => {
    const lo = Math.max(fullDomain[0], Math.min(a, b));
    const hi = Math.min(fullDomain[1], Math.max(a, b));
    return hi - lo < 20 * DAY ? [lo, lo + 20 * DAY] : [lo, hi];
  };
  const onMouseDown = (e: React.MouseEvent) => {
    const { x } = posOf(e);
    if (x < margin.left || x > width - margin.right) return;
    setDrag({ x0: x, x1: x });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const { x, y } = posOf(e);
    if (drag) {
      if (mode === "zoom") setDrag({ ...drag, x1: x });
      else {
        const dt = tOf(drag.x1) - tOf(x);
        setDomain(clampDomain(t0 + dt, t1 + dt));
        setDrag({ x0: x, x1: x });
      }
    }
    if (x >= margin.left && x <= width - margin.right && y >= margin.top && y <= margin.top + plotH) {
      setHover({ x, y, t: tOf(x) });
    } else setHover(null);
  };
  const onMouseUp = () => {
    if (drag && mode === "zoom" && Math.abs(drag.x1 - drag.x0) > 8) {
      setDomain(clampDomain(tOf(drag.x0), tOf(drag.x1)));
    }
    setDrag(null);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!hover) return;
    const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const c = hover.t;
    setDomain(clampDomain(c - (c - t0) * f, c + (t1 - c) * f));
  };
  const reset = () => setDomain(fullDomain);

  // --- Exports ---------------------------------------------------------------------
  const svgMarkup = () => {
    const node = svgRef.current!;
    const clone = node.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("style", "background:#ffffff;font-family:Inter,system-ui,sans-serif");
    return new XMLSerializer().serializeToString(clone);
  };
  const download = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportSvg = () => download(new Blob([svgMarkup()], { type: "image/svg+xml" }), `${exportName}.svg`);
  const exportPng = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && download(b, `${exportName}.png`));
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgMarkup())));
  };
  const exportCsv = () => {
    const rows = [`date,${primary.label.replaceAll(",", " ")}${basis === "real" ? ` (${baseYear} dollars)` : " (nominal)"}${activeOverlays.map((o) => "," + o.label.replaceAll(",", " ")).join("")}`];
    for (const p of inWin) {
      const cells = [p.d, String(val(p) ?? "")];
      for (const o of activeOverlays) {
        const match = o.points.find((q) => q.d === p.d);
        cells.push(match && match.v !== null ? String(match.v) : "");
      }
      rows.push(cells.join(","));
    }
    download(new Blob([rows.join("\n")], { type: "text/csv" }), `${exportName}.csv`);
  };
  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${exportName}</title></head><body style="margin:24px;font-family:Inter,system-ui,sans-serif"><h3 style="margin:0 0 12px">${primary.label}${basis === "real" ? ` — real ${baseYear} dollars` : " — nominal dollars"}</h3>${svgMarkup()}<p style="color:#666;font-size:11px">DebtScope AI — use the browser print dialog to save as PDF.</p><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const primaryColor = primary.color ?? "#165bd8";
  const stripY = (row: number) => margin.top + plotH + 30 + row * 15;
  const visRecessions = recessions.filter((r) => ms(r.end) >= t0 && ms(r.start) <= t1);
  // Declutter event markers: one per ~28px bucket, wars/crises first.
  const prio: Record<string, number> = { war: 0, crisis: 1, pandemic: 2, event: 3, legislation: 4 };
  const visEvents = events
    .filter((e) => ms(e.start) >= t0 && ms(e.start) <= t1)
    .sort((a, b) => (prio[a.kind] ?? 9) - (prio[b.kind] ?? 9))
    .filter((e, _, arr) => arr.findIndex((o) => Math.abs(xOf(ms(o.start)) - xOf(ms(e.start))) < 28) === arr.indexOf(e) || true)
    .reduce<TimelineEvent[]>((acc, e) => {
      if (acc.every((o) => Math.abs(xOf(ms(o.start)) - xOf(ms(e.start))) >= 28)) acc.push(e);
      return acc;
    }, []);

  const controlRows: Array<{ label: string; pick: (c: ControlSegment) => string }> = [
    { label: "President", pick: (c) => c.party },
    { label: "House", pick: (c) => c.house },
    { label: "Senate", pick: (c) => c.senate },
  ];

  return (
    <div ref={wrapRef} className="fchart">
      <div className="fchartBar">
        {allowReal && (
          <span className="fcGroup" role="tablist" aria-label="Dollar basis">
            <button role="tab" aria-selected={basis === "nominal"} className={basis === "nominal" ? "toggle active" : "toggle"} onClick={() => setBasis("nominal")}>Nominal</button>
            <button role="tab" aria-selected={basis === "real"} className={basis === "real" ? "toggle active" : "toggle"} onClick={() => setBasis("real")}>Real {baseYear} $</button>
          </span>
        )}
        <span className="fcGroup" role="tablist" aria-label="Scale">
          <button role="tab" aria-selected={scale === "linear"} className={scale === "linear" ? "toggle active" : "toggle"} onClick={() => setScale("linear")}>Linear</button>
          <button role="tab" aria-selected={scale === "log"} className={scale === "log" ? "toggle active" : "toggle"} onClick={() => setScale("log")}>Log</button>
        </span>
        <span className="fcGroup">
          <button className={mode === "zoom" ? "toggle active" : "toggle"} onClick={() => setMode("zoom")} title="Drag to zoom into a range">Zoom</button>
          <button className={mode === "pan" ? "toggle active" : "toggle"} onClick={() => setMode("pan")} title="Drag to pan">Pan</button>
          <button className="toggle" onClick={reset}>Reset</button>
        </span>
        {showRangePresets && (
          <span className="fcGroup" aria-label="Time range">
            {RANGE_PRESETS.map((p) => {
              const active = p.years === null
                ? t0 === fullDomain[0] && t1 === fullDomain[1]
                : Math.abs(t1 - fullDomain[1]) < DAY && Math.abs(t1 - t0 - p.years * 365.2425 * DAY) < 45 * DAY;
              return (
                <button
                  key={p.label}
                  className={active ? "toggle active" : "toggle"}
                  onClick={() =>
                    setDomain(p.years === null ? fullDomain : clampDomain(fullDomain[1] - p.years * 365.2425 * DAY, fullDomain[1]))
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </span>
        )}
        {resolutions && intervalOptions.length > 1 && (
          <span className="fcGroup" role="tablist" aria-label="Data interval">
            {intervalOptions.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={interval === k}
                className={interval === k ? "toggle active" : "toggle"}
                onClick={() => setIntervalPick(k)}
                title={k === "auto" ? "Finest defensible interval for the visible window" : `Force ${k} observations`}
              >
                {k === "auto" ? "Auto" : k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </span>
        )}
        {overlays.length > 0 && (
          <span className="fcGroup fcOverlays">
            {overlays.map((o) => (
              <label key={o.id} className="fcCheck" style={{ borderColor: visible[o.id] ? o.color : undefined }}>
                <input type="checkbox" checked={!!visible[o.id]} onChange={(e) => setVisible({ ...visible, [o.id]: e.target.checked })} />
                <i style={{ background: o.color }} /> {o.label}
              </label>
            ))}
          </span>
        )}
        <span className="fcGroup fcExports">
          <button className="toggle" onClick={exportPng}>PNG</button>
          <button className="toggle" onClick={exportSvg}>SVG</button>
          <button className="toggle" onClick={exportCsv}>CSV</button>
          <button className="toggle" onClick={exportPdf} title="Opens a print view — save as PDF">PDF</button>
        </span>
      </div>
      <div className="fcMeta">
        {tiers.length > 0
          ? (usingDaily ? "Daily Treasury records" : spanYears > 25 ? "Annual records to 1965, quarterly from 1966" : "Quarterly records (annual before 1966)") + " · "
          : ""}
        {basis === "real" ? `inflation-adjusted, ${baseYear} prices (CPI-U; unavailable before 1913)` : "nominal dollars"}
        {scale === "log" ? " · logarithmic scale" : ""}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${primary.label} chart`}
        style={{ cursor: mode === "pan" ? "grab" : "crosshair", userSelect: "none", touchAction: "pan-y" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          setHover(null);
          setDrag(null);
        }}
        onWheel={onWheel}
        onDoubleClick={reset}
      >
        {/* Recession shading */}
        {visRecessions.map((r) => (
          <rect key={r.start} x={Math.max(margin.left, xOf(ms(r.start)))} y={margin.top} width={Math.max(1, Math.min(width - margin.right, xOf(ms(r.end))) - Math.max(margin.left, xOf(ms(r.start))))} height={plotH} fill="#8a93a3" opacity=".13" />
        ))}
        {/* Gridlines + y axis (USD) */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={margin.left} x2={width - margin.right} y1={yOf(v)} y2={yOf(v)} stroke="#dfe5ec" strokeWidth=".7" />
            <text x={margin.left - 8} y={yOf(v) + 3.5} textAnchor="end" fontSize="10.5" fill="#637188">{fmtUsd(v)}</text>
          </g>
        ))}
        <text transform={`rotate(-90 14 ${margin.top + plotH / 2})`} x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize="10" fill="#637188" letterSpacing=".06em">
          {basis === "real" ? `USD, ${baseYear} PRICES` : "USD, NOMINAL"}
        </text>
        {/* right axis (%) when a pct overlay is on */}
        {pctValues.length > 0 &&
          niceTicks(p2Min, p2Max, 5).map((v) => (
            <text key={`r${v}`} x={width - margin.right + 8} y={y2Of(v) + 3.5} fontSize="10.5" fill="#637188">{fmtPct(v)}</text>
          ))}
        {/* x axis */}
        {xTicks.map(({ t, label }) => (
          <g key={t}>
            <line x1={xOf(t)} x2={xOf(t)} y1={margin.top} y2={margin.top + plotH} stroke="#eef1f5" strokeWidth=".7" />
            <text x={xOf(t)} y={margin.top + plotH + 15} textAnchor="middle" fontSize="10.5" fill="#637188">{label}</text>
          </g>
        ))}
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotH} y2={margin.top + plotH} stroke="#c7cfda" />
        {/* Forecast band */}
        {band && bandPath && <path d={bandPath} fill={primaryColor} opacity=".13" />}
        {/* Overlays */}
        {activeOverlays.map((o) => (
          <path key={o.id} d={pathOf(o.points, (p) => p.v, o.unit === "pct" ? y2Of : yOf)} fill="none" stroke={o.color} strokeWidth="1.8" strokeDasharray={o.dash ? "5 4" : undefined} vectorEffect="non-scaling-stroke" />
        ))}
        {/* Primary series */}
        <path d={primaryPath} fill="none" stroke={primaryColor} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        {/* Event markers */}
        {visEvents.map((e) => (
          <g key={e.id}>
            <line x1={xOf(ms(e.start))} x2={xOf(ms(e.start))} y1={margin.top + 8} y2={margin.top + plotH} stroke="#a87719" strokeWidth=".8" strokeDasharray="2 4" opacity=".55" />
            <text x={xOf(ms(e.start))} y={margin.top + 4} textAnchor="middle" fontSize="8.5" fill="#a87719">▼</text>
          </g>
        ))}
        {/* Control strips */}
        {showControlStrips &&
          controlRows.map((row, ri) => (
            <g key={row.label}>
              <text x={margin.left - 8} y={stripY(ri) + 8.5} textAnchor="end" fontSize="9" fill="#637188">{row.label}</text>
              {control
                .filter((c) => ms(c.end) >= t0 && ms(c.start) <= t1)
                .map((c, i) => {
                  const x0 = Math.max(margin.left, xOf(ms(c.start)));
                  const x1 = Math.min(width - margin.right, xOf(ms(c.end)));
                  if (x1 - x0 < 0.5) return null;
                  return <rect key={`${row.label}${i}`} x={x0} y={stripY(ri)} width={x1 - x0} height={11} fill={partyColor(row.pick(c))} opacity=".82" />;
                })}
            </g>
          ))}
        {/* Brush preview */}
        {drag && mode === "zoom" && Math.abs(drag.x1 - drag.x0) > 2 && (
          <rect x={Math.min(drag.x0, drag.x1)} y={margin.top} width={Math.abs(drag.x1 - drag.x0)} height={plotH} fill={primaryColor} opacity=".12" stroke={primaryColor} strokeDasharray="3 3" />
        )}
        {/* Crosshair */}
        {hover && hoverInfo?.nearest && (
          <g pointerEvents="none">
            <line x1={xOf(ms(hoverInfo.nearest.d))} x2={xOf(ms(hoverInfo.nearest.d))} y1={margin.top} y2={margin.top + plotH} stroke="#081a32" strokeWidth=".8" opacity=".5" />
            {val(hoverInfo.nearest) !== null && <circle cx={xOf(ms(hoverInfo.nearest.d))} cy={yOf(val(hoverInfo.nearest)!)} r="4" fill={primaryColor} stroke="#fff" strokeWidth="1.5" />}
          </g>
        )}
      </svg>
      {/* Window insights: the analyst numbers for the visible interval */}
      {showWindowStats &&
        (() => {
          const s = windowStats(activePoints, t0, t1);
          if (!s) return null;
          return (
            <div className="fcStats">
              <span className="fcStat"><label>Window</label><b>{s.startDate} → {s.endDate}</b><small>{s.years.toFixed(1)} yrs · {s.observations} obs</small></span>
              <span className="fcStat"><label>Start → End</label><b>{money(s.startValue)} → {money(s.endValue)}</b><small>nominal</small></span>
              <span className="fcStat"><label>Change</label><b>{money(s.change)}</b><small>{s.percent === null ? "from zero debt" : pct(s.percent)}</small></span>
              <span className="fcStat"><label>CAGR</label><b>{s.cagrPct === null ? "—" : pct(s.cagrPct)}</b><small>annualized</small></span>
              <span className="fcStat"><label>Avg / day</label><b>{money(s.perDay)}</b><small>nominal</small></span>
              <span className="fcStat"><label>Real change</label><b>{s.realChange === null ? "—" : money(s.realChange)}</b><small>{s.realChange === null ? "pre-CPI era in window" : `${baseYear} $ · ${s.realPercent === null ? "" : pct(s.realPercent)}`}</small></span>
            </div>
          );
        })()}
      {/* Hover card */}
      {hover && hoverInfo?.nearest && (
        <div className="fcTip" style={{ left: `${Math.min(Math.max((hover.x / width) * 100, 8), 70)}%` }}>
          <div className="fcTipDate">{hoverInfo.nearest.d}{usingDaily ? "" : hoverInfo.tier && ms(hoverInfo.nearest.d) < ms("1966-01-01") ? " · annual record" : ""}</div>
          <div className="fcTipMain">
            {val(hoverInfo.nearest) !== null ? money(val(hoverInfo.nearest)!) : "n/a"}
            <small>{basis === "real" ? ` in ${baseYear} dollars` : " nominal"}</small>
          </div>
          {basis === "real" && val(hoverInfo.nearest) === null && <div className="fcTipRow">Real value unavailable before CPI records begin (1913)</div>}
          {hoverInfo.overlayVals.map(({ o, p }) =>
            p ? (
              <div className="fcTipRow" key={o.id}>
                <i style={{ background: o.color }} /> {o.label}: {o.unit === "pct" ? pct(p.v!) : money(p.v!)}
              </div>
            ) : null,
          )}
          {hoverInfo.seg && (
            <div className="fcTipPol">
              <div><b>{hoverInfo.seg.president}</b> ({hoverInfo.seg.party})</div>
              <div>House: {hoverInfo.seg.house} · Senate: {hoverInfo.seg.senate}</div>
              <div>{hoverInfo.seg.alignment === "unified" ? "Unified government" : hoverInfo.seg.alignment === "split-congress" ? "Split Congress" : hoverInfo.seg.alignment === "divided" ? "Divided government" : ""}{hoverInfo.seg.congress ? ` · ${hoverInfo.seg.congress}th Congress` : ""}</div>
              {hoverInfo.seg.note && <div className="fcTipNote">{hoverInfo.seg.note}</div>}
            </div>
          )}
          {hoverInfo.active.length > 0 && (
            <div className="fcTipEvents">
              {hoverInfo.active.slice(0, 3).map((e) => (
                <div key={e.id}>◆ {e.label}</div>
              ))}
            </div>
          )}
          {hoverInfo.tier && <div className="fcTipTier">{hoverInfo.tier.label}</div>}
        </div>
      )}
    </div>
  );
}
