import React, { useEffect } from "react";
import { DEFAULT_THEME, STORAGE_KEYS } from "../../js/constants.js";
import { safeStorageGet } from "../../js/storage.js";

export default function AboutPage() {
  const theme = safeStorageGet(STORAGE_KEYS.theme) || DEFAULT_THEME;

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <header className="hero">
        <p className="hero-kicker">Lunar Rhythm Planner</p>
        <h1>About This Calendar</h1>
        <p className="hero-copy">
          A gentle lunar calendar built to help you read the month through tithi, place,
          and rhythm instead of only through Gregorian dates.
        </p>
      </header>

      <section className="about-page">
        <div className="about-card">
          <p className="info-eyebrow">How It Works</p>
          <h2>This calendar follows the lunar cycle first.</h2>
          <p>
            The month shown here does not begin on the Gregorian first. It begins with
            the lunar cycle, so the flow of the calendar reflects Shukla Paksha and
            Krishna Paksha the way many people actually experience and observe them.
          </p>
          <p>
            Tithi is calculated from the relationship between the Sun and Moon, then
            assigned using sunrise for the location you choose. That makes the day labels
            feel grounded in place rather than fixed to a one-size-fits-all calendar.
          </p>
        </div>
      </section>

      <div className="about-actions">
        <a className="read-more-link" href="/">
          Back To Calendar
        </a>
      </div>
    </>
  );
}
