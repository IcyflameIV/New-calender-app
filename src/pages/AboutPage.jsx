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
          A sunrise-based lunar calendar designed to keep tithi at the center of your
          month.
        </p>
      </header>

      <section className="about-page">
        <div className="about-card">
          <p className="info-eyebrow">How It Works</p>
          <h2>The month begins from the lunar cycle.</h2>
          <p>
            This calendar does not start from the Gregorian first day of the month.
            Instead, each displayed month begins from the start of the lunar cycle, with
            Shukla Paksha following the Krishna to Shukla transition at sunrise.
          </p>
          <p>
            Tithi is calculated from the Sun-Moon phase relation and assigned from the
            selected location&apos;s sunrise. That helps the day labels reflect how the
            lunar date is typically observed locally.
          </p>
        </div>

        <div className="about-card">
          <p className="info-eyebrow">What You See</p>
          <h2>Tithi first, solar date second.</h2>
          <p>
            Each card highlights the tithi as the primary label, while the Gregorian
            month and day stay as a smaller supporting reference. The two paksha sections
            let you read the month through its waxing and waning halves instead of a
            standard Western calendar grid.
          </p>
          <p>
            Period tracking can be turned on to mark actual starts and let the latest
            saved start drive the expected tithi for coming lunar months.
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
