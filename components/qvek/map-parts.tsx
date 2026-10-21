"use client";

/* SVG building blocks for the fleet map and the mini location previews (ported from admin.js). */
import type { KeyboardEvent } from "react";

import { G, store } from "@/lib/qvek/store";
import { KIND_LABEL, ZC, vKind } from "@/lib/qvek/selectors";
import type { Vehicle } from "@/lib/qvek/types";

const FONT = "Segoe UI, system-ui, sans-serif";

export function MapBase() {
  const lines = [];
  for (let i = -400; i <= 400; i += 50) lines.push(<path key={i} d={`M${i} -400V400M-400 ${i}H400`} />);
  return (
    <>
      <rect x="-600" y="-600" width="1200" height="1200" fill="#0A1424" />
      <g stroke="#101D33" strokeWidth="1">{lines}</g>
      <path d="M-600 130C-420 40-260 210-110 140S120 10 260 70 480 150 600 90" stroke="#0E2741" strokeWidth="22" fill="none" strokeLinecap="round" />
      <g stroke="#1A2A43" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M-600 -40L600 20" />
        <path d="M-70 -600L40 600" />
        <path d="M-420 -400L380 420" />
        <path d="M-380 360L360 -330" />
        <circle r="92" />
        <circle r="205" strokeDasharray="0" stroke="#152338" strokeWidth="3" />
      </g>
      <g fill="#0D1A2E">
        <rect x="60" y="-170" width="60" height="40" rx="6" />
        <rect x="-190" y="-120" width="50" height="60" rx="6" />
        <rect x="150" y="160" width="70" height="40" rx="6" />
        <rect x="-140" y="190" width="40" height="40" rx="6" />
      </g>
    </>
  );
}

export function MapZones({ labels }: { labels: boolean }) {
  const z = store.state.config.zones;
  const o = z.operational * 10;
  const w = z.warning * 10;
  return (
    <>
      <path fillRule="evenodd" d={`M-600 -600H600V600H-600Z M0 ${-w}A${w} ${w} 0 1 0 0 ${w}A${w} ${w} 0 1 0 0 ${-w}Z`} fill="#F16A73" fillOpacity=".07" />
      <circle r={w} fill="#F5B942" fillOpacity=".06" stroke="#F5B942" strokeOpacity=".55" strokeWidth="2" strokeDasharray="8 6" />
      <circle r={o} fill="#20C76B" fillOpacity=".07" stroke="#20C76B" strokeOpacity=".7" strokeWidth="2" strokeDasharray="8 6" />
      {labels ? (
        <g fontSize="11" fontWeight="700" letterSpacing="1.2" textAnchor="middle" fontFamily={FONT}>
          <text y={-o + 16} fill="#20C76B">OPERATIONAL · ≤{z.operational} KM</text>
          <text y={-w + 16} fill="#F5B942">WARNING · {z.operational}–{z.warning} KM</text>
          <text y={-w - 10} fill="#F16A73">DISARM ZONE · BEYOND {z.warning} KM</text>
        </g>
      ) : null}
    </>
  );
}

export function HubMark() {
  return (
    <g aria-label="Qvek hub">
      <circle r="15" fill="#20C76B" fillOpacity=".18" />
      <rect x="-9" y="-9" width="18" height="18" rx="5" fill="#F3F6FB" />
      <path d="M-4.5 -1.5h9v5.5h-9zM-5.5 -1.5l2-3.5h7l2 3.5" fill="none" stroke="#0B1120" strokeWidth="1.6" strokeLinejoin="round" />
      <text y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F3F6FB" fontFamily={FONT}>Qvek Hub</text>
    </g>
  );
}

export function Marker({ v, selected, onSelect }: { v: Vehicle; selected: boolean; onSelect?: (id: string) => void }) {
  const k = vKind(v);
  const c = ZC[k];
  const x = v.pos.x * 10;
  const y = -v.pos.y * 10;
  const r = G.vehicleRider(v);
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (onSelect && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect(v.id);
    }
  };
  return (
    <g
      className={"marker" + (selected ? " is-selected" : "")}
      data-id={v.id}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
      tabIndex={0}
      role="button"
      aria-label={v.regNo + ", " + KIND_LABEL[k] + (r ? ", " + r.name : "")}
      onClick={onSelect ? () => onSelect(v.id) : undefined}
      onKeyDown={onKey}
    >
      <circle className="marker__ring" r="9.5" fill={c} fillOpacity=".25" stroke={c} strokeWidth="1.5" />
      <circle className="marker__dot" r="5" fill={c} />
      {k === "recovery" ? (
        <>
          <path d="M0 -21c-4 0-7 3-7 7 0 5 7 10 7 10s7-5 7-10c0-4-3-7-7-7z" fill={c} />
          <circle cy="-14" r="2.4" fill="#0B1120" />
        </>
      ) : null}
      {selected ? (
        <g transform={`translate(0 ${k === "recovery" ? -32 : -22})`}>
          <rect x="-46" y="-16" width="92" height="20" rx="6" fill="#F3F6FB" />
          <text y="-2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0B1120" fontFamily={FONT} letterSpacing=".5">{v.regNo}</text>
        </g>
      ) : null}
    </g>
  );
}

/** 150px mini map centred on a vehicle (vehicle drawer + recovery cards). */
export function MiniMap({ v }: { v: Vehicle }) {
  const x = v.pos.x * 10;
  const y = -v.pos.y * 10;
  const w = 220;
  const h = 120;
  return (
    <svg viewBox={`${x - w / 2} ${y - h / 2} ${w} ${h}`} role="img" aria-label="Location preview">
      <MapBase />
      <MapZones labels={false} />
      <HubMark />
      <Marker v={v} selected={false} />
    </svg>
  );
}
