// src/components/HexMap/ui/SunControls.jsx
import React from 'react';
import { SEASONS, WEATHER_TYPES } from '../constants';

const seasonNames = {
    [SEASONS.SPRING]: "Spring", [SEASONS.SUMMER]: "Summer",
    [SEASONS.AUTUMN]: "Autumn", [SEASONS.WINTER]: "Winter",
};

const weatherNames = {
    [WEATHER_TYPES.CLEAR]: "Clear",
    [WEATHER_TYPES.CLOUDY]: "Cloudy",
    [WEATHER_TYPES.RAINY]: "Rainy",
};

const SunControls = ({
    timeOfDay, setTimeOfDay,
    season, setSeason,
    weather, setWeather, // New weather prop
    currentSunColor, currentMoonColor
}) => {

    const formatTime = (time) => {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '15px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'sans-serif',
            zIndex: 10,
            minWidth: '270px'
        }}>
            <div>
                <label htmlFor="timeOfDay" style={{ display: 'block', marginBottom: '5px' }}>
                    Time of Day: {formatTime(timeOfDay)}
                </label>
                <input
                    type="range" id="timeOfDay" min="0" max="23.99" step="0.05"
                    value={timeOfDay} onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                    style={{ width: '100%', display: 'block', marginBottom: '15px' }}
                />
            </div>
            <div>
                <label htmlFor="season" style={{ display: 'block', marginBottom: '5px' }}>
                    Season: {seasonNames[season]}
                </label>
                <input
                    type="range" id="season" min="0" max="3" step="1"
                    value={season} onChange={(e) => setSeason(parseInt(e.target.value))}
                    style={{ width: '100%', display: 'block', marginBottom: '10px' }}
                />
            </div>
            <div> {/* Weather Control */}
                <label htmlFor="weather" style={{ display: 'block', marginBottom: '5px' }}>
                    Weather: {weatherNames[weather]}
                </label>
                <select
                    id="weather"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    style={{ width: '100%', padding: '5px', marginBottom: '15px', background: '#333', color: 'white', border: '1px solid #555' }}
                >
                    {Object.entries(weatherNames).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                    ))}
                </select>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                Sun Color:
                <span style={{
                    display: 'inline-block', width: '20px', height: '20px',
                    backgroundColor: currentSunColor ? `#${currentSunColor.getHexString()}` : '#FFFFFF',
                    border: '1px solid white', marginLeft: '8px', verticalAlign: 'middle'
                }}></span>
            </div>
            {currentMoonColor && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                    Moon Color:
                    <span style={{
                        display: 'inline-block', width: '20px', height: '20px',
                        backgroundColor: `#${currentMoonColor.getHexString()}`,
                        border: '1px solid white', marginLeft: '8px', verticalAlign: 'middle'
                    }}></span>
                </div>
            )}
        </div>
    );
};

export default SunControls;