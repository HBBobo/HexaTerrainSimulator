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
    [WEATHER_TYPES.SNOW]: "Snow", // Added Snow
};

const SunControls = ({
    timeOfDay, setTimeOfDay,
    season, setSeason,
    weather, setWeather,
    currentSunColor, currentMoonColor
}) => {

    const formatTime = (time) => {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const handleWeatherChange = (e) => {
        const newWeather = e.target.value;
        // Prevent selecting "Snow" if not winter (optional, can be handled by effects instead)
        // if (newWeather === WEATHER_TYPES.SNOW && season !== SEASONS.WINTER) {
        //     // Optionally alert user or revert to a default weather
        //     setWeather(WEATHER_TYPES.CLEAR); // Or previous weather
        //     alert("Snow is only available in Winter.");
        //     return;
        // }
        setWeather(newWeather);
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
                    value={season} onChange={(e) => {
                        const newSeason = parseInt(e.target.value);
                        setSeason(newSeason);
                        // If current weather is snow and new season is not winter, change weather
                        if (weather === WEATHER_TYPES.SNOW && newSeason !== SEASONS.WINTER) {
                            setWeather(WEATHER_TYPES.CLEAR); // or CLOUDY
                        }
                    }}
                    style={{ width: '100%', display: 'block', marginBottom: '10px' }}
                />
            </div>
            <div>
                <label htmlFor="weather" style={{ display: 'block', marginBottom: '5px' }}>
                    Weather: {weatherNames[weather]}
                </label>
                <select
                    id="weather"
                    value={weather}
                    onChange={handleWeatherChange}
                    style={{ width: '100%', padding: '5px', marginBottom: '15px', background: '#333', color: 'white', border: '1px solid #555' }}
                >
                    {Object.entries(weatherNames).map(([key, name]) => {
                        // Conditionally disable Snow option if not Winter
                        const disabled = key === WEATHER_TYPES.SNOW && season !== SEASONS.WINTER;
                        return (
                            <option key={key} value={key} disabled={disabled} style={disabled ? { color: '#888' } : {}}>
                                {name}
                            </option>
                        );
                    })}
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