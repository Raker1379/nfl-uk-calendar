export async function onRequest() {
  const url =
    "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";

  const response = await fetch(url);

  if (!response.ok) {
    return new Response("Unable to fetch NFL schedule", {
      status: 500,
    });
  }

  const csv = await response.text();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Access-Control-Allow-Origin": "*",
    },
  });
}