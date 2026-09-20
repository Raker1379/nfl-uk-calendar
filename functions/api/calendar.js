
import { DateTime } from "luxon";
import { getNFLGames } from "./nfl-data.js";

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

  const selectedTeamNames = selectedTeams.map((code) =>
    getTeamName(code)
  );

  let calendarName = "NFL UK Calendar";

  if (selectedTeamNames.length === 1) {
    calendarName = `NFL UK Calendar — ${selectedTeamNames[0]}`;
  } else if (selectedTeamNames.length > 1) {
    calendarName = `NFL UK Calendar — ${selectedTeamNames.length} Teams`;
  }

  let csv;

    try {
    csv = await getNFLGames();
    } catch (error) {
    console.error(error);

    return new Response("Unable to fetch NFL schedule", {
        status: 500,
    });
    }

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

  /*
    ALL 2026 NFL GAMES

    This is the complete league schedule and is used
    for the weekly results report.
  */

  const allSeasonGames = games
    .filter((game) => game.season === "2026")
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

  /*
    PERSONALISED GAMES

    These are the games shown as normal calendar
    events. If no teams are selected, all teams are shown.
  */

  const seasonGames = allSeasonGames.filter((game) => {
    if (selectedTeams.length === 0) {
      return true;
    }

    return (
      selectedTeams.includes(game.away_team) ||
      selectedTeams.includes(game.home_team)
    );
  });

  /*
    NORMAL CALENDAR EVENTS
  */

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
    WEEKLY LEAGUE-WIDE REPORTS

    The report uses ALL NFL games, regardless of the
    teams selected by the user.

    The report appears 4 hours after the final scheduled
    game of that week kicks off.
  */

  if (weeklyReport && scoreDelay !== "never") {
    const weeks = [
      ...new Set(
        allSeasonGames.map((game) => game.week)
      ),
    ];

    weeks.forEach((week) => {
      const weekGames = allSeasonGames.filter(
        (game) => game.week === week
      );

      if (weekGames.length === 0) {
        return;
      }

            const lastGame =
        weekGames[weekGames.length - 1];

      /*
        Only create the weekly report once the final
        scheduled game has an actual result.

        This is more reliable than using a fixed number
        of hours after kickoff because games can be delayed
        or run longer than expected.
      */

      const lastGameHasScore =
        lastGame.away_score !== "" &&
        lastGame.home_score !== "" &&
        lastGame.away_score != null &&
        lastGame.home_score != null;

      if (!lastGameHasScore) {
        return;
      }

      const finalGameKickoff = DateTime.fromISO(
        lastGame.kickoff_utc
      );

      const reportStart = finalGameKickoff.plus({
        hours: 4,
      });

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

  /*
    BUILD CALENDAR
  */

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

