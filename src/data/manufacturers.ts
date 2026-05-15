// Block manufacturer data consolidated from icfscope-backend (seed + api)
// Sources: seed/manufacturers.py, app/api/__init__.py

export type CoreSize = '6' | '8' | '10' | '12' | '14';

export interface Manufacturer {
  id: string;
  name: string;
  website: string;
  description: string;
  coreSizes: CoreSize[];
  /** Standard block height in inches — 16" for all current manufacturers */
  blockHeightIn: number;
  /** Standard block length in inches — 48" for all current manufacturers */
  blockLengthIn: number;
}

export const MANUFACTURERS: Manufacturer[] = [
  {
    id: 'nudura',
    name: 'Nudura',
    website: 'https://www.nudura.com',
    description: 'Leading ICF manufacturer with innovative designs',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'fox-blocks',
    name: 'Fox Blocks',
    website: 'https://www.foxblocks.com',
    description: 'Premium ICF systems for residential and commercial',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'buildblock',
    name: 'BuildBlock',
    website: 'https://buildblock.com',
    description: 'Versatile ICF solutions for all construction types',
    coreSizes: ['6', '8', '10', '12', '14'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'superform',
    name: 'SuperForm',
    website: 'https://www.superformicf.com',
    description: 'High-quality flat-wall ICF systems',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'element',
    name: 'Element',
    website: 'https://elementicf.com',
    description: 'Engineered ICF systems for energy-efficient construction',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'alleguard',
    name: 'Alleguard',
    website: 'https://alleguard.com',
    description: 'ICF solutions focused on durability and performance',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'quadlock',
    name: 'QuadLock',
    website: 'https://quadlock.com',
    description: 'Flexible flat-wall ICF systems with strong interlocking ties',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'logix',
    name: 'Logix',
    website: 'https://logixicf.com',
    description: 'High-performance ICF systems for residential and commercial',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
  {
    id: 'amvic',
    name: 'Amvic',
    website: 'https://amvicbuildingsystem.com',
    description: 'Innovative ICF building solutions for energy efficiency',
    coreSizes: ['6', '8', '10', '12'],
    blockHeightIn: 16,
    blockLengthIn: 48,
  },
];

export const DEFAULT_MANUFACTURER = MANUFACTURERS[0]; // Nudura

export function getManufacturer(id: string): Manufacturer {
  return MANUFACTURERS.find(m => m.id === id) ?? DEFAULT_MANUFACTURER;
}

export const CORE_THICKNESS_FT: Record<CoreSize, number> = {
  '6':  6  / 12,
  '8':  8  / 12,
  '10': 10 / 12,
  '12': 12 / 12,
  '14': 14 / 12,
};
