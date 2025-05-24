// src/components/HexMap/utils/colorUtils.js
import * as THREE from 'three';
import { MOON_COLOR, WEATHER_TYPES, SEASONS } from '../constants';

export const calculateSunPosition = (timeOfDay, season, maxSummerEle, maxWinterEle, azimuthSwing) => {
    let currentMaxElevation;
    if (season === SEASONS.SUMMER) currentMaxElevation = maxSummerEle;
    else if (season === SEASONS.WINTER) currentMaxElevation = maxWinterEle;
    else if (season === SEASONS.SPRING) currentMaxElevation = (maxSummerEle + maxWinterEle) / 2 + 5;
    else currentMaxElevation = (maxSummerEle + maxWinterEle) / 2 - 5;

    const normalizedTime = timeOfDay / 24;
    let elevation = Math.sin(normalizedTime * Math.PI * 2 - Math.PI / 2) * (currentMaxElevation + 10) - 10;
    elevation = Math.max(-90, Math.min(90, elevation));

    let azimuth = 0;
    if (elevation > -5) {
        azimuth = 180 - Math.cos(normalizedTime * Math.PI * 2) * azimuthSwing;
    } else {
        azimuth = (180 - Math.cos(normalizedTime * Math.PI * 2) * azimuthSwing + 180) % 360;
    }
    azimuth = (azimuth + 360) % 360;

    return { elevation, azimuth };
};

export const getSunLightColor = (sunElevation) => {
    const effectiveElevation = Math.max(0, sunElevation);
    const elevationNormalized = Math.min(effectiveElevation, 90) / 90;
    const middayColor = new THREE.Color(0xFFFDD0);
    const horizonSetColor = new THREE.Color(0xFF8C00);
    const horizonRiseColor = new THREE.Color(0xFF4500);
    const twilightColor = new THREE.Color(0x4682B4);

    if (sunElevation < -5) {
        return new THREE.Color(0x050510);
    } else if (sunElevation < 0) {
        return horizonRiseColor.clone().lerp(twilightColor, (sunElevation + 5) / 5);
    } else if (elevationNormalized < 0.05) {
        return horizonRiseColor.clone().lerp(horizonSetColor, elevationNormalized / 0.05);
    } else if (elevationNormalized < 0.20) {
        return horizonSetColor.clone().lerp(middayColor, (elevationNormalized - 0.05) / (0.20 - 0.05));
    }
    return middayColor.clone();
};

export const getMoonLightColor = (moonElevation) => {
    if (moonElevation < -5) {
        return new THREE.Color(0x000000);
    }
    const intensityFactor = Math.min(1, Math.max(0, (moonElevation + 5) / 40));
    return new THREE.Color(MOON_COLOR).multiplyScalar(intensityFactor);
};

// Added snowAccumulationRatio parameter
export const getSkyAndFogColor = (sunElevation, moonElevation, sunLightColor, weatherCondition, season, snowAccumulationRatio = 0) => {
    const skyColorResult = new THREE.Color();

    const dayZenithBase = new THREE.Color(0x87CEEB);
    const dayHorizonBase = new THREE.Color(0xADD8E6);
    const nightZenithBase = new THREE.Color(0x0A0A1A);
    const nightHorizonBase = new THREE.Color(0x101025);

    const cloudyDayZenith = new THREE.Color(0xB0C4DE);
    const cloudyDayHorizon = new THREE.Color(0x778899);
    const cloudyNightZenith = new THREE.Color(0x2F4F4F);
    const cloudyNightHorizon = new THREE.Color(0x1E2D2D);

    // Define specific snowy sky colors (target for when snowAccumulationRatio is 1)
    const snowyDayZenith = new THREE.Color(0xDDEEFF);   // Whiter, brighter blue
    const snowyDayHorizon = new THREE.Color(0xC0D0E0);  // Light greyish blue
    const snowyNightZenith = new THREE.Color(0x354045); // Darker, slightly brighter than cloudy night
    const snowyNightHorizon = new THREE.Color(0x283035);

    let currentDayZenith = dayZenithBase.clone();
    let currentDayHorizon = dayHorizonBase.clone();
    let currentNightZenith = nightZenithBase.clone();
    let currentNightHorizon = nightHorizonBase.clone();

    const isActuallySnowing = weatherCondition === WEATHER_TYPES.SNOW && season === SEASONS.WINTER;

    if (weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY) {
        currentDayZenith.copy(cloudyDayZenith);
        currentDayHorizon.copy(cloudyDayHorizon);
        currentNightZenith.copy(cloudyNightZenith);
        currentNightHorizon.copy(cloudyNightHorizon);
    }

    // If it's actually snowing, interpolate current sky colors towards the snowy sky colors
    if (isActuallySnowing) {
        currentDayZenith.lerp(snowyDayZenith, snowAccumulationRatio);
        currentDayHorizon.lerp(snowyDayHorizon, snowAccumulationRatio);
        currentNightZenith.lerp(snowyNightZenith, snowAccumulationRatio);
        currentNightHorizon.lerp(snowyNightHorizon, snowAccumulationRatio);
    } else if (snowAccumulationRatio > 0) { // If snow is melting
        // Interpolate from the fully snowy sky back to the current weather's base sky
        const baseDZ = (weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY) ? cloudyDayZenith : dayZenithBase;
        const baseDH = (weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY) ? cloudyDayHorizon : dayHorizonBase;
        const baseNZ = (weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY) ? cloudyNightZenith : nightZenithBase;
        const baseNH = (weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY) ? cloudyNightHorizon : nightHorizonBase;

        currentDayZenith.copy(snowyDayZenith).lerp(baseDZ, 1.0 - snowAccumulationRatio);
        currentDayHorizon.copy(snowyDayHorizon).lerp(baseDH, 1.0 - snowAccumulationRatio);
        currentNightZenith.copy(snowyNightZenith).lerp(baseNZ, 1.0 - snowAccumulationRatio);
        currentNightHorizon.copy(snowyNightHorizon).lerp(baseNH, 1.0 - snowAccumulationRatio);
    }


    const sunInfluenceNormalized = Math.max(0, Math.min(sunElevation, 90)) / 90;
    const moonInfluenceNormalized = Math.max(0, Math.min(moonElevation, 90)) / 90;

    const finalDaySky = new THREE.Color().copy(currentDayHorizon).lerp(currentDayZenith, sunInfluenceNormalized * 0.8);
    if (sunElevation > -5 && sunElevation < 20 && weatherCondition === WEATHER_TYPES.CLEAR && !isActuallySnowing) {
        const sunsetFactor = 1.0 - Math.min(1, Math.max(0, (sunElevation + 5)) / 25);
        finalDaySky.lerp(sunLightColor, sunsetFactor * 0.4);
    }

    const finalNightSky = new THREE.Color().copy(currentNightHorizon).lerp(currentNightZenith, 0.5 + moonInfluenceNormalized * 0.5);
    if (moonElevation > 0 && weatherCondition === WEATHER_TYPES.CLEAR && !isActuallySnowing) {
        finalNightSky.lerp(new THREE.Color(MOON_COLOR), moonInfluenceNormalized * 0.15);
    }

    if (sunElevation > 15) {
        skyColorResult.copy(finalDaySky);
    } else if (sunElevation < -8) {
        skyColorResult.copy(finalNightSky);
    } else {
        const twilightFactor = (sunElevation + 8) / (15 + 8);
        skyColorResult.copy(finalNightSky).lerp(finalDaySky, twilightFactor);
    }

    if (weatherCondition === WEATHER_TYPES.RAINY && !isActuallySnowing) { // Don't apply if transitioning to snow
        skyColorResult.lerp(new THREE.Color(0x333338), 0.5);
        skyColorResult.multiplyScalar(0.7);
    }
    // General overcast/snow darkening is handled by the sky color lerping now.
    // If specifically snowing (target state), slight additional modification if needed.
    if (isActuallySnowing) {
        skyColorResult.lerp(new THREE.Color(0xCFD8DC), snowAccumulationRatio * 0.15); // Subtle brightening/desaturation as snow fully sets in
        skyColorResult.multiplyScalar(THREE.MathUtils.lerp(1.0, 0.9, snowAccumulationRatio));
    }


    return skyColorResult;
};