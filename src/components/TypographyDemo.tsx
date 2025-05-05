import React from 'react';
import '../styles/Typography.css';

/**
 * Component to demonstrate and document the typography used in the application
 */
const TypographyDemo: React.FC = () => {
  return (
    <div className="typography-demo">
      <h1>Typography System</h1>
      
      <div className="font-sample">
        <div className="font-header">Montserrat (Primary Font)</div>
        <div className="font-description">
          Used for headings, UI elements, and interactive components. 
          Montserrat provides a clean, modern look with excellent readability at different sizes.
        </div>
        
        <div className="font-examples">
          <div className="font-example-item">
            <div className="font-example-label">Bold (700) - Headings</div>
            <div className="font-example-content">
              <h1 className="montserrat-bold">Heading 1</h1>
              <h2 className="montserrat-bold">Heading 2</h2>
              <h3 className="montserrat-bold">Heading 3</h3>
              <h4 className="montserrat-bold">Heading 4</h4>
            </div>
          </div>
          
          <div className="font-example-item">
            <div className="font-example-label">Semi-Bold (600) - Subheadings</div>
            <div className="font-example-content">
              <h5 className="montserrat-semibold">Heading 5 (Subheading)</h5>
              <h6 className="montserrat-semibold">Heading 6 (Subheading)</h6>
              <div className="montserrat-semibold">Button Text</div>
              <div className="montserrat-semibold">Navigation Items</div>
            </div>
          </div>
          
          <div className="font-example-item">
            <div className="font-example-label">Medium (500) - UI Elements</div>
            <div className="font-example-content">
              <div className="montserrat-medium">Form Labels</div>
              <div className="montserrat-medium">Menu Items</div>
              <div className="montserrat-medium">Alerts and Notifications</div>
            </div>
          </div>
          
          <div className="font-example-item">
            <div className="font-example-label">Regular (400)</div>
            <div className="font-example-content">
              <div className="montserrat-regular">Alternative body text</div>
              <div className="montserrat-regular">Secondary UI elements</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="font-sample">
        <div className="font-header">Inter (Secondary Font)</div>
        <div className="font-description">
          Used for body text and longer-form content. 
          Inter is designed for high readability on screens with excellent legibility at small sizes.
        </div>
        
        <div className="font-examples">
          <div className="font-example-item">
            <div className="font-example-label">Regular (400) - Body Text</div>
            <div className="font-example-content">
              <p className="inter-regular">
                This is a paragraph of text set in Inter Regular. Inter is a variable font designed for computer screens.
                It features a tall x-height to aid in readability of mixed-case and lower-case text. This font is ideal 
                for body copy, form inputs, and other areas where legibility is important, especially at smaller sizes.
              </p>
              <div className="inter-regular">Form inputs and text fields</div>
              <div className="inter-regular">Tables and data</div>
            </div>
          </div>
          
          <div className="font-example-item">
            <div className="font-example-label">Medium (500) - Emphasis</div>
            <div className="font-example-content">
              <div className="inter-medium">Used for emphasis within body text</div>
              <p className="inter-regular">
                Regular text with <span className="inter-medium">medium emphasis</span> applied to important phrases.
              </p>
            </div>
          </div>
          
          <div className="font-example-item">
            <div className="font-example-label">Semi-Bold (600) - Strong</div>
            <div className="font-example-content">
              <div className="inter-semibold">Used for strong emphasis and small headings in body content</div>
              <p className="inter-regular">
                Regular text with <span className="inter-semibold">semi-bold emphasis</span> for important information.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="font-sample">
        <div className="font-header">Type Scale</div>
        <div className="font-description">
          A consistent scale of sizes creates hierarchy and improves readability.
        </div>
        
        <div className="font-examples">
          <h1>Heading 1 (2.5rem)</h1>
          <h2>Heading 2 (2rem)</h2>
          <h3>Heading 3 (1.75rem)</h3>
          <h4>Heading 4 (1.5rem)</h4>
          <h5>Heading 5 (1.25rem)</h5>
          <h6>Heading 6 (1rem)</h6>
          <p>Body text (1rem)</p>
          <p className="small-text" style={{ fontSize: "0.875rem" }}>Small text (0.875rem)</p>
          <p className="caption" style={{ fontSize: "0.75rem" }}>Caption text (0.75rem)</p>
        </div>
      </div>
    </div>
  );
};

export default TypographyDemo; 