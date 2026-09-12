// Small shared botanical illustration system.
//
// All 12 inventory plants render from ONE of a handful of leaf-cluster
// "shapes" (broadleaf / splitleaf / blade / trailing), each tinted with one
// of the existing palette tokens (olive / sage / botanical). This keeps
// every plant visually part of the same family instead of needing 12 bespoke
// illustrations, and the same shape+color pairing is intended to be reused
// by the Level 4 digital twin so the selected plant stays visually
// consistent across the dashboard.
//
// Pure presentational SVG — no external images, no photographs.

const PALETTE = {
  olive: 'var(--color-olive)',
  sage: 'var(--color-sage)',
  botanical: 'var(--color-botanical)',
}

function Pot({ fill }) {
  return (
    <path
      d="M20 40 L44 40 L41 54 C41 56.2 38 58 32 58 C26 58 23 56.2 23 54 Z"
      fill={fill}
      opacity="0.9"
    />
  )
}

function BroadleafShape({ color }) {
  return (
    <g>
      <path d="M32 40 C32 26 22 20 14 18 C16 28 22 37 32 40 Z" fill={color} />
      <path d="M32 40 C32 24 42 18 51 16 C49 27 42 37 32 40 Z" fill={color} opacity="0.82" />
      <path d="M32 40 C30 22 34 12 32 4 C36 12 38 24 32 40 Z" fill={color} opacity="0.65" />
    </g>
  )
}

function SplitleafShape({ color }) {
  return (
    <g>
      <path
        d="M32 40 C22 38 12 30 12 18 C20 18 26 24 29 32 L27 20 C31 22 33 28 32 40 Z"
        fill={color}
      />
      <path
        d="M32 40 C42 38 52 30 52 18 C44 18 38 24 35 32 L37 20 C33 22 31 28 32 40 Z"
        fill={color}
        opacity="0.82"
      />
      <path d="M32 40 C31 26 32 14 32 4 C34 14 34 26 32 40 Z" fill={color} opacity="0.6" />
    </g>
  )
}

function BladeShape({ color }) {
  const blades = [
    { x: 32, rot: 0, h: 40, o: 1 },
    { x: 32, rot: -18, h: 36, o: 0.85 },
    { x: 32, rot: 18, h: 36, o: 0.85 },
    { x: 32, rot: -32, h: 28, o: 0.65 },
    { x: 32, rot: 32, h: 28, o: 0.65 },
  ]
  return (
    <g>
      {blades.map((b, i) => (
        <path
          key={i}
          d={`M32 40 C31 ${40 - b.h * 0.6} 31 ${40 - b.h * 0.9} 32 ${40 - b.h} C33 ${
            40 - b.h * 0.9
          } 33 ${40 - b.h * 0.6} 32 40 Z`}
          fill={color}
          opacity={b.o}
          transform={`rotate(${b.rot} 32 40)`}
        />
      ))}
    </g>
  )
}

function TrailingShape({ color }) {
  return (
    <g>
      <path d="M32 40 C22 36 10 34 6 24 C16 24 26 28 32 36 Z" fill={color} />
      <path d="M32 40 C42 36 54 34 58 24 C48 24 38 28 32 36 Z" fill={color} opacity="0.82" />
      <path d="M32 40 C30 32 30 24 32 14 C34 24 34 32 32 40 Z" fill={color} opacity="0.65" />
      <circle cx="14" cy="26" r="2.4" fill={color} opacity="0.5" />
      <circle cx="50" cy="26" r="2.4" fill={color} opacity="0.5" />
    </g>
  )
}

const SHAPES = {
  broadleaf: BroadleafShape,
  splitleaf: SplitleafShape,
  blade: BladeShape,
  trailing: TrailingShape,
}

export default function PlantIllustration({
  shape = 'broadleaf',
  color = 'olive',
  size = 52,
  showPot = false,
  droop = 0,
  className = '',
}) {
  const ShapeComponent = SHAPES[shape] ?? BroadleafShape
  const fill = PALETTE[color] ?? PALETTE.olive

  // droop: 0 (healthy, upright) .. 4 (critical, strongly wilted). The same
  // shape/color pairing bends further over its pot and desaturates slightly
  // as condition worsens, rather than swapping to a different illustration —
  // per spec, "the same plant illustration should transition between states."
  const clampedDroop = Math.max(0, Math.min(4, droop))
  const droopRatio = clampedDroop / 4
  const rotation = clampedDroop * 7
  const filterStyle =
    clampedDroop === 0
      ? undefined
      : { filter: `saturate(${1 - droopRatio * 0.45}) grayscale(${droopRatio * 0.35})` }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={filterStyle}
    >
      {showPot && <Pot fill="var(--color-sand)" />}
      <g
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: '32px 44px',
          transition: 'transform 0.4s ease',
        }}
      >
        <ShapeComponent color={fill} />
      </g>
    </svg>
  )
}
