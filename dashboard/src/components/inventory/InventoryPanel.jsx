import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Panel from '../common/Panel.jsx';
import PlantIllustration from '../common/PlantIllustration.jsx';
import { useBioAgent } from '../../context/BioAgentContext.jsx';
import { API_BASE_URL, getToken } from '../../api.js';
import { Camera, Check, Sprout, Sparkles } from 'lucide-react';
import './InventoryPanel.css';

export default function InventoryPanel({ selectedPlantId, onSelectPlant }) {
  const {
    userPlants: contextPlants,
    activePlant,
    setActivePlant,
    refreshUserPlants,
  } = useBioAgent();

  const [userPlants, setUserPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Normalize plant item from database / API
  const normalizePlant = (p) => {
    const id = p.id;
    const species = p.species || p.name || 'Plant';
    const scientificName = p.scientific_name || p.scientificName || p.commonName || species;
    const idealMin = p.ideal_moisture_min ?? p.idealMoistureMin ?? 40;
    const idealMax = p.ideal_moisture_max ?? p.idealMoistureMax ?? 60;

    return {
      id,
      user_id: p.user_id,
      species,
      name: species,
      scientific_name: scientificName,
      scientificName,
      commonName: scientificName,
      confidence: p.confidence,
      ideal_moisture_min: idealMin,
      ideal_moisture_max: idealMax,
      idealMoistureMin: idealMin,
      idealMoistureMax: idealMax,
      growthStage: p.growthStage || 'Vegetative Growth',
      week: p.week || 1,
      illustration: p.illustration || { shape: 'broadleaf', color: 'botanical' },
      description: p.description || `Active specimen calibrated for autonomous Groq AI irrigation.`,
    };
  };

  // Fetch plants on mount
  const fetchPlants = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Try /user-plants, fallback to /api/user-plants
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/user-plants`, { headers });
      } catch {
        res = await fetch(`${API_BASE_URL}/api/user-plants`, { headers });
      }

      if (res && res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.plants || []);
        const normalized = rawList.map(normalizePlant);
        setUserPlants(normalized);

        if (normalized.length > 0) {
          // If no active plant or active plant not in list, select the first
          setActivePlant((prev) => {
            const exists = prev && normalized.find((np) => np.id === prev.id || np.name === prev.name);
            return exists || normalized[0];
          });
        }
      } else {
        setUserPlants([]);
      }
    } catch (err) {
      console.warn('Error fetching user plants in InventoryPanel:', err);
      setUserPlants([]);
    } finally {
      setLoading(false);
    }
  }, [setActivePlant]);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  // Sync if context userPlants updates (e.g. when BioLens adds a new plant)
  useEffect(() => {
    if (Array.isArray(contextPlants) && contextPlants.length > 0) {
      const normalized = contextPlants.map(normalizePlant);
      setUserPlants(normalized);
    }
  }, [contextPlants]);

  // Identify currently selected plant
  const selectedPlant = userPlants.find((p) => p.id === selectedPlantId || p.id === activePlant?.id)
    || userPlants[0]
    || null;

  const handleSelect = (plant) => {
    if (setActivePlant) setActivePlant(plant);
    if (onSelectPlant) onSelectPlant(plant.id);
  };

  return (
    <Panel className="inventory-panel">
      <div className="inventory-panel__header-row">
        <h1 className="inventory-panel__title">Inventory</h1>
        <span className="inventory-panel__count">
          {userPlants.length} {userPlants.length === 1 ? 'Plant' : 'Plants'}
        </span>
      </div>

      <div className="inventory-panel__body">
        {loading && userPlants.length === 0 ? (
          <div className="inventory-panel__loading">
            <p>Loading your plants...</p>
          </div>
        ) : userPlants.length === 0 ? (
          /* Empty state when user has no plants */
          <div className="inventory-panel__empty">
            <div className="inventory-panel__empty-icon">
              <Sprout size={28} color="var(--color-olive, #6e7a4e)" />
            </div>
            <p className="inventory-panel__empty-text">
              No plants yet. Use BioLens to add one.
            </p>
            <Link to="/biolens" className="inventory-panel__add-btn">
              <Camera size={15} />
              <span>Identify with BioLens</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Spotlight section for the currently selected plant */}
            {selectedPlant && (
              <div className="inventory-panel__spotlight">
                <div className="inventory-panel__spotlight-top">
                  <p className="inventory-panel__eyebrow">Currently Selected Plant</p>
                  <span className="inventory-panel__active-badge">
                    <Check size={11} strokeWidth={3} />
                    Active
                  </span>
                </div>

                <div className="inventory-panel__spotlight-header">
                  <div className="inventory-panel__illustration">
                    <PlantIllustration
                      shape={selectedPlant.illustration?.shape || 'broadleaf'}
                      color={selectedPlant.illustration?.color || 'botanical'}
                      size={48}
                    />
                  </div>
                  <div>
                    <h2 className="inventory-panel__plant-name">{selectedPlant.species || selectedPlant.name}</h2>
                    <p className="inventory-panel__plant-common-name">
                      {selectedPlant.scientific_name || selectedPlant.scientificName}
                    </p>
                  </div>
                </div>

                <div className="inventory-panel__facts">
                  <div className="inventory-panel__fact">
                    <span>Ideal Moisture</span>
                    <strong>
                      {selectedPlant.ideal_moisture_min}–{selectedPlant.ideal_moisture_max}%
                    </strong>
                  </div>
                  <div className="inventory-panel__fact">
                    <span>Confidence</span>
                    <strong>
                      {selectedPlant.confidence ? `${Math.round(selectedPlant.confidence)}%` : 'Edge Profile'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* List of user's plants */}
            <div className="inventory-panel__grid-area">
              <p className="inventory-panel__eyebrow">My Plants ({userPlants.length})</p>
              <div className="inventory-panel__grid">
                {userPlants.map((plant) => {
                  const isSelected = selectedPlant && plant.id === selectedPlant.id;
                  return (
                    <button
                      type="button"
                      key={plant.id}
                      className={`inventory-panel__card${
                        isSelected ? ' inventory-panel__card--selected' : ''
                      }`}
                      onClick={() => handleSelect(plant)}
                      aria-pressed={isSelected}
                      title={`Select ${plant.species || plant.name}`}
                    >
                      {isSelected && (
                        <span className="inventory-panel__card-active-tag">
                          <Check size={9} strokeWidth={3} /> Active
                        </span>
                      )}
                      <PlantIllustration
                        shape={plant.illustration?.shape || 'broadleaf'}
                        color={plant.illustration?.color || 'botanical'}
                        size={32}
                      />
                      <span className="inventory-panel__card-name">
                        {plant.species || plant.name}
                      </span>
                      <span className="inventory-panel__card-moisture">
                        {plant.ideal_moisture_min}–{plant.ideal_moisture_max}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
