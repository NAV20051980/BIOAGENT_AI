import React, { useEffect, useState } from 'react';
import { Droplets, Leaf, TrendingDown, Clock, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * WaterSavingsCard Component
 * Modern, clean, and cohesive Environmental Impact visualizer matching
 * the BioAgent botanical warm theme with clear metric tiles, CO2 reduction highlight,
 * dual usage comparison bar, and timeframe controls.
 */
export default function WaterSavingsCard() {
  const [savings, setSavings] = useState(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');
        const response = await fetch(`/api/water-savings?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch savings');

        const data = await response.json();
        setSavings(data);
      } catch (err) {
        console.error('Water savings fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavings();
  }, [period]);

  if (loading && !savings) {
    return (
      <div
        className="card"
        style={{
          background: '#f9f6f0',
          border: '1px solid #d4b87a',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '280px',
          color: '#7a6244',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '3px solid #ebdcc0',
            borderTopColor: '#5a8a3a',
            borderRadius: '50%',
            animation: 'plantHealthSpin 0.9s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.88rem' }}>Loading ecological impact data…</span>
      </div>
    );
  }

  if (!savings) return null;

  const actualLiters = Number(savings.actual_usage_liters || 0);
  const manualLiters = Number(savings.manual_estimate_liters || 60);
  const actualRatioPct = manualLiters > 0 ? Math.min(100, Math.max(3, (actualLiters / manualLiters) * 100)) : 0;

  return (
    <div
      className="card"
      style={{
        background: '#f9f6f0',
        border: '1px solid #d4b87a',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 1px 4px rgba(45, 31, 14, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        height: '100%',
        boxSizing: 'border-box',
        color: '#2d1f0e',
      }}
    >
      {/* Header with Title & Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#e8edd8',
              color: '#4a752c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Leaf size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#2d1f0e' }}>
              Environmental Impact
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#8c7355', fontWeight: 500 }}>
              AI Closed-Loop Conservation
            </span>
          </div>
        </div>

        {/* Timeframe Selector Pill Group */}
        <div
          style={{
            display: 'flex',
            background: '#ebdcc0',
            padding: '3px',
            borderRadius: '8px',
            gap: '3px',
          }}
        >
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              type="button"
              style={{
                background: period === d ? '#5a8a3a' : 'transparent',
                color: period === d ? '#ffffff' : '#634e34',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: period === d ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric Tiles: Water Saved & Cost Saved */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {/* Tile 1: Water Saved */}
        <div
          style={{
            background: '#fffdf8',
            border: '1px solid #ebdcc0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                background: '#e3f2fd',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Droplets size={13} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d5437' }}>
              Water Conserved
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1565c0', lineHeight: 1.1 }}>
            {Number(savings.water_saved_liters || 0).toFixed(1)}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '2px' }}>L</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 600 }}>
            +{savings.percentage_saved}% saved vs manual
          </span>
        </div>

        {/* Tile 2: Cost Saved */}
        <div
          style={{
            background: '#fffdf8',
            border: '1px solid #ebdcc0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                background: '#e8f5e9',
                color: '#2e7d32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingDown size={13} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d5437' }}>
              Utility Savings
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2e7d32', lineHeight: 1.1 }}>
            ₹{Number(savings.cost_saved_inr || 0).toFixed(2)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#8c7355', fontWeight: 500 }}>
            over past {savings.period_days} days
          </span>
        </div>
      </div>

      {/* CO2 Reduction Dedicated Highlight Banner */}
      <div
        style={{
          background: '#f3f7ec',
          border: '1px solid #cde0bd',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#5a8a3a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(90, 138, 58, 0.25)',
          }}
        >
          <Leaf size={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2e7d32' }}>
              {Number(savings.co2_saved_kg || 0).toFixed(2)} kg CO₂
            </span>
            <span style={{ fontSize: '0.74rem', color: '#4b6833', fontWeight: 600 }}>
              Offset Achieved
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6d5437' }}>
            Equivalent to <strong>{savings.co2_equivalent_km} km</strong> avoided in passenger vehicle travel
          </span>
        </div>
      </div>

      {/* Usage Comparison Dual Bar */}
      <div
        style={{
          background: '#fffdf8',
          border: '1px solid #ebdcc0',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4a3721' }}>
            Consumption Comparison
          </span>
          <span style={{ fontSize: '0.7rem', color: '#8c7355' }}>
            {period}-Day Accumulated
          </span>
        </div>

        {/* Manual Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7a6244' }}>
            <span>Manual Schedule (Baseline)</span>
            <span style={{ fontWeight: 600, color: '#d4722a' }}>{manualLiters.toFixed(1)} L</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#ebdcc0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: '#d4722a', borderRadius: '3px' }} />
          </div>
        </div>

        {/* AI System Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7a6244' }}>
            <span>BioAgent AI Precision</span>
            <span style={{ fontWeight: 700, color: '#2e7d32' }}>{actualLiters.toFixed(1)} L</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#ebdcc0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${actualRatioPct}%`,
                height: '100%',
                background: '#2e7d32',
                borderRadius: '3px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Environmental Summary */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          background: '#fdfbf7',
          border: '1px dashed #d4b87a',
          textAlign: 'center',
          boxSizing: 'border-box',
          marginTop: 'auto',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: '#6d5437', lineHeight: 1.3, display: 'inline-block' }}>
          🌱 BioAgent AI telemetry prevents over-saturation, conserving fresh water and reducing carbon emissions.
        </span>
      </div>
    </div>
  );
}

