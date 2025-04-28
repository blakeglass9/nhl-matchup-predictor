// --- Fetch NHL Standings (2025) ---
async function fetchNHLStandings() {
  const url = "https://api.sportsdata.io/v3/nhl/scores/json/Standings/2025?key=00b212fa10cb4506ab8ed805d3902ca7";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    console.log("2025 NHL Standings:");
    data.forEach(team => {
      console.log(`${team.Name}: W: ${team.Wins}, L: ${team.Losses}, OT: ${team.OvertimeLosses}`);
    });
  } catch (error) {
    console.error("Error fetching NHL standings:", error);
  }
}

fetchNHLStandings();
