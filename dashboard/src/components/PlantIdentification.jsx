import React, { useState, useRef } from 'react';
import { Camera, Upload, Image, CheckCircle, AlertCircle, Sparkles, RefreshCw, Leaf, Info } from 'lucide-react';
import { identifyPlant, fetchPlantProfile } from '../api';

export default function PlantIdentification({
  plantProfile,
  setPlantProfile,
  onIdentificationSuccess,
  backendOnline
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [identifying, setIdentifying] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [identError, setIdentError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIdentificationResult(null);
      setIdentError(null);
    }
  };

  // Helper to create synthetic plant image canvas for testing without camera/files
  const handleGenerateSamplePlant = (plantType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#1e3a1e';
    ctx.fillRect(0, 0, 300, 300);

    // Draw stylized leaf / plant
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(150, 150, 60, 110, Math.PI / 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(150, 150, 40, 90, -Math.PI / 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${plantType.toUpperCase()} SAMPLE`, 150, 280);

    canvas.toBlob((blob) => {
      const file = new File([blob], `${plantType}_sample.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIdentificationResult(null);
      setIdentError(null);
    }, 'image/jpeg');
  };

  const handleRunIdentify = async () => {
    if (!selectedFile) {
      setIdentError('Please choose or capture an image first.');
      return;
    }

    setIdentifying(true);
    setIdentError(null);

    const res = await identifyPlant(selectedFile);
    setIdentifying(false);

    if (res.ok && res.data) {
      setIdentificationResult(res.data);
      // Refresh plant profile from backend source of truth
      const profileRes = await fetchPlantProfile();
      if (profileRes.ok) {
        setPlantProfile(profileRes.data);
      }
      if (onIdentificationSuccess) {
        onIdentificationSuccess(res.data);
      }
    } else {
      setIdentError(res.error || 'Plant identification failed. Backend or PyTorch model error.');
    }
  };

  const isGeneric = identificationResult?.species?.toLowerCase().includes('generic') || 
                    identificationResult?.species?.toLowerCase().includes('unidentified');

  const idealRange = plantProfile?.ideal_moisture_range_pct || [40, 65];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      {/* 1. Plant Image Upload & Classifier Test Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              Plant Identification & Vision Test
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              POST /identify-plant
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Upload or capture a leaf photo. Runs local MobileNetV3 / Vision inference, identifies species, and automatically activates the matching biological care profile.
          </p>

          {/* Upload Area / Image Preview */}
          <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 text-center transition-all bg-slate-950/50">
            {previewUrl ? (
              <div className="flex flex-col items-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-44 h-44 object-cover rounded-xl border border-slate-700 shadow-md mb-3"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                  >
                    Change Image
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                    {selectedFile?.name}
                  </span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-6 flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-slate-300">Click to upload plant photo</span>
                <span className="text-[11px] text-slate-500 mt-1">Supports JPG, PNG, WEBP</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Quick Sample Presets */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-500 font-mono">Test Presets:</span>
            {['monstera', 'cactus', 'fern', 'succulent', 'daisy'].map((plant) => (
              <button
                key={plant}
                onClick={() => handleGenerateSamplePlant(plant)}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-all capitalize"
              >
                {plant}
              </button>
            ))}
          </div>

          {/* Identification Error Notice */}
          {identError && (
            <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{identError}</span>
            </div>
          )}

          {/* Identification Result Box */}
          {identificationResult && (
            <div className="mt-4 p-3.5 bg-slate-950/90 border border-emerald-900/60 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Inference Complete
                </span>
                <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                  Confidence: {Math.round((identificationResult.confidence || 0) * 100)}%
                </span>
              </div>
              
              <div className="text-sm font-bold text-white mb-0.5">
                {identificationResult.species}
              </div>
              
              {identificationResult.raw_label && (
                <div className="text-xs text-slate-400 font-mono mb-1.5">
                  Classifier Label: <span className="text-slate-200">{identificationResult.raw_label}</span>
                </div>
              )}

              {isGeneric && (
                <div className="text-xs text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40 mt-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Ambiguous / non-plant match — Generic safe watering profile applied.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunIdentify}
          disabled={!selectedFile || identifying || !backendOnline}
          className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {identifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Neural Inference...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Plant Identification (POST /identify-plant)
            </>
          )}
        </button>
      </div>

      {/* 2. Active Plant Care Profile Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              Active Biological Care Profile
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              GET /plant-profile
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            The active plant biology parameters currently loaded into the LLM reasoning agent prompt.
          </p>

          <div className="space-y-3.5 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            
            {/* Species */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Target Species</span>
              <span className="text-base font-bold text-white">{plantProfile?.species || 'Monstera Deliciosa'}</span>
            </div>

            {/* Growth Stage */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Growth Stage</span>
              <span className="text-xs font-mono text-emerald-300 capitalize">{plantProfile?.growth_stage || 'active vegetative growth'}</span>
            </div>

            {/* Ideal Moisture Range */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ideal Soil Moisture Target</span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  {idealRange[0]}% – {idealRange[1]}%
                </span>
              </div>
              
              {/* Visual Moisture Target Range Bar */}
              <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 bg-emerald-500/80 rounded-full"
                  style={{
                    left: `${idealRange[0]}%`,
                    width: `${idealRange[1] - idealRange[0]}%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0% (Bone Dry)</span>
                <span className="text-emerald-400">Min: {idealRange[0]}%</span>
                <span className="text-emerald-400">Max: {idealRange[1]}%</span>
                <span>100% (Saturated)</span>
              </div>
            </div>

            {/* Care Notes */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Agronomic Guidelines</span>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                "{plantProfile?.notes || 'Prefers evenly moist soil; sensitive to drought stress and root rot from overwatering.'}"
              </p>
            </div>

          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-slate-800/60">
          <span>Source of Truth: FastAPI Backend</span>
          <span className="text-emerald-400 font-medium">✓ Live in Prompt</span>
        </div>
      </div>

    </div>
  );
}
