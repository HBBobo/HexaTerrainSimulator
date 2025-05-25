// src/components/HexMap/ui/BuildingPalette.jsx
import React from 'react';
import { BUILDING_TYPES } from '../constants';

const buildingDisplayNames = {
    [BUILDING_TYPES.HOUSE]: "House",
    [BUILDING_TYPES.FARM]: "Farm",
    [BUILDING_TYPES.CAMPFIRE]: "Campfire",
    [BUILDING_TYPES.MINE]: "Mine",
    [BUILDING_TYPES.HARBOUR]: "Harbour (WIP)",
};

const BuildingPalette = ({ selectedTile, onBuild, onCancel, existingBuildingType }) => {
    if (!selectedTile) return null;

    const availableBuildingTypes = Object.values(BUILDING_TYPES);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'sans-serif',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center',
            minWidth: '200px',
        }}>
            <h4>Build on Tile ({selectedTile.c}, {selectedTile.r})</h4>
            {existingBuildingType && <p>Current: {buildingDisplayNames[existingBuildingType] || existingBuildingType}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {availableBuildingTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => onBuild(selectedTile, type)}
                        disabled={existingBuildingType === type} // Disable if already this type
                        style={{
                            padding: '8px 12px',
                            backgroundColor: existingBuildingType === type ? '#555' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        {buildingDisplayNames[type] || type}
                    </button>
                ))}
            </div>
            <button
                onClick={onCancel}
                style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
            >
                Cancel
            </button>
        </div>
    );
};

export default BuildingPalette;