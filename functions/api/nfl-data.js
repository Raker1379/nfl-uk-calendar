export async function getNFLGames() {
  const response = await fetch(
    "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
  );

  if (!response.ok) {
    throw new Error("Unable to fetch NFL schedule");
  }

  return await response.text();
}