// src/components/HexMap/ui/BuildingPalette.jsx
import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { BUILDING_TYPES } from '../buildings/BuildingTypes';

const buildingDisplayNames = {
    [BUILDING_TYPES.HOUSE]: 'House',
    [BUILDING_TYPES.FARM]: 'Farm',
    [BUILDING_TYPES.MINE]: 'Mine',
    [BUILDING_TYPES.CAMPFIRE]: 'Campfire',
    [BUILDING_TYPES.HARBOUR]: 'Harbour',
};

// Convert degrees to radians for internal use
const degToRad = (degrees) => THREE.MathUtils.degToRad(degrees);
// Convert radians to degrees for display
const radToDeg = (radians) => THREE.MathUtils.radToDeg(radians);


const BuildingPalette = ({
    selectedTile,
    onBuild,
    onCancel,
    existingBuildingType,
    existingBuildingRotation, // in radians
    onUpdateBuilding,
    availableBuildingTypes
}) => {
    const [selectedRotationDegrees, setSelectedRotationDegrees] = useState(0);

    useEffect(() => {
        if (existingBuildingType && existingBuildingRotation !== undefined) {
            setSelectedRotationDegrees(parseFloat(radToDeg(existingBuildingRotation).toFixed(0)));
        } else {
            setSelectedRotationDegrees(0); // Default to 0 degrees for new buildings
        }
    }, [existingBuildingType, existingBuildingRotation]);

    const handleBuild = (buildingType) => {
        if (selectedTile) {
            // Pass the current slider rotation for new buildings
            onBuild(selectedTile, buildingType, degToRad(selectedRotationDegrees));
        }
    };

    const handleRotationChange = (degrees) => {
        const newRotationDegrees = parseInt(degrees, 10);
        setSelectedRotationDegrees(newRotationDegrees);
        // If there's an existing building and it's not a harbour, update its rotation in real-time
        if (selectedTile && existingBuildingType && existingBuildingType !== BUILDING_TYPES.HARBOUR) {
            onUpdateBuilding(selectedTile, { rotationY: degToRad(newRotationDegrees) });
        }
    };


    if (!selectedTile) return null;

    const isHarbour = existingBuildingType === BUILDING_TYPES.HARBOUR;
    const currentRotationDisplay = existingBuildingRotation !== undefined ? radToDeg(existingBuildingRotation).toFixed(0) : "N/A";

    return (
        <div className="building-palette" style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(40, 40, 50, 0.9)',
            padding: '15px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'sans-serif',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '320px',
            alignItems: 'center',
        }}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '5px', width: '100%', textAlign: 'center' }}>
                Tile ({selectedTile.c}, {selectedTile.r}) - {selectedTile.type}
            </h4>

            {existingBuildingType && (
                <p style={{ margin: '0 0 10px 0' }}>
                    Current: {buildingDisplayNames[existingBuildingType] || existingBuildingType}
                    {!isHarbour && ` (Rot: ${currentRotationDisplay}°)`}
                </p>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {availableBuildingTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => handleBuild(type)}
                        style={{
                            padding: '8px 12px',
                            background: existingBuildingType === type ? '#6A8759' : '#4F637B', // Green if replacing self, else blue
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        {existingBuildingType === type ? 'Rebuild ' : 'Build '} {buildingDisplayNames[type] || type}
                    </button>
                ))}
            </div>

            {!isHarbour && (
                <div style={{ marginTop: '10px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="rotationSlider" style={{ whiteSpace: 'nowrap' }}>
                        Rotation: {selectedRotationDegrees}°
                    </label>
                    <input
                        type="range"
                        id="rotationSlider"
                        min="0"
                        max="359" // degrees
                        step="1"
                        value={selectedRotationDegrees}
                        onChange={(e) => handleRotationChange(e.target.value)}
                        style={{ width: '80%' }}
                    />
                </div>
            )}
            {isHarbour && <p style={{ fontSize: '0.8em', color: '#aaa', marginTop: '5px' }}>Harbour rotation is automatic.</p>}


            <button
                onClick={onCancel}
                style={{
                    marginTop: '15px',
                    padding: '10px 15px',
                    background: '#7B3E3E',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100px',
                    alignSelf: 'center'
                }}
            >
                Close
            </button>
        </div>
    );
};

export default BuildingPalette;