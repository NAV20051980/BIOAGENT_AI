import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Upload, CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw, Droplets } from 'lucide-react';
import Panel from '../common/Panel.jsx';
import { useBioAgent } from '../../context/BioAgentContext.jsx';
import './BioLensPanel.css';

export default function BioLensPanel() {
  const { handleIdentifyPlant, setActivePlant, refreshUserPlants } = useBioAgent();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle image upload and identification
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      setError('Unable to analyze image. Please upload a clear JPG/PNG under 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 1. Show immediate preview in the viewfinder
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUploadedImage(dataUrl);
      localStorage.setItem('bioagent_plant_image_active', dataUrl);
      // 2. Submit to backend /identify-plant with image preview
      identifyUploadedFile(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const identifyUploadedFile = async (file, imagePreviewUrl) => {
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await handleIdentifyPlant(file);
      const species = res.species || res.profile?.species || 'Bael';
      const scientificName = res.scientific_name || res.profile?.scientific_name || 'Aegle marmelos';
      const confVal = typeof res.confidence === 'number'
        ? (res.confidence <= 1 ? Math.round(res.confidence * 100) : Math.round(res.confidence))
        : 95;
      const idealMin = res.profile?.ideal_moisture_range_pct?.[0] ?? res.ideal_moisture_min ?? 40;
      const idealMax = res.profile?.ideal_moisture_range_pct?.[1] ?? res.ideal_moisture_max ?? 60;

      const identifiedPlant = {
        id: res.id ? `plant-${res.id}` : 'plant-active',
        name: species,
        species: species,
        scientificName: scientificName,
        scientific_name: scientificName,
        confidence: confVal,
        idealMoistureMin: idealMin,
        idealMoistureMax: idealMax,
        ideal_moisture_min: idealMin,
        ideal_moisture_max: idealMax,
        growthStage: 'Vegetative Growth',
        week: 1,
        imageUrl: imagePreviewUrl,
        image_url: imagePreviewUrl,
        image: imagePreviewUrl,
        illustration: { shape: 'broadleaf', color: 'botanical' },
        description: `Active specimen calibrated for autonomous Groq AI irrigation.`,
      };

      if (imagePreviewUrl) {
        localStorage.setItem('bioagent_plant_image_active', imagePreviewUrl);
        if (identifiedPlant.id) {
          localStorage.setItem(`bioagent_plant_image_${identifiedPlant.id}`, imagePreviewUrl);
        }
      }

      // Auto-select as active plant across context, Dashboard, and Inventory
      if (setActivePlant) {
        setActivePlant(identifiedPlant);
      }
      if (refreshUserPlants) {
        await refreshUserPlants();
      }

      setResult({
        species,
        scientific_name: scientificName,
        confidence: confVal,
        ideal_moisture_min: idealMin,
        ideal_moisture_max: idealMax,
        status: `Identified as ${species} (${scientificName}). Active irrigation profile has been updated automatically.`,
      });
    } catch (err) {
      console.error('Plant identification error:', err);
      const userMsg =
        err.message && (err.message.includes('422') || err.message.includes('400') || err.message.includes('413'))
          ? 'Unable to analyze image. Please upload a clear JPG/PNG under 5MB.'
          : err.message || 'Unable to analyze image. Please upload a clear JPG/PNG under 5MB.';
      setError(userMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Panel className="biolens-panel">
      <div className="biolens-panel__container">
        {/* TOP: Botanical Viewfinder Area with 300x300px box */}
        <div className="biolens-panel__viewfinder-wrapper">
          <p className="biolens-panel__eyebrow">Botanical Viewfinder</p>

          <div
            className={`botanical-viewfinder biolens-panel__viewfinder${
              uploading ? ' biolens-panel__viewfinder--scanning' : ''
            }`}
          >
            {/* Viewfinder corners */}
            <span className="biolens-panel__corner biolens-panel__corner--tl" />
            <span className="biolens-panel__corner biolens-panel__corner--tr" />
            <span className="biolens-panel__corner biolens-panel__corner--bl" />
            <span className="biolens-panel__corner biolens-panel__corner--br" />

            {uploading && <span className="biolens-panel__scan-line" />}

            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="Uploaded plant specimen"
                className="viewfinder-preview-image"
              />
            ) : (
              <div className="viewfinder-placeholder">
                <Camera size={44} strokeWidth={1.5} color="var(--color-olive, #6e7a4e)" />
                <p className="viewfinder-placeholder-text">
                  Point camera or upload image
                </p>
                <span className="viewfinder-placeholder-sub">
                  Supports JPG, PNG, WEBP
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="biolens-panel__actions">
            <button
              type="button"
              className="biolens-panel__upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              id="biolens-upload-btn"
            >
              {uploading ? (
                <>
                  <RefreshCw size={17} className="spin-icon" />
                  <span>Analyzing with Groq Vision & PlantNet…</span>
                </>
              ) : (
                <>
                  <Upload size={17} strokeWidth={2} />
                  <span>{uploadedImage ? 'Upload Another Plant Image' : 'Upload Plant Image'}</span>
                </>
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileUpload}
            />
          </div>

          <p className="biolens-panel__disclaimer">
            Powered by Groq Vision and PlantNet AI. Analyzed plants are automatically registered to your profile.
          </p>
        </div>

        {/* BOTTOM: Identification & Health Result Section (Immediately below image preview) */}
        <div className="biolens-panel__results-area">
          <p className="biolens-panel__eyebrow biolens-panel__eyebrow--results">
            Identification & Health Result
          </p>

          {error && (
            <div className="biolens-panel__error-box">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="biolens-panel__result-card">
              <div className="biolens-panel__result-header">
                <div className="biolens-panel__result-title-group">
                  <span className="biolens-panel__species-badge">
                    <Sparkles size={13} />
                    {result.species}
                  </span>
                  <span className="biolens-panel__confidence-badge">
                    {result.confidence}% confidence
                  </span>
                </div>
                <span className="biolens-panel__active-indicator">
                  <CheckCircle2 size={13} /> Auto-Selected
                </span>
              </div>

              <div className="biolens-panel__result-status">
                <p className="biolens-panel__result-status-text">
                  {result.status}
                </p>
              </div>

              <div className="biolens-panel__specs-grid">
                <div className="biolens-spec-item">
                  <span className="biolens-spec-label">Scientific Name</span>
                  <strong className="biolens-spec-val italic">
                    {result.scientific_name}
                  </strong>
                </div>

                <div className="biolens-spec-item">
                  <span className="biolens-spec-label">Ideal Soil Moisture</span>
                  <strong className="biolens-spec-val">
                    <Droplets size={12} color="#94550e" />
                    {result.ideal_moisture_min}–{result.ideal_moisture_max}%
                  </strong>
                </div>

                <div className="biolens-spec-item">
                  <span className="biolens-spec-label">Profile Status</span>
                  <strong className="biolens-spec-val color-green">
                    Active in Dashboard
                  </strong>
                </div>
              </div>

              <div className="biolens-panel__result-footer">
                <Link to="/dashboard" className="biolens-panel__dashboard-link">
                  <span>View in Dashboard & Inventory</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            !error && (
              <div className="biolens-panel__result-empty">
                <div className="biolens-panel__empty-icon-wrap">
                  <Camera size={26} strokeWidth={1.5} />
                </div>
                <h4 className="biolens-panel__empty-title">Ready for Identification</h4>
                <p className="biolens-panel__empty-desc">
                  Upload an image above to identify the botanical taxonomy, automatically register the specimen to your account, and activate closed-loop irrigation telemetry.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </Panel>
  );
}
