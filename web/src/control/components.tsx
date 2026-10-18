// Small, touch-friendly control primitives for the phone settings panel.

import { useEffect, useState, type ReactNode } from "react";
import { round } from "@shared/index.js";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  );
}

export function Row({ label, children, hint, indent = false }: { label: string; children: ReactNode; hint?: string; indent?: boolean }) {
  return (
    <div className={`row ${indent ? "row-indent" : ""}`}>
      <div className="row-label">
        {label}
        {hint && <span className="row-hint">{hint}</span>}
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle ${value ? "on" : ""}`}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function Slider({
  id,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  // Keep the handle under the pointer while dragging; parent value may lag after unit conversion.
  const [active, setActive] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (!active) setLocal(value);
  }, [value, active]);

  const display = active ? local : value;
  const handleChange = (v: number) => {
    setLocal(v);
    onChange(v);
  };
  const release = () => setActive(false);

  return (
    <div className="slider">
      <input
        id={`${id}-slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onPointerDown={() => setActive(true)}
        onPointerUp={release}
        onPointerCancel={release}
        onChange={(e) => handleChange(Number(e.target.value))}
      />
      <span className="slider-value">
        <input
          id={`${id}-number`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={round(display, step >= 1 ? 0 : 1)}
          onFocus={() => setActive(true)}
          onBlur={release}
          onChange={(e) => handleChange(Number(e.target.value))}
        />
        {unit}
      </span>
    </div>
  );
}

export function TextInput({
  value,
  onCommit,
  placeholder,
  ariaLabel,
}: {
  value: string;
  /** Fired on blur / Enter with the trimmed value (only when it changed). */
  onCommit: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Re-sync when the server's value changes (e.g. a rejected edit reverts).
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== draft) setDraft(trimmed);
    if (trimmed !== value) onCommit(trimmed);
  };

  return (
    <input
      className="text-input"
      type="text"
      inputMode="url"
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/** One row from the server's /api/airports/search. */
export interface AirportHit {
  ident: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: string;
}

/**
 * Text input with airport suggestions (code, name or city) as you type.
 * Picking a suggestion calls `onPick`; Enter with nothing highlighted
 * hands the raw text to `onSubmitText` (e.g. a city for the geocoder).
 */
export function AirportSearch({
  placeholder,
  ariaLabel,
  onPick,
  onSubmitText,
}: {
  placeholder?: string;
  ariaLabel?: string;
  onPick: (hit: AirportHit) => void;
  onSubmitText?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [hits, setHits] = useState<AirportHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState("");

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setHits([]);
      setSearched("");
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/airports/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((h: AirportHit[]) => {
          setHits(h);
          setActive(h.length ? 0 : -1);
          setSearched(q);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [text]);

  const pick = (h: AirportHit) => {
    setText("");
    setHits([]);
    setOpen(false);
    onPick(h);
  };
  const submitText = () => {
    const q = text.trim();
    if (!q || !onSubmitText) return;
    setText("");
    setOpen(false);
    onSubmitText(q);
  };

  const showList = open && text.trim().length >= 2 && (hits.length > 0 || searched === text.trim());

  return (
    <div className="ac-wrap">
      <input
        className="text-input"
        type="text"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && hits.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % hits.length);
          } else if (e.key === "ArrowUp" && hits.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (showList && active >= 0 && hits[active]) pick(hits[active]);
            else submitText();
          }
        }}
      />
      {showList && (
        <ul className="ac-list" role="listbox">
          {hits.length === 0 && (
            <li className="ac-empty">
              No airports match{onSubmitText ? " — Enter to search places" : ""}
            </li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.ident}
              role="option"
              aria-selected={i === active}
              className={`ac-item ${i === active ? "on" : ""}`}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(h);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ac-code">{h.iata || h.ident}</span>
              <span className="ac-main">
                <span className="ac-name">{h.name}</span>
                <span className="ac-sub">
                  {[h.city, h.country].filter(Boolean).join(", ")}
                  {h.iata ? ` · ${h.ident}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={`segment ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="color-row">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
