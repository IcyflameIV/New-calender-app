import React from "react";

export default function AboutTeaser() {
  return (
    <section className="info-panel info-teaser">
      <p className="info-eyebrow">About This Calendar</p>
      <h2>This calendar follows lunar rhythm first, with solar dates as reference.</h2>
      <p>
        It uses sunrise-based tithi calculation for your selected location, so the month
        feels rooted in lived rhythm rather than only in the Gregorian grid.
      </p>
      <a className="read-more-link" href="/about">
        Read More
      </a>
    </section>
  );
}
