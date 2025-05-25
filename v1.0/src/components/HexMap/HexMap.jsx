// src/components/HexMap/HexMap.jsx
import React, { useRef, useState, useMemo } from 'react';
import useThreeScene from './hooks/useThreeScene';
import SunControls from './ui/SunControls';
import BuildingPalette from './ui/BuildingPalette';
import { generateCoolIslandMap } from './utils/mapGenerator';
import { getSunLightColor, getMoonLightColor, calculateSunPosition } from './utils/colorUtils';
import {
    GRID_COLUMNS, GRID_ROWS, MAP_GENERATOR_DEFAULTS,
    INITIAL_TIME_OF_DAY, INITIAL_SEASON, INITIAL_WEATHER,
    MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING,
} from './constants';
import { BUILDING_TYPES } from './buildings/BuildingTypes';

const HexMap = () => {
    const mountRef = useRef(null);
    const [timeOfDay, setTimeOfDay] = useState(INITIAL_TIME_OF_DAY);
    const [season, setSeason] = useState(INITIAL_SEASON);
    const [weather, setWeather] = useState(INITIAL_WEATHER);

    const islandHeightData = useMemo(() => {
        return generateCoolIslandMap(
            GRID_COLUMNS, GRID_ROWS,
            MAP_GENERATOR_DEFAULTS.NUM_ISLANDS, MAP_GENERATOR_DEFAULTS.ISLAND_SIZE_FACTOR,
            MAP_GENERATOR_DEFAULTS.NOISE_STRENGTH, MAP_GENERATOR_DEFAULTS.WARP_FACTOR,
            MAP_GENERATOR_DEFAULTS.ISLAND_BORDER_FACTOR, MAP_GENERATOR_DEFAULTS.RANDOMNESS_FACTOR
        );
    }, []); // Empty dependency array means this runs once on mount

    const buildingInteraction = useThreeScene(
        mountRef,
        islandHeightData,
        GRID_COLUMNS,
        GRID_ROWS,
        timeOfDay,
        season,
        weather
    );

    const { elevation: currentSunElevation } = calculateSunPosition(
        timeOfDay, season, MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING
    );
    const moonTime = (timeOfDay + 12) % 24;
    const { elevation: currentMoonElevation } = calculateSunPosition(
        moonTime, season, 70, 70, 90 // Moon's max elevation and azimuth swing (can be adjusted)
    );

    const currentSunLightUIColor = getSunLightColor(currentSunElevation);
    const currentMoonLightUIColor = currentMoonElevation > -5 ? getMoonLightColor(currentMoonElevation) : null;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} tabIndex={-1} />
            <SunControls
                timeOfDay={timeOfDay} setTimeOfDay={setTimeOfDay}
                season={season} setSeason={setSeason}
                weather={weather} setWeather={setWeather}
                currentSunColor={currentSunLightUIColor}
                currentMoonColor={currentMoonLightUIColor}
            />
            {buildingInteraction && buildingInteraction.isBuildingPaletteOpen && (
                <BuildingPalette
                    selectedTile={buildingInteraction.selectedTileForBuilding}
                    onBuild={buildingInteraction.onBuild}
                    onCancel={buildingInteraction.onCancel}
                    existingBuildingType={buildingInteraction.existingBuildingOnSelectedTile?.type}
                    existingBuildingRotation={buildingInteraction.existingBuildingOnSelectedTile?.rotationY}
                    onUpdateBuilding={buildingInteraction.onUpdateBuilding}
                    availableBuildingTypes={Object.values(BUILDING_TYPES)}
                />
            )}
        </div>
    );
};

export default HexMap;