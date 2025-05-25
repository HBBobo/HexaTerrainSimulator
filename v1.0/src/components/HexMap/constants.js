// src/components/HexMap/constants.js
import { BUILDING_TYPES as BT } from './buildings/BuildingTypes'; // Import with an alias if needed

// --- Grid & Hex Dimensions ---
export const HEX_SIZE = 1;
export const HEX_HEIGHT_MAX = 4.0;
export const GRID_COLUMNS = 48;
export const GRID_ROWS = 48;

// --- Water Plane ---
export const TRANSPARENT_LAYER_Y = 0.505;
export const TRANSPARENT_LAYER_OPACITY = 0.6;
export const TRANSPARENT_LAYER_COLOR = 0x4682B4;

// --- Water Animation ---
export const MAX_WAVE_SPEED_COMPONENT = 0.03;
export const WAVE_DIRECTION_CHANGE_INTERVAL_MIN = 10.0;
export const WAVE_DIRECTION_CHANGE_INTERVAL_MAX = 20.0;
export const WAVE_SPEED_LERP_FACTOR = 0.02;

// --- Tile Types & Colors ---
export const TILE_TYPES = {
    DEEP_WATER: 'DEEP_WATER', SHALLOW_WATER: 'SHALLOW_WATER', SAND: 'SAND', CLAY: 'CLAY',
    PASTURE: 'PASTURE', FOREST: 'FOREST', STONE: 'STONE', MOUNTAIN_PEAK: 'MOUNTAIN_PEAK',
};
export const DULL_TILE_COLORS = {
    [TILE_TYPES.SAND]: 0xBDB76B, [TILE_TYPES.CLAY]: 0xCD853F, [TILE_TYPES.PASTURE]: 0x8FBC8F,
    [TILE_TYPES.FOREST]: 0x808060, [TILE_TYPES.STONE]: 0x778899, [TILE_TYPES.MOUNTAIN_PEAK]: 0xA9A9A9,
};
export const TILE_COLORS = DULL_TILE_COLORS;

// --- Building Types ---
// Now imported, but keep BUILDABLE_TILE_TYPES here or move it with BUILDING_TYPES
export const BUILDING_TYPES = BT; // Re-export if other files import from constants
export const BUILDABLE_TILE_TYPES = [
    TILE_TYPES.SAND, TILE_TYPES.CLAY, TILE_TYPES.PASTURE, TILE_TYPES.FOREST, TILE_TYPES.STONE
];


// --- Map Generation & Biome Thresholds ---
export const WATER_SURFACE_ELEVATION_NORMALIZED = TRANSPARENT_LAYER_Y / HEX_HEIGHT_MAX;
export const SHALLOW_WATER_DEPTH_FOR_REEDS_NORMALIZED = 0.06;
export const BIOME_THRESHOLDS = {
    [TILE_TYPES.SAND]: WATER_SURFACE_ELEVATION_NORMALIZED + 0.05,
    [TILE_TYPES.CLAY]: WATER_SURFACE_ELEVATION_NORMALIZED + 0.12,
    [TILE_TYPES.PASTURE]: WATER_SURFACE_ELEVATION_NORMALIZED + 0.30,
    [TILE_TYPES.FOREST]: WATER_SURFACE_ELEVATION_NORMALIZED + 0.50,
    [TILE_TYPES.STONE]: WATER_SURFACE_ELEVATION_NORMALIZED + 0.70,
};
export const MAP_GENERATOR_DEFAULTS = {
    NUM_ISLANDS: 4, ISLAND_SIZE_FACTOR: 0.35, NOISE_STRENGTH: 0.5,
    WARP_FACTOR: 0.2, ISLAND_BORDER_FACTOR: 0.8, RANDOMNESS_FACTOR: 0.08,
};

// --- Tree, Rock, Reed Placement ---
export const MIN_TREES_PER_FOREST_TILE = 2;
export const MAX_ADDITIONAL_TREES_PER_FOREST_TILE = 5;
export const PROBABILITY_OF_ADDITIONAL_TREE = 0.6;
export const ROCKS_PER_STONE_TILE_MIN = 1;
export const ROCKS_PER_STONE_TILE_MAX = 4;
export const PROBABILITY_OF_ROCK_ON_STONE_TILE = 0.7;
export const REED_CLUMPS_PER_ELIGIBLE_TILE_MIN = 7;
export const REED_CLUMPS_PER_ELIGIBLE_TILE_MAX = 13;
export const PROBABILITY_OF_REEDS_ON_ELIGIBLE_TILE = 0.55;

// --- Fox Settings ---
export const NUMBER_OF_FOXES = 5;
export const FOX_MAX_JUMP_HEIGHT_DIFFERENCE = HEX_SIZE * 0.75;

// --- Fox Footprints ---
export const FOX_FOOTPRINT_TEXTURE_URL = 'https://cdn0.iconfinder.com/data/icons/footprints-3/64/FOX-fox_terrier-wildlife-animals-carnivore-512.png';
export const FOX_FOOTPRINT_SIZE = 0.1;
export const FOX_FOOTPRINT_LIFETIME_SECONDS = 15.0;
export const FOX_FOOTPRINT_INTERVAL_SECONDS = 0.35;
export const FOX_FOOTPRINT_OPACITY = 0.6;
export const FOX_FOOTPRINT_Y_OFFSET = 0.015;
export const MIN_SNOW_FOR_FOOTPRINTS = 0.3;

// --- Sun, Moon & Lighting ---
export const SHADOW_MAP_SIZE = 4096 * 4;

// --- Time and Season ---
export const SEASONS = { SPRING: 0, SUMMER: 1, AUTUMN: 2, WINTER: 3 };
export const INITIAL_TIME_OF_DAY = 12;
export const INITIAL_SEASON = SEASONS.SUMMER;
export const MAX_SUN_ELEVATION_SUMMER = 75;
export const MAX_SUN_ELEVATION_WINTER = 30;
export const SUN_AZIMUTH_SWING = 90;

// --- Moon settings ---
export const MOON_LIGHT_INTENSITY = 0.4;
export const MOON_COLOR = 0xE0E8FF;
export const MOON_SIZE_FACTOR = 0.025;

// --- Weather ---
export const WEATHER_TYPES = {
    CLEAR: 'CLEAR',
    CLOUDY: 'CLOUDY',
    RAINY: 'RAINY',
    SNOW: 'SNOW',
};
export const INITIAL_WEATHER = WEATHER_TYPES.CLEAR;
export const SUN_INTENSITY_CLOUDY_FACTOR = 0.3;
export const MOON_INTENSITY_CLOUDY_FACTOR = 0.2;

// Rain Settings
export const RAIN_PARTICLE_COUNT = 100000;
export const RAIN_AREA_XZ_FACTOR = 1.5;
export const RAIN_AREA_Y_MAX = 50;
export const RAIN_FALL_SPEED = 30;
export const RAIN_PARTICLE_SIZE = 0.05;
export const RAIN_PARTICLE_OPACITY = 0.4;
export const RAIN_COLOR = 0xAAAAFF;

// Snow Settings
export const SNOW_PARTICLE_COUNT = 50000;
export const SNOW_AREA_XZ_FACTOR = 1.7;
export const SNOW_AREA_Y_MAX = 40;
export const SNOW_FALL_SPEED = 2.5;
export const SNOW_PARTICLE_SIZE = 0.15;
export const SNOW_PARTICLE_OPACITY = 0.7;
export const SNOW_PARTICLE_TEXTURE_URL = 'https://threejs.org/examples/textures/sprites/snowflake2.png';
export const SNOW_DRIFT_SPEED_X_FACTOR = 0.1;
export const SNOW_DRIFT_SPEED_Z_FACTOR = 0.05;

// Snow Cover on Ground/Assets
export const SNOW_COVER_COLOR = 0xE0E5E8;
export const MAX_SNOW_COVER_LERP_FACTOR = 0.85;
export const SNOW_ACCUMULATION_SECONDS = 10.0;
export const SNOW_MELT_SECONDS = 15.0;

// --- Skybox & Textures ---
export const SKYBOX_IMAGE_BASE_PATH = 'https://threejs.org/examples/textures/cube/SwedishRoyalCastle/';
export const SKYBOX_IMAGE_NAMES = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
export const WATER_NORMAL_MAP_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg';