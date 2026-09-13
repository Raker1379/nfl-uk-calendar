import { DateTime } from "luxon";

const teamNames = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders",
  LAC: "Los Angeles Chargers",
  LA: "Los Angeles Rams",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

function getTeamName(code) {
  return teamNames[code] || code;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const scoreDelay =
    url.searchParams.get("delay") || "after";

  const weeklyReport =
    url.searchParams.get("weekly") === "true";

    const selectedTeamsParam =
        url.searchParams.get("teams");

    const selectedTeams = selectedTeamsParam
        ? selectedTeamsParam.split(",")
        : [];

const selectedTeamNames = selectedTeams
  .map((code) => getTeamName(code));

    let calendarName = "NFL UK Calendar";

if (selectedTeamNames.length === 1) {
  calendarName = `NFL UK Calendar — ${selectedTeamNames[0]}`;
} else if (selectedTeamNames.length > 1) {
  calendarName = `NFL UK Calendar — ${selectedTeamNames.length} Teams`;
}

  const response = await fetch(
    "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
  );

  if (!response.ok) {
    return new Response("Unable to fetch NFL schedule", {
      status: 500,
    });
  }

  const csv = await response.text();

  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");

  const games = lines.slice(1).map((line) => {
    const values = line.split(",");
    const game = {};

    headers.forEach((header, index) => {
      game[header] = values[index];
    });

    return game;
  });

  const seasonGames = games
    .filter((game) => game.season === "2026")
    .filter((game) => {
        if (selectedTeams.length === 0) {
        return true;
        }

        return (
        selectedTeams.includes(game.away_team) ||
        selectedTeams.includes(game.home_team)
        );
    })
    .map((game) => {
      const kickoff = DateTime.fromISO(
        `${game.gameday}T${game.gametime}`,
        {
          zone: "America/New_York",
        }
      );

      return {
        ...game,
        kickoff_utc: kickoff.toUTC().toISO(),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.kickoff_utc) -
        new Date(b.kickoff_utc)
    );

  const events = seasonGames.map((game) => {
    const start = DateTime.fromISO(game.kickoff_utc);
    const end = start.plus({ hours: 3 });

    const hasScore =
      game.away_score !== "" &&
      game.home_score !== "" &&
      game.away_score != null &&
      game.home_score != null;

    let showScore = false;

    if (hasScore) {
      if (scoreDelay === "live") {
        showScore = true;
      } else if (scoreDelay === "never") {
        showScore = false;
      } else {
        const delayHours =
          scoreDelay === "12h"
            ? 12
            : scoreDelay === "24h"
            ? 24
            : 0;

        const scoreAvailableAt = start.plus({
          hours: delayHours,
        });

        showScore =
          DateTime.utc() >= scoreAvailableAt.toUTC();
      }
    }

    return [
      "BEGIN:VEVENT",
      `UID:${game.game_id}@nflukcalendar`,
      `DTSTAMP:${DateTime.utc().toFormat(
        "yyyyMMdd'T'HHmmss'Z'"
      )}`,
      `DTSTART:${start.toUTC().toFormat(
        "yyyyMMdd'T'HHmmss'Z'"
      )}`,
      `DTEND:${end.toUTC().toFormat(
        "yyyyMMdd'T'HHmmss'Z'"
      )}`,
      `SUMMARY:${
        showScore
          ? `${getTeamName(game.away_team)} ${game.away_score} - ${game.home_score} ${getTeamName(game.home_team)}`
          : `${getTeamName(game.away_team)} @ ${getTeamName(game.home_team)}`
      }`,
      `DESCRIPTION:NFL Week ${game.week}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  /*
    WEEKLY REPORTS

    A weekly report is only created once the final
    scheduled game of that week has finished.

    Individual scores inside the report still honour
    the selected delay setting.
  */

  if (weeklyReport && scoreDelay !== "never") {
    const weeks = [
      ...new Set(seasonGames.map((game) => game.week)),
    ];

    weeks.forEach((week) => {
      const weekGames = seasonGames.filter(
        (game) => game.week === week
      );

      if (weekGames.length === 0) {
        return;
      }

      const lastGame =
        weekGames[weekGames.length - 1];

      const finalGameKickoff = DateTime.fromISO(
        lastGame.kickoff_utc
      );

      /*
        The weekly report becomes available 4 hours
        after the final scheduled game kicks off.
      */

      const reportStart = finalGameKickoff.plus({
        hours: 4,
      });

      /*
        Don't create the report until the final game
        has actually finished.
      */

      if (DateTime.utc() < reportStart.toUTC()) {
        return;
      }

      const weekResults = weekGames
        .filter((game) => {
          const hasScore =
            game.away_score !== "" &&
            game.home_score !== "" &&
            game.away_score != null &&
            game.home_score != null;

          if (!hasScore) {
            return false;
          }

          const kickoff = DateTime.fromISO(
            game.kickoff_utc
          );

          if (scoreDelay === "live") {
            return DateTime.utc() >= kickoff.toUTC();
          }

          const delayHours =
            scoreDelay === "12h"
              ? 12
              : scoreDelay === "24h"
              ? 24
              : 0;

          const scoreAvailableAt =
            kickoff.plus({
              hours: delayHours,
            });

          return (
            DateTime.utc() >=
            scoreAvailableAt.toUTC()
          );
        })
        .map(
          (game) =>
            `${getTeamName(game.away_team)} ${game.away_score}-${game.home_score} ${getTeamName(game.home_team)}`
        );

      if (weekResults.length === 0) {
        return;
      }

      const reportEnd = reportStart.plus({
        hours: 1,
      });

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:week-${week}@nflukcalendar`,
          `DTSTAMP:${DateTime.utc().toFormat(
            "yyyyMMdd'T'HHmmss'Z'"
          )}`,
          `DTSTART:${reportStart
            .toUTC()
            .toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
          `DTEND:${reportEnd
            .toUTC()
            .toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
          `SUMMARY:NFL Week ${week} - Results`,
          `DESCRIPTION:${weekResults.join("\\n")}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    });
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NFL UK Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type":
        "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}