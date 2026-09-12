import { Cpu, Server, Sparkles, Droplets, Wifi, Monitor } from 'lucide-react'
import Panel from '../components/common/Panel.jsx'
import './About.css'

const PIPELINE_STEPS = [
  {
    icon: Cpu,
    title: 'Sensors',
    detail: 'ESP32-based soil and climate sensors read moisture, temperature, and humidity.',
  },
  {
    icon: Server,
    title: 'Backend',
    detail: 'A FastAPI service collects sensor readings and serves them to the reasoning agent.',
  },
  {
    icon: Sparkles,
    title: 'AI Reasoning',
    detail: "An agent compares live readings against each plant's ideal ranges and forecasted weather.",
  },
  {
    icon: Droplets,
    title: 'Irrigation Decision',
    detail: 'The agent recommends WATER or WAIT — a recommendation, distinct from hardware action.',
  },
  {
    icon: Wifi,
    title: 'Telemetry & History',
    detail: 'Outcomes and sensor context are logged, building the plant-care history record.',
  },
  {
    icon: Monitor,
    title: 'BioAgent Frontend',
    detail: 'This dashboard visualizes the whole loop for every plant in the garden.',
  },
]

const PRINCIPLES = [
  {
    title: 'Sensor-driven, not guesswork',
    detail:
      'Every decision traces back to a real soil-moisture reading and a plant-specific ideal range — never a generic watering schedule.',
  },
  {
    title: 'Environmental awareness',
    detail:
      'Weather and forecasted rainfall are factored in, so BioAgent can hold off watering when rain is already on the way.',
  },
  {
    title: 'Recommendation, not autopilot',
    detail:
      'The AI decides what should happen. Executing that decision on real hardware is a distinct, separately verified step.',
  },
]

export default function About() {
  return (
    <div className="about-page">
      <header className="about-page__hero">
        <h1>BioAgent AI</h1>
        <p>
          BioAgent AI is an autonomous plant-care system that pairs soil and climate sensors with
          an AI reasoning agent, so every plant is watered based on its own real conditions — not
          a fixed schedule.
        </p>
      </header>

      <Panel className="about-page__section">
        <p className="about-page__eyebrow">How It Works</p>
        <div className="about-page__pipeline">
          {PIPELINE_STEPS.map((step) => (
            <div className="about-page__pipeline-step" key={step.title}>
              <div className="about-page__pipeline-icon">
                <step.icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="about-page__pipeline-title">{step.title}</p>
              <p className="about-page__pipeline-detail">{step.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="about-page__section">
        <p className="about-page__eyebrow">Principles</p>
        <div className="about-page__principles">
          {PRINCIPLES.map((principle) => (
            <div className="about-page__principle" key={principle.title}>
              <p className="about-page__principle-title">{principle.title}</p>
              <p className="about-page__principle-detail">{principle.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="about-page__section about-page__status">
        <p className="about-page__eyebrow">Current Status</p>
        <p className="about-page__status-text">
          This frontend currently runs entirely on structured mock data. Sensors, the FastAPI
          backend, and hardware irrigation are not yet connected — the architecture is designed to
          make that integration a drop-in addition, not a rebuild.
        </p>
      </Panel>
    </div>
  )
}