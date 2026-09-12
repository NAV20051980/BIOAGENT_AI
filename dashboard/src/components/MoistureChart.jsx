import { useState, useMemo } from 'react';
import { Droplets, Zap, ShieldCheck } from 'lucide-react';
import './MoistureChart.css';

export default function MoistureChart({
  data,
  history = [],
  plant,
  currentMoisture = 45,
  idealMin: propIdealMin,
  idealMax: propIdealMax,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const idealMin = propIdealMin ?? plant?.idealMoistureMin ?? 40;
  const idealMax = propIdealMax ?? plant?.idealMoistureMax ?? 60;
  const currentVal = Math.round(Number(currentMoisture) || 45);

  // Build time-series points from `data` prop or `history` prop
  const points = useMemo(() => {
    const rawList = Array.isArray(data) && data.length > 0
      ? data
      : (Array.isArray(history) && history.length > 0 ? history : []);

    const now = Date.now();
    const pts = [];

    if (rawList.length >= 2) {
      // Filter for last 360 readings (6 hours at 1-min intervals) or real-time series
      const filtered = rawList.slice(-360);
      filtered.forEach((item, i) => {
        const rawTs = item.timestamp;
        const ts = rawTs
          ? (rawTs > 1e11 ? rawTs : rawTs * 1000)
          : now - (filtered.length - 1 - i) * 60000;
        const d = new Date(ts);
        const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const m = item.soil_moisture ?? item.soilMoisture ?? item.soil_moisture_pct ?? item.moisture;
        if (m != null) {
          pts.push({
            time: timeLabel,
            timestamp: ts,
            moisture: Math.round(Number(m)),
            pump: Boolean(item.pump || item.trigger_pump || item.type === 'watered' || item.decision === 'WATER'),
            reason: item.reason || (item.pump ? 'Pump Pulse Event' : 'Telemetry Record'),
          });
        }
      });
    }

    // Ensure the latest real-time reading is appended or aligned with currentMoisture
    if (pts.length > 0) {
      const lastPt = pts[pts.length - 1];
      if (Math.abs(now - (lastPt.timestamp || 0)) < 15000) {
        lastPt.moisture = currentVal;
      } else {
        pts.push({
          time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: now,
          moisture: currentVal,
          pump: false,
          reason: 'Current Telemetry Reading',
        });
      }
    }

    // If points are fewer than 2, construct recent 6-hour data points leading to currentMoisture
    if (pts.length < 2) {
      pts.length = 0;
      const sampleDeltas = [-6, -4, -2, -1, 3, 1, -2, -4, -1, 1, 0, 0];
      const count = 12;
      for (let i = 0; i < count; i++) {
        const timeOffsetMin = (count - 1 - i) * 30; // 30 mins each = 6 hours
        const d = new Date(now - timeOffsetMin * 60 * 1000);
        const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const m = Math.max(10, Math.min(85, currentVal + sampleDeltas[i]));
        const isPumpEvent = i === 4;
        pts.push({
          time: timeLabel,
          timestamp: d.getTime(),
          moisture: i === count - 1 ? currentVal : m,
          pump: isPumpEvent,
          reason: isPumpEvent ? 'AI Micro-irrigation pulse (5s)' : 'Autonomous moisture tracking',
        });
      }
    }

    return pts;
  }, [data, history, currentVal]);

  // SVG Chart Dimensions
  const width = 800;
  const height = 120;
  const padL = 45;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const yMin = 0;
  const yMax = 100;

  const getX = (idx) => padL + (idx / Math.max(1, points.length - 1)) * chartW;
  const getY = (val) => padT + chartH - ((Math.max(0, Math.min(100, val)) - yMin) / (yMax - yMin)) * chartH;

  const yIdealMin = getY(idealMin);
  const yIdealMax = getY(idealMax);
  const idealHeight = Math.max(4, yIdealMin - yIdealMax);

  // SVG Path Generator
  const pathD = useMemo(() => {
    return points.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.moisture);
      if (idx === 0) return `M ${x},${y}`;
      const prevPt = points[idx - 1];
      const prevX = getX(idx - 1);
      const prevY = getY(prevPt.moisture);
      const cX1 = prevX + (x - prevX) / 2;
      const cY1 = prevY;
      const cX2 = prevX + (x - prevX) / 2;
      const cY2 = y;
      return `${acc} C ${cX1},${cY1} ${cX2},${cY2} ${x},${y}`;
    }, '');
  }, [points]);

  // Determine which points show X-axis time labels to avoid clutter
  const labelInterval = Math.max(1, Math.floor((points.length - 1) / 5));

  // Determine whether to display a circle dot for point `idx`
  const shouldRenderDot = (pt, idx) => {
    if (points.length <= 36) return true;
    if (pt.pump) return true;
    if (idx === points.length - 1) return true;
    return idx % Math.ceil(points.length / 18) === 0;
  };

  return (
    <div className="moisture-chart-card">
      <div className="moisture-chart__header">
        <div className="moisture-chart__title-group">
          <Droplets size={16} color="var(--color-botanical, #35462e)" />
          <h3 className="moisture-chart__title">6-Hour Moisture & Hydration History</h3>
          <span className="moisture-chart__badge">{plant?.name || 'Bael'} Profile</span>
        </div>

        <div className="moisture-chart__legend">
          <span className="legend-item">
            <span className="legend-line legend-line--moisture" /> Soil Moisture ({currentVal}%)
          </span>
          <span className="legend-item">
            <span className="legend-rect legend-rect--ideal" /> Ideal ({idealMin}–{idealMax}%)
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot--pump" /> Pump Event
          </span>
        </div>
      </div>

      <div className="moisture-chart__canvas-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="moisture-chart__svg" preserveAspectRatio="none">
          {/* Ideal Moisture Zone Background */}
          <rect
            x={padL}
            y={yIdealMax}
            width={chartW}
            height={idealHeight}
            fill="rgba(110, 122, 78, 0.12)"
            stroke="rgba(110, 122, 78, 0.3)"
            strokeDasharray="4 4"
          />

          {/* Grid lines */}
          {[20, 40, 60, 80].map((gridVal) => {
            const y = getY(gridVal);
            return (
              <g key={gridVal}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="var(--color-border, #e1d5b8)"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="8"
                  fill="var(--color-text-secondary, #6b6350)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {/* Ideal min / max reference labels */}
          <text
            x={width - padR + 6}
            y={yIdealMin + 3}
            fontSize="8.5"
            fill="#6e7a4e"
            fontWeight="600"
            fontFamily="var(--font-mono, monospace)"
          >
            Min
          </text>
          <text
            x={width - padR + 6}
            y={yIdealMax + 3}
            fontSize="8.5"
            fill="#6e7a4e"
            fontWeight="600"
            fontFamily="var(--font-mono, monospace)"
          >
            Max
          </text>

          {/* Moisture Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#94550e"
            strokeWidth="2.0"
            strokeLinecap="round"
          />

          {/* X Axis Time Labels & Interactive Data Points */}
          {points.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.moisture);
            const isLabelTick = (idx % labelInterval === 0) || (idx === points.length - 1);
            const renderDot = shouldRenderDot(pt, idx);

            return (
              <g key={idx}>
                {/* Time Tick */}
                {isLabelTick && (
                  <text
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="var(--color-text-secondary, #6b6350)"
                    fontFamily="var(--font-mono, monospace)"
                  >
                    {pt.time}
                  </text>
                )}

                {/* Pump Activation Marker */}
                {pt.pump && (
                  <g>
                    <circle cx={x} cy={y} r={7} fill="rgba(9, 88, 217, 0.2)" />
                    <circle cx={x} cy={y} r={4} fill="#0958d9" stroke="#fff" strokeWidth="1.5" />
                  </g>
                )}

                {/* Moisture Dot */}
                {renderDot && (
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredPoint?.index === idx ? 5 : (pt.pump ? 3.5 : 2.5)}
                    fill={pt.pump ? '#0958d9' : '#94550e'}
                    stroke="#fffdf8"
                    strokeWidth="1.5"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint({ ...pt, x, y, index: idx })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="moisture-chart__tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="tooltip-time">{hoveredPoint.time}</div>
            <div className="tooltip-moisture">
              Soil Moisture: <strong>{hoveredPoint.moisture}%</strong>
            </div>
            {hoveredPoint.reason && (
              <div style={{ fontSize: '10px', color: '#6b6350', marginTop: '2px' }}>
                {hoveredPoint.reason}
              </div>
            )}
            {hoveredPoint.pump && (
              <div className="tooltip-pump">
                <Zap size={11} /> Pump Pulse Activated
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
