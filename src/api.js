import { DateTime } from "luxon";

export async function getSchedule() {
  const response = await fetch("/api/schedule");

  if (!response.ok) {
    throw new Error("Could not load NFL schedule");
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

return games
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
  .sort((a, b) => {
    return new Date(a.kickoff_utc) - new Date(b.kickoff_utc);
  });
}