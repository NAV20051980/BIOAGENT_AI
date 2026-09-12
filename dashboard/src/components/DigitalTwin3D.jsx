import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Procedurally generate curved botanical leaf geometry
function createLeafGeometry(length = 0.75, width = 0.35, curl = 0.14) {
  const shape = new THREE.Shape();
  const halfWidth = width / 2;

  // Base stem connection
  shape.moveTo(0, 0);
  // Curve outward to widest section and converge at apex
  shape.bezierCurveTo(halfWidth * 0.9, length * 0.25, halfWidth, length * 0.65, 0, length);
  shape.bezierCurveTo(-halfWidth, length * 0.65, -halfWidth * 0.9, length * 0.25, 0, 0);

  const geometry = new THREE.ShapeGeometry(shape, 20);
  const pos = geometry.attributes.position;

  // Arch and curl along Y and X axes for realistic 3D natural turgor
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const progress = Math.max(0, Math.min(1, y / length));
    // Longitudinal arching curl + transverse cupping
    const zArch = -Math.sin(progress * Math.PI) * curl - (x * x) * (0.4 / (width || 1));
    pos.setZ(i, zArch);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Individual Leaf with dynamic turgor droop & sway
function BotanicalLeaf({
  position,
  rotationY,
  basePitch = 0.8,
  scale = 1,
  phase = 0,
  moisture = 50,
  color = '#388e3c',
  accentColor = '#2e7d32',
}) {
  const pivotRef = useRef();
  const leafGeo = useMemo(() => createLeafGeometry(0.72 * scale, 0.34 * scale, 0.12 * scale), [scale]);

  useFrame((state) => {
    if (!pivotRef.current) return;

    // Droop increases progressively when soil moisture drops below 40%
    const droopFactor = moisture < 40 ? Math.min(1, (40 - moisture) / 40) : 0;
    // Droop pitches leaf down toward pot (up to +0.65 radians / ~37 deg)
    const targetDroop = droopFactor * 0.68;

    // Smooth subtle wind sway, dampened when drooped/limp
    const swaySpeed = 1.6;
    const swayAmount = 0.035 * (1 - droopFactor * 0.5);
    const sway = Math.sin(state.clock.elapsedTime * swaySpeed + phase) * swayAmount;

    // Lerp smoothly toward target combined rotation
    const currentX = pivotRef.current.rotation.x;
    const targetX = basePitch + targetDroop + sway;
    pivotRef.current.rotation.x = THREE.MathUtils.lerp(currentX, targetX, 0.08);

    // Slight lateral sway roll
    const rollSway = Math.cos(state.clock.elapsedTime * 1.2 + phase) * 0.02 * (1 - droopFactor * 0.4);
    pivotRef.current.rotation.z = THREE.MathUtils.lerp(pivotRef.current.rotation.z, rollSway, 0.08);
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={pivotRef} rotation={[basePitch, 0, 0]}>
        {/* Leaf blade */}
        <mesh geometry={leafGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Center vein highlight */}
        <mesh position={[0, 0.35 * scale, 0.005]} scale={[0.018 * scale, 0.68 * scale, 0.01]}>
          <boxGeometry />
          <meshStandardMaterial color={accentColor} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// 3D Plant Model containing Pot, Soil, Stems, and Leaves
function PlantModel({ moisture = 50 }) {
  const soilMatRef = useRef();

  // Color lerp references: dry beige (#C2B280) to rich dark earth (#2A1A0A)
  const drySoilColor = useMemo(() => new THREE.Color('#C2B280'), []);
  const wetSoilColor = useMemo(() => new THREE.Color('#2A1A0A'), []);

  // Update soil color and roughness dynamically based on moisture
  useFrame(() => {
    if (soilMatRef.current) {
      const clampedMoisture = Math.max(0, Math.min(100, moisture));
      const moistureRatio = clampedMoisture / 100;

      // Lerp color
      const targetColor = new THREE.Color().lerpColors(drySoilColor, wetSoilColor, moistureRatio);
      soilMatRef.current.color.lerp(targetColor, 0.08);

      // Higher moisture = lower roughness (moist/wet soil sheen)
      const targetRoughness = 0.95 - moistureRatio * 0.55;
      soilMatRef.current.roughness = THREE.MathUtils.lerp(
        soilMatRef.current.roughness,
        targetRoughness,
        0.08
      );
    }
  });

  // Botanical leaf arrangement (tiers with realistic radial phyllotaxis)
  const leaves = useMemo(
    () => [
      // Bottom tier (broad mature leaves)
      { pos: [0, 0.28, 0], rotY: 0, pitch: 0.92, scale: 1.15, phase: 0.0, color: '#2e7d32', accent: '#1b5e20' },
      { pos: [0, 0.30, 0], rotY: (Math.PI * 2) / 4, pitch: 0.88, scale: 1.10, phase: 1.4, color: '#388e3c', accent: '#2e7d32' },
      { pos: [0, 0.29, 0], rotY: (Math.PI * 2 * 2) / 4, pitch: 0.90, scale: 1.12, phase: 2.8, color: '#2e7d32', accent: '#1b5e20' },
      { pos: [0, 0.31, 0], rotY: (Math.PI * 2 * 3) / 4, pitch: 0.86, scale: 1.08, phase: 4.2, color: '#388e3c', accent: '#2e7d32' },

      // Mid tier (vibrant active leaves, offset radial rotation)
      { pos: [0, 0.44, 0], rotY: Math.PI / 4, pitch: 0.75, scale: 0.95, phase: 0.7, color: '#43a047', accent: '#2e7d32' },
      { pos: [0, 0.46, 0], rotY: (Math.PI / 4) + (Math.PI / 2), pitch: 0.72, scale: 0.92, phase: 2.1, color: '#4caf50', accent: '#388e3c' },
      { pos: [0, 0.45, 0], rotY: (Math.PI / 4) + Math.PI, pitch: 0.76, scale: 0.94, phase: 3.5, color: '#43a047', accent: '#2e7d32' },
      { pos: [0, 0.47, 0], rotY: (Math.PI / 4) + (Math.PI * 3) / 2, pitch: 0.70, scale: 0.90, phase: 4.9, color: '#4caf50', accent: '#388e3c' },

      // Top tier (young fresh leaves)
      { pos: [0, 0.58, 0], rotY: 0.35, pitch: 0.52, scale: 0.75, phase: 1.0, color: '#66bb6a', accent: '#43a047' },
      { pos: [0, 0.60, 0], rotY: 0.35 + Math.PI * 0.65, pitch: 0.48, scale: 0.72, phase: 2.5, color: '#81c784', accent: '#4caf50' },
      { pos: [0, 0.62, 0], rotY: 0.35 + Math.PI * 1.35, pitch: 0.45, scale: 0.68, phase: 4.0, color: '#66bb6a', accent: '#43a047' },
    ],
    []
  );

  return (
    <group position={[0, -0.42, 0]}>
      {/* --- MODERN CERAMIC POT --- */}
      {/* Outer pot body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.40, 0.70, 36]} />
        <meshStandardMaterial color="#f0f3ee" roughness={0.3} metalness={0.08} />
      </mesh>

      {/* Pot top rim lip */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.57, 0.54, 0.06, 36]} />
        <meshStandardMaterial color="#e5eae2" roughness={0.25} metalness={0.1} />
      </mesh>

      {/* Pot base saucer */}
      <mesh position={[0, -0.36, 0]} receiveShadow>
        <cylinderGeometry args={[0.48, 0.50, 0.05, 36]} />
        <meshStandardMaterial color="#dfe5dc" roughness={0.35} />
      </mesh>

      {/* --- DYNAMIC SOIL LAYER --- */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
        <cylinderGeometry args={[0.50, 0.49, 0.06, 36]} />
        <meshStandardMaterial ref={soilMatRef} color="#7a6b52" roughness={0.8} />
      </mesh>

      {/* --- CENTRAL STEM --- */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.048, 0.38, 16]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.64, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.032, 0.22, 16]} />
        <meshStandardMaterial color="#40916c" roughness={0.4} />
      </mesh>

      {/* --- BOTANICAL LEAVES --- */}
      {leaves.map((leaf, idx) => (
        <BotanicalLeaf
          key={idx}
          position={leaf.pos}
          rotationY={leaf.rotY}
          basePitch={leaf.pitch}
          scale={leaf.scale}
          phase={leaf.phase}
          moisture={moisture}
          color={leaf.color}
          accentColor={leaf.accent}
        />
      ))}
    </group>
  );
}

/**
 * DigitalTwin3D Component
 * Interactive 3D Digital Twin with Three.js / React Three Fiber.
 * Includes dynamic leaf turgor droop, soil moisture color shift, and humidity mist sparkles.
 */
export default function DigitalTwin3D({
  moisture = 50,
  humidity = 50,
  temperature = 24,
  plant = null,
  telemetry = null,
  className = '',
  style = {},
}) {
  // Normalize moisture and humidity inputs from direct props or telemetry object
  const effectiveMoisture = Number(
    moisture ??
    telemetry?.soil_moisture_pct ??
    telemetry?.soil_moisture ??
    telemetry?.soilMoisture ??
    50
  );

  const effectiveHumidity = Number(
    humidity ??
    telemetry?.humidity_pct ??
    telemetry?.humidity ??
    50
  );

  const effectiveTemp = Number(
    temperature ??
    telemetry?.temperature_c ??
    telemetry?.temperature ??
    24
  );

  const sparkleCount = Math.max(0, Math.floor(effectiveHumidity * 0.7));
  const sparkleOpacity = Math.min(0.8, Math.max(0.1, effectiveHumidity / 100));

  return (
    <div
      className={`digital-twin-3d-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '260px',
        overflow: 'hidden',
        borderRadius: 'var(--radius-md, 16px)',
        background: 'radial-gradient(circle at 50% 40%, rgba(245, 249, 246, 0.95), rgba(232, 240, 235, 0.65))',
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 1.2, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.75} color="#f4fbf7" />

        {/* Directional sun light */}
        <directionalLight
          position={[3, 5, 2]}
          intensity={1.3}
          color="#ffffff"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {/* Botanical point light accents */}
        <pointLight position={[-2, 1.2, -1]} intensity={0.7} color="#7ee787" />
        <pointLight position={[2, 2.2, 1.5]} intensity={0.5} color="#b0efff" />

        {/* Interactive 3D Potted Botanical Plant */}
        <PlantModel moisture={effectiveMoisture} />

        {/* Humidity Mist Particles */}
        <Sparkles
          count={sparkleCount}
          scale={[1.8, 2, 1.8]}
          size={2.5}
          speed={0.3}
          opacity={sparkleOpacity}
          color="#b0efff"
        />

        {/* OrbitControls */}
        <OrbitControls
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.6}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}
