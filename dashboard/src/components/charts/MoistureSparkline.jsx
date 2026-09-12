import { useMemo } from 'react';
import './MoistureSparkline.css';

export default function MoistureSparkline({
  data = [],
  currentMoisture = 45,
  idealMin = 40,
  idealMax = 60,
  showLabel = true,
}) {
  const currentVal = Math.round(Number(currentMoisture) || 45);

  // Determine line & badge color based on active ideal range
  let statusColor = '#2e7d32'; // In ideal range
  let statusLabel = 'In Ideal Range';
  if (currentVal < idealMin) {
    statusColor = '#d46b08'; // Below min (dry)
    statusLabel = 'Below Min';
  } else if (currentVal > idealMax) {
    statusColor = '#cf1322'; // Above max (wet)
    statusLabel = 'Above Max';
  }

  // Prepare 12-24 readings points
  const points = useMemo(() => {
    if (Array.isArray(data) && data.length >= 2) {
      return data.slice(-24).map((d) => ({
        timestamp: d.timestamp || Date.now(),
        moisture: Math.round(d.moisture ?? d.soil_moisture ?? d.soil_moisture_pct ?? currentVal),
      }));
    }

    // Default synthetic 12-reading trend leading to currentVal
    const base = currentVal;
    const offsets = [-4, -3, -2, -1, 1, 0, -2, -3, -1, 0, 1, 0];
    const now = Date.now();
    return offsets.map((off, i) => ({
      timestamp: now - (offsets.length - 1 - i) * 30000,
      moisture: Math.max(5, Math.min(95, base + off)),
    }));
  }, [data, currentVal]);

  // Compute trend direction (up, down, stable)
  const firstVal = points[0]?.moisture ?? currentVal;
  const lastVal = points[points.length - 1]?.moisture ?? currentVal;
  const trendDiff = lastVal - firstVal;
  const trendArrow = trendDiff > 1 ? '↑' : trendDiff < -1 ? '↓' : '→';

  // SVG dimensions
  const width = 280;
  const height = 40;
  const paddingX = 4;
  const paddingY = 4;
  const yMin = 0;
  const yMax = 100;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (idx) => paddingX + (idx / Math.max(1, points.length - 1)) * chartW;
  const getY = (val) => paddingY + chartH - ((Math.max(0, Math.min(100, val)) - yMin) / (yMax - yMin)) * chartH;

  const yIdealMin = getY(idealMin);
  const yIdealMax = getY(idealMax);
  const idealH = Math.max(2, yIdealMin - yIdealMax);

  // Generate SVG path
  const pathD = points.reduce((acc, pt, idx) => {
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

  return (
    <div className="moisture-sparkline-container">
      {showLabel && (
        <div className="sparkline-header">
          <span className="sparkline-title">Moisture Sparkline</span>
          <span
            className="sparkline-badge"
            style={{
              background: `${statusColor}18`,
              color: statusColor,
              borderColor: `${statusColor}40`,
            }}
          >
            {currentVal}% {trendArrow} • {statusLabel}
          </span>
        </div>
      )}

      <div className="sparkline-canvas-box">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="sparkline-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Moisture sparkline showing ${currentVal}%`}
        >
          {/* Shaded Ideal Range Band */}
          <rect
            x={0}
            y={yIdealMax}
            width={width}
            height={idealH}
            fill="rgba(82, 196, 26, 0.12)"
            stroke="rgba(82, 196, 26, 0.25)"
            strokeDasharray="2 2"
          />

          {/* Sparkline Curve */}
          <path
            d={pathD}
            fill="none"
            stroke={statusColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current reading pulsing dot */}
          {points.length > 0 && (
            <circle
              cx={getX(points.length - 1)}
              cy={getY(points[points.length - 1].moisture)}
              r="3.5"
              fill={statusColor}
              stroke="#fffdf8"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
