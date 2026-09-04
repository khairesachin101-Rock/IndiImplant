import React, { useEffect, useState } from "react";

const SLIDES = [
  {
    eyebrow: "New on IndiaImplant",
    title: "Dual Mobility Hip Cups now listed by Apex Biomedical",
    sub: "Reduced dislocation risk for revision and high-risk primary cases.",
  },
  {
    eyebrow: "PSI Connect",
    title: "Custom cranial implants — 14 to 21 day turnaround",
    sub: "Upload a case and get matched with a certified PSI manufacturer.",
  },
  {
    eyebrow: "Verified suppliers",
    title: "6 CDSCO-certified manufacturers now on the platform",
    sub: "Every listing carries a verified certification badge.",
  },
];

export default function OfferSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="offer-slider card">
      <div className="offer-slider-content">
        <span className="eyebrow">{slide.eyebrow}</span>
        <h3>{slide.title}</h3>
        <p className="offer-slider-sub">{slide.sub}</p>
      </div>
      <div className="offer-slider-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`offer-dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Show offer ${i + 1}`}
          />
        ))}
      </div>

      <style>{`
        .offer-slider {
          padding: 22px 24px;
          background: linear-gradient(135deg, var(--accent-deep), var(--accent));
          color: var(--surface);
          border: none;
          position: relative;
          overflow: hidden;
          min-height: 108px;
        }
        .offer-slider .eyebrow {
          color: rgba(255,255,255,0.75);
        }
        .offer-slider h3 {
          color: var(--surface);
          font-size: 20px;
          margin: 6px 0 4px;
        }
        .offer-slider-sub {
          color: rgba(255,255,255,0.85);
          font-size: 13px;
        }
        .offer-slider-dots {
          position: absolute;
          bottom: 14px;
          right: 20px;
          display: flex;
          gap: 6px;
        }
        .offer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.4);
          padding: 0;
        }
        .offer-dot.active {
          background: var(--surface);
        }
      `}</style>
    </div>
  );
}
