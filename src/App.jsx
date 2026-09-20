import { useEffect, useState } from "react";
import { getSchedule } from "./api";
import "./App.css";

const teams = [
  { code: "ARI", name: "Arizona Cardinals" },
  { code: "ATL", name: "Atlanta Falcons" },
  { code: "BAL", name: "Baltimore Ravens" },
  { code: "BUF", name: "Buffalo Bills" },
  { code: "CAR", name: "Carolina Panthers" },
  { code: "CHI", name: "Chicago Bears" },
  { code: "CIN", name: "Cincinnati Bengals" },
  { code: "CLE", name: "Cleveland Browns" },
  { code: "DAL", name: "Dallas Cowboys" },
  { code: "DEN", name: "Denver Broncos" },
  { code: "DET", name: "Detroit Lions" },
  { code: "GB", name: "Green Bay Packers" },
  { code: "HOU", name: "Houston Texans" },
  { code: "IND", name: "Indianapolis Colts" },
  { code: "JAX", name: "Jacksonville Jaguars" },
  { code: "KC", name: "Kansas City Chiefs" },
  { code: "LV", name: "Las Vegas Raiders" },
  { code: "LAC", name: "Los Angeles Chargers" },
  { code: "LA", name: "Los Angeles Rams" },
  { code: "MIA", name: "Miami Dolphins" },
  { code: "MIN", name: "Minnesota Vikings" },
  { code: "NE", name: "New England Patriots" },
  { code: "NO", name: "New Orleans Saints" },
  { code: "NYG", name: "New York Giants" },
  { code: "NYJ", name: "New York Jets" },
  { code: "PHI", name: "Philadelphia Eagles" },
  { code: "PIT", name: "Pittsburgh Steelers" },
  { code: "SEA", name: "Seattle Seahawks" },
  { code: "SF", name: "San Francisco 49ers" },
  { code: "TB", name: "Tampa Bay Buccaneers" },
  { code: "TEN", name: "Tennessee Titans" },
  { code: "WAS", name: "Washington Commanders" },
];

function App() {
  const [isPremium, setIsPremium] = useState(true);
  const [games, setGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [scoreDelay, setScoreDelay] = useState("after");
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] =
    useState(false);
  const [calendarUrl, setCalendarUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const subscribeToCalendar = () => {
    const params = new URLSearchParams();

    if (selectedTeams.length > 0) {
      params.set("teams", selectedTeams.join(","));
    }

    params.set("delay", scoreDelay);
    params.set(
      "weekly",
      weeklyReport ? "true" : "false"
    );

    const calendarUrl =
      `${window.location.origin}/api/calendar?${params.toString()}`;

    const webcalUrl = calendarUrl.replace(
      /^https?:\/\//,
      "webcal://"
    );

    const isAndroid =
      /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      setCalendarUrl(calendarUrl);
      setShowCalendarOptions(true);
      return;
    }

    window.location.href = webcalUrl;
  };

  useEffect(() => {
    getSchedule()
      .then((data) => {
        console.log("SCHEDULE LOADED:", data);
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("SCHEDULE ERROR:", err);
        setError("Unable to load the NFL schedule.");
        setLoading(false);
      });
  }, []);

  const weeks = [
    ...new Set(games.map((game) => game.week)),
  ];

  const now = new Date();

  const scoreDelayHours =
    scoreDelay === "12h"
      ? 12
      : scoreDelay === "24h"
      ? 24
      : 0;

  const currentWeek =
    weeks.find((week) =>
      games
        .filter((game) => game.week === week)
        .some((game) => {
          const kickoff = new Date(
            game.kickoff_utc
          );

          return kickoff >= now;
        })
    ) || weeks[weeks.length - 1];

  const activeWeek =
    selectedWeek ?? currentWeek;

  const filteredGames = games.filter((game) => {
    
    const matchesWeek =
      activeWeek === "all" ||
      game.week === activeWeek;

    const matchesTeam =
      selectedTeams.length === 0 ||
      selectedTeams.includes(game.away_team) ||
      selectedTeams.includes(game.home_team);

    return matchesWeek && matchesTeam;
  });

  const shouldShowScore = (game) => {
    if (
      game.away_score === "" ||
      game.home_score === "" ||
      game.away_score == null ||
      game.home_score == null
    ) {
      return false;
    }

    if (scoreDelay === "never") {
      return false;
    }

    if (scoreDelay === "live") {
      return true;
    }

    const kickoff = new Date(
      game.kickoff_utc
    );

    const delayUntil = new Date(
      kickoff.getTime() +
        scoreDelayHours * 60 * 60 * 1000
    );

    return now >= delayUntil;
  };

  return (
    <div className="app">

      <section className="hero">
        <div className="brand">
          NFL Calendar
        </div>
        
        <div className="hero-badge">
          🌎 Built for NFL fans around the world
        </div>

        <h1>
          NFL games.
          <br />
          <span>In your calendar.</span>
        </h1>

        <p className="hero-text">
          Follow the NFL, with your favourite
          teams automatically added to your calendar.
        </p>

        <div className="hero-features">
          <div>✓ Kickoffs in your local time</div>
          <div>✓ Apple & Google Calendar</div>
          <div>✓ Spoiler-free scores</div>
          <div>✓ Weekly results</div>
        </div>


      </section>

      <section className="setup-section">
        <h2>Build your NFL calendar</h2>

        <p className="intro-text">
          Choose the teams you want to follow, then
          subscribe to your personalised calendar.
        </p>

        <div className="plan-badge">
          {isPremium ? "Premium" : "Free"}
        </div>

        <div className="team-selector">
          <div className="team-selector-header">
            <div>
              <h3>Teams</h3>

              <p className="team-count">
                {selectedTeams.length === 0
                  ? "All teams"
                  : `${selectedTeams.length} team${
                      selectedTeams.length === 1
                        ? ""
                        : "s"
                    } selected`}
              </p>
            </div>

            <div className="team-actions">
              <button
                type="button"
                onClick={() =>
                  setSelectedTeams(
                    isPremium
                      ? teams.map((team) => team.code)
                      : teams.slice(0, 1).map((team) => team.code)
                  )
                }
              >
                Select all
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedTeams([])
                }
              >
                Clear
              </button>
            </div>
          </div>

          <div className="team-list">
            {teams.map((team) => (
              <label
                className="team-option"
                key={team.code}
              >
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(
                    team.code
                  )}
                  onChange={() => {
                    setSelectedTeams((current) => {
                      if (current.includes(team.code)) {
                        return current.filter(
                          (code) => code !== team.code
                        );
                      }

                      if (!isPremium && current.length >= 1) {
                        return current;
                      }

                      return [...current, team.code];
                    });
                  }}
                />

                <span>
                  <strong>{team.code}</strong>{" "}
                  — {team.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="score-settings">
          <h3>Results & scores</h3>

          <p className="settings-description">
            Choose when scores appear in your calendar.
            Perfect if you want to avoid spoilers.
          </p>

          <select
            value={scoreDelay}
            onChange={(e) =>
              setScoreDelay(e.target.value)
            }
            className="week-select"
          >
            <option value="after">
              After the game
            </option>
            <option value="12h">
              12 hours after
            </option>
            <option value="24h">
              24 hours after
            </option>
            <option value="never">
              Never
            </option>
            <option value="live">
              Live scores
            </option>
          </select>
        </div>

        <div className="score-settings">
          <h3>Weekly results report</h3>

          <p className="settings-description">
            Add a summary of the week's results to your
            calendar.
          </p>

          <select
            value={weeklyReport ? "on" : "off"}
            onChange={(e) =>
              setWeeklyReport(
                e.target.value === "on"
              )
            }
            className="week-select"
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </div>

        <button
          type="button"
          className="subscribe-button"
          onClick={subscribeToCalendar}
        >
          Add to my calendar
        </button>

        <p className="calendar-help">
          Works with Apple Calendar, Google Calendar
          and other calendar apps.
        </p>

        {showCalendarOptions && (
          <div className="calendar-options">
            <h3>Add to Google Calendar</h3>

            <p>
              Google Calendar requires calendar
              subscriptions to be added from the web.
            </p>

            <ol>
              <li>
                Copy your personalised calendar link.
              </li>
              <li>
                Open Google Calendar in a web browser.
              </li>
              <li>
                Choose Other calendars → + → From URL.
              </li>
              <li>
                Paste the link and add the calendar.
              </li>
            </ol>

            <input
              type="text"
              value={calendarUrl}
              readOnly
              className="calendar-url"
            />

            <button
              type="button"
              className="subscribe-button"
              onClick={() => {
                navigator.clipboard.writeText(
                  calendarUrl
                );

                setCopied(true);

                setTimeout(() => {
                  setCopied(false);
                }, 2000);
              }}
            >
              {copied
                ? "Copied!"
                : "Copy calendar link"}
            </button>

            <button
              type="button"
              className="close-button"
              onClick={() =>
                setShowCalendarOptions(false)
              }
            >
              Close
            </button>
          </div>
        )}
      </section>

      <section className="schedule-section">
        <button
          type="button"
          className="schedule-button"
          onClick={() =>
            setShowSchedule((current) => !current)
          }
        >
          {showSchedule
            ? "Hide schedule"
            : "View NFL schedule"}
        </button>

        {showSchedule && (
          <>
            <select
              value={activeWeek}
              onChange={(e) =>
                setSelectedWeek(e.target.value)
              }
              className="week-select"
            >
              <option value="all">
                All Weeks
              </option>

              {weeks.map((week) => (
                <option
                  key={week}
                  value={week}
                >
                  Week {week}
                </option>
              ))}
            </select>

            {loading && (
              <p>Loading NFL fixtures...</p>
            )}

            {error && <p>{error}</p>}

            {!loading &&
              !error &&
              filteredGames.map((game) => (
                <div
                  className="game"
                  key={game.game_id}
                >
                  <div className="game-date">
                    {new Date(
                      game.kickoff_utc
                    ).toLocaleDateString(
                      "en-GB",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone:
                          "Europe/London",
                      }
                    )}
                  </div>

                  <div className="game-time">
                    {new Date(
                      game.kickoff_utc
                    ).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone:
                          "Europe/London",
                      }
                    )}
                  </div>

                  <div className="teams">
                    <div className="team">
                      <strong>
                        {game.away_team}
                      </strong>

                      <span>Away</span>
                    </div>

                    <div className="at">
                      @
                    </div>

                    <div className="team">
                      <strong>
                        {game.home_team}
                      </strong>

                      <span>Home</span>
                    </div>
                  </div>

                  {shouldShowScore(game) ? (
                    <div className="score">
                      {game.away_score} -{" "}
                      {game.home_score}
                    </div>
                  ) : scoreDelay === "never" ? (
                    <div className="status">
                      Score hidden
                    </div>
                  ) : (
                    <div className="status">
                      Upcoming
                    </div>
                  )}
                </div>
              ))}
          </>
        )}
      </section>

      <footer className="footer">
        <p>
          NFL Calendar is an independent fan-made service and is
          not affiliated with or endorsed by the NFL or any NFL
          team.
        </p>

        <p>
          Schedule data provided by nflverse.
        </p>
      </footer>

    </div>
  );
}

export default App;

