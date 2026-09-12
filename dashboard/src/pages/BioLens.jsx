import BioLensPanel from '../components/biolens/BioLensPanel.jsx'
import './BioLens.css'

export default function BioLens() {
  return (
    <div className="biolens-page">
      <header className="biolens-page__header">
        <h1>BioLens</h1>
        <p>
          A prototype for image-based plant health scanning. Point BioLens at a plant to get a
          quick visual read on leaf color, posture, and pest signs — a future companion to the
          soil-sensor AI reasoning on the Dashboard.
        </p>
      </header>

      <BioLensPanel />
    </div>
  )
}
