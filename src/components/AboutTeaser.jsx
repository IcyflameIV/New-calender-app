import React from "react";

export default function AboutTeaser() {
  return (
    <section className="info-panel info-teaser">
      <p className="info-eyebrow">About This Calendar</p>
      <h2>Lunar months here begin with the tithi cycle, not the Gregorian month.</h2>
      <p>
        The calendar follows sunrise-based tithi calculation for the selected location,
        with solar dates shown quietly as secondary reference.
      </p>
      <a className="read-more-link" href="/about">
        Read More
      </a>
    </section>
  );
}
