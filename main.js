// --- Fetch and Display NHL Standings (2025) ---
async function fetchNHLStandings() {
  const url = "https://api.sportsdata.io/v3/nhl/scores/json/Standings/2025?key=00b212fa10cb4506ab8ed805d3902ca7";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    const tableBody = document.querySelector("tbody");
    tableBody.innerHTML = ""; // Clear table

    data.forEach(team => {
      const calculatedPoints = (team.Wins * 2) + (team.OvertimeLosses || 0); // FIX: Calculate points manually

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><img src="${team.TeamLogoUrl}" alt="${team.Name}" style="height:30px; vertical-align:middle;"> ${team.Name}</td>
        <td>${team.Wins}</td>
        <td>${team.Losses}</td>
        <td>${team.OvertimeLosses}</td>
        <td>${calculatedPoints}</td> <!-- Use calculated points here -->
      `;

      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Error fetching NHL standings:", error);
  }
}

fetchNHLStandings();
