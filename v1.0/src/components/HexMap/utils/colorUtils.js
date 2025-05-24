// src/components/HexMap/utils/colorUtils.js
import * as THREE from 'three';
import { MOON_COLOR, WEATHER_TYPES } from '../constants';

export const calculateSunPosition = (timeOfDay, season, maxSummerEle, maxWinterEle, azimuthSwing) => {
    let currentMaxElevation;
    if (season === 1) currentMaxElevation = maxSummerEle;
    else if (season === 3) currentMaxElevation = maxWinterEle;
    else if (season === 0) currentMaxElevation = (maxSummerEle + maxWinterEle) / 2 + 5;
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

export const getSkyAndFogColor = (sunElevation, moonElevation, sunLightColor, weatherCondition) => {
    const skyColorResult = new THREE.Color();

    const dayZenith = new THREE.Color(0x87CEEB);
    const dayHorizon = new THREE.Color(0xADD8E6);
    const nightZenith = new THREE.Color(0x0A0A1A);
    const nightHorizon = new THREE.Color(0x101025);

    // Cloudy sky colors
    const cloudyDayZenith = new THREE.Color(0xB0C4DE);
    const cloudyDayHorizon = new THREE.Color(0x778899);
    const cloudyNightZenith = new THREE.Color(0x2F4F4F);
    const cloudyNightHorizon = new THREE.Color(0x1E2D2D);

    const isCloudy = weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY;

    const currentDayZenith = isCloudy ? cloudyDayZenith : dayZenith;
    const currentDayHorizon = isCloudy ? cloudyDayHorizon : dayHorizon;
    const currentNightZenith = isCloudy ? cloudyNightZenith : nightZenith;
    const currentNightHorizon = isCloudy ? cloudyNightHorizon : nightHorizon;


    const sunInfluenceNormalized = Math.max(0, Math.min(sunElevation, 90)) / 90;
    const moonInfluenceNormalized = Math.max(0, Math.min(moonElevation, 90)) / 90;

    const currentDaySky = new THREE.Color().copy(currentDayHorizon).lerp(currentDayZenith, sunInfluenceNormalized * 0.8);
    if (sunElevation > -5 && sunElevation < 20 && !isCloudy) {
        const sunsetFactor = 1.0 - Math.min(1, Math.max(0, (sunElevation + 5)) / 25);
        currentDaySky.lerp(sunLightColor, sunsetFactor * 0.4);
    }

    const currentNightSky = new THREE.Color().copy(currentNightHorizon).lerp(currentNightZenith, 0.5 + moonInfluenceNormalized * 0.5);
    if (moonElevation > 0 && !isCloudy) {
        currentNightSky.lerp(new THREE.Color(MOON_COLOR), moonInfluenceNormalized * 0.15);
    }

    if (sunElevation > 15) {
        skyColorResult.copy(currentDaySky);
    } else if (sunElevation < -8) {
        skyColorResult.copy(currentNightSky);
    } else {
        const twilightFactor = (sunElevation + 8) / (15 + 8);
        skyColorResult.copy(currentNightSky).lerp(currentDaySky, twilightFactor);
    }

    if (weatherCondition === WEATHER_TYPES.RAINY) {
        skyColorResult.lerp(new THREE.Color(0x333338), 0.5);
        skyColorResult.multiplyScalar(0.7);
    }


    return skyColorResult;
};