import React from 'react';
import '../styles/ColorPalette.css';

/**
 * Component to display the application's color palette
 * Useful for documentation and design reference
 */
const ColorPaletteDemo: React.FC = () => {
  const colors = [
    {
      name: 'Deep Blue',
      hex: '#2C3E66',
      usage: 'Primary background, logo',
      class: 'deep-blue-swatch'
    },
    {
      name: 'Sky Teal',
      hex: '#3FB8AF',
      usage: 'Accents, highlights',
      class: 'sky-teal-swatch'
    },
    {
      name: 'Graphite Grey',
      hex: '#4A4A4A',
      usage: 'Text, secondary elements',
      class: 'graphite-grey-swatch'
    },
    {
      name: 'Soft White',
      hex: '#F7F9FC',
      usage: 'Backgrounds',
      class: 'soft-white-swatch'
    },
    {
      name: 'Vibrant Lime',
      hex: '#C5E86C',
      usage: 'Call-to-actions, emphasis',
      class: 'vibrant-lime-swatch'
    }
  ];

  return (
    <div className="color-palette-container">
      <h2>Color Palette</h2>
      <p className="palette-description">
        The official color palette for the tWeb application, supporting both light and dark modes.
      </p>
      <div className="color-palette-demo">
        {colors.map((color) => (
          <div key={color.hex} className={`color-swatch ${color.class}`}>
            <div className="color-circle"></div>
            <div className="color-info">
              <div className="color-name">{color.name}</div>
              <div className="color-hex">{color.hex}</div>
              <div className="color-usage">{color.usage}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPaletteDemo; 