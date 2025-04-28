// predictor.js - Enhanced NHL Matchup Predictor

// Store team stats globally after fetching
let teamStats = {};

// Fetch team stats from the API
async function fetchTeamStats() {
  const url = "https://api.sportsdata.io/v3/nhl/scores/json/Standings/2025?key=00b212fa10cb4506ab8ed805d3902ca7";
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    // Process and store the stats
    data.forEach(team => {
      // Create a lookup map for team names
      const teamName = nameFixMap[team.Name] || team.Name;
      
      // Store multiple stats for better prediction
      teamStats[teamName] = {
        wins: team.Wins,
        losses: team.Losses,
        otLosses: team.OvertimeLosses,
        winPercentage: team.Wins / (team.Wins + team.Losses + team.OvertimeLosses),
        points: team.Points,
        goalsScored: team.GoalsScored || 0,
        goalsAgainst: team.GoalsAgainst || 0,
        goalDifferential: (team.GoalsScored || 0) - (team.GoalsAgainst || 0),
        homeWins: team.HomeWins || 0,
        awayWins: team.AwayWins || 0,
        lastTenWins: team.LastTenWins || 0
      };
    });
    
    console.log("Team stats loaded successfully");
    // Enable prediction button once stats are loaded
    document.getElementById("predict-btn").disabled = false;
    
    return true;
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return false;
  }
}

// Predict winner using multiple factors
function predictWinner(team1Name, team2Name) {
  // If stats aren't loaded yet, fall back to random
  if (!teamStats[team1Name] || !teamStats[team2Name]) {
    console.warn("Team stats not available, using random prediction");
    return {
      winner: Math.random() > 0.5 ? team1Name : team2Name,
      confidence: 50,
      factors: { message: "Using random prediction (stats not loaded)" }
    };
  }
  
  const team1 = teamStats[team1Name];
  const team2 = teamStats[team2Name];
  
  // Calculate weighted factors (each contributes to prediction)
  const factors = {
    winPercentage: { 
      team1: team1.winPercentage, 
      team2: team2.winPercentage,
      weight: 0.35
    },
    goalDifferential: { 
      team1: team1.goalDifferential, 
      team2: team2.goalDifferential,
      weight: 0.25
    },
    lastTenGames: { 
      team1: team1.lastTenWins / 10, 
      team2: team2.lastTenWins / 10,
      weight: 0.20
    },
    headToHead: { 
      // This would ideally use head-to-head record, but for now use home/away advantage
      team1: team1.homeWins / (team1.homeWins + team1.awayWins || 1),
      team2: team2.awayWins / (team2.homeWins + team2.awayWins || 1),
      weight: 0.10
    },
    momentum: {
      // Simple momentum indicator (more recent wins = more momentum)
      team1: (team1.wins - team1.lastTenWins) / (team1.wins || 1),
      team2: (team2.wins - team2.lastTenWins) / (team2.wins || 1),
      weight: 0.10
    }
  };
  
  // Calculate weighted score for each team
  let team1Score = 0;
  let team2Score = 0;
  
  for (const [key, factor] of Object.entries(factors)) {
    team1Score += factor.team1 * factor.weight;
    team2Score += factor.team2 * factor.weight;
  }
  
  // Add small random factor (for variability)
  const randomFactor = 0.05;
  team1Score += Math.random() * randomFactor;
  team2Score += Math.random() * randomFactor;
  
  // Determine winner and confidence
  let winner, loser, winnerScore, loserScore;
  if (team1Score > team2Score) {
    winner = team1Name;
    loser = team2Name;
    winnerScore = team1Score;
    loserScore = team2Score;
  } else {
    winner = team2Name;
    loser = team1Name;
    winnerScore = team2Score;
    loserScore = team1Score;
  }
  
  // Calculate confidence (0-100%)
  const totalScore = winnerScore + loserScore;
  const confidence = Math.round((winnerScore / totalScore) * 100);
  
  // Determine key factors
  const keyFactors = [];
  for (const [key, factor] of Object.entries(factors)) {
    const team1Value = factor.team1;
    const team2Value = factor.team2;
    const difference = Math.abs(team1Value - team2Value);
    
    if (difference > 0.1) { // Only include significant factors
      const betterTeam = team1Value > team2Value ? team1Name : team2Name;
      keyFactors.push({
        factor: key,
        advantage: betterTeam,
        difference: difference.toFixed(2)
      });
    }
  }
  
  // Sort key factors by difference (descending)
  keyFactors.sort((a, b) => b.difference - a.difference);
  
  return {
    winner,
    loser,
    confidence,
    keyFactors: keyFactors.slice(0, 3) // Top 3 factors
  };
}

// Display the prediction result with visualization
function displayPrediction(prediction) {
  const resultElement = document.getElementById("result");
  
  // Create result text with confidence
  let resultHTML = `<div class="prediction-header">Predicted Winner: <span class="winner-name">${prediction.winner}</span></div>`;
  resultHTML += `<div class="confidence">Confidence: <span class="confidence-value">${prediction.confidence}%</span></div>`;
  
  // Add key factors section
  if (prediction.keyFactors && prediction.keyFactors.length > 0) {
    resultHTML += `<div class="key-factors">
      <h3>Key Factors</h3>
      <ul>`;
      
    // Display readable versions of the factors
    const factorLabels = {
      winPercentage: "Win Percentage",
      goalDifferential: "Goal Differential",
      lastTenGames: "Last 10 Games Performance",
      headToHead: "Home/Away Advantage",
      momentum: "Season Momentum"
    };
    
    prediction.keyFactors.forEach(factor => {
      resultHTML += `<li><span class="factor-name">${factorLabels[factor.factor] || factor.factor}:</span> 
                    <span class="factor-team">${factor.advantage}</span> has the advantage</li>`;
    });
    
    resultHTML += `</ul></div>`;
  }
  
  resultElement.innerHTML = resultHTML;
  resultElement.classList.remove("reveal");
  void resultElement.offsetWidth; // Force reflow
  resultElement.classList.add("reveal");
}

// Initialize the predictor
document.addEventListener("DOMContentLoaded", () => {
  populateDropdown("team1");
  populateDropdown("team2");
  
  // Disable prediction button until stats are loaded
  const predictButton = document.getElementById("predict-btn");
  predictButton.disabled = true;
  predictButton.textContent = "Loading stats...";
  
  // Fetch stats on page load
  fetchTeamStats().then(success => {
    if (success) {
      predictButton.disabled = false;
      predictButton.textContent = "Predict Winner";
    }
  });
  
  // Add form submission handler
  document.getElementById("predictor-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const team1 = document.getElementById("team1").value;
    const team2 = document.getElementById("team2").value;
    
    // Update logos
    updateLogo(team1, "logo1");
    updateLogo(team2, "logo2");
    
    // Make prediction
    const prediction = predictWinner(team1, team2);
    
    // Display result
    displayPrediction(prediction);
  });
});

// Add these styles to your CSS
const newStyles = `
  .prediction-header {
    font-size: 1.8rem;
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  .winner-name {
    color: #ffd700;
  }
  
  .confidence {
    font-size: 1.2rem;
    margin-bottom: 20px;
  }
  
  .confidence-value {
    font-weight: bold;
  }
  
  .key-factors {
    margin-top: 20px;
    text-align: left;
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 8px;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .key-factors h3 {
    text-align: center;
    margin-top: 0;
  }
  
  .key-factors ul {
    list-style-type: none;
    padding: 0;
  }
  
  .key-factors li {
    margin-bottom: 8px;
    padding: 5px;
  }
  
  .factor-name {
    font-weight: bold;
    margin-right: 5px;
  }
  
  .factor-team {
    color: #4fc3f7;
  }
  
  /* Team comparison section */
  .team-comparison {
    display: flex;
    justify-content: space-between;
    margin: 20px auto;
    max-width: 800px;
  }
  
  .stat-bar {
    height: 20px;
    background: #ddd;
    position: relative;
    margin: 8px 0;
    border-radius: 10px;
    overflow: hidden;
  }
  
  .stat-value {
    height: 100%;
    background: linear-gradient(to right, #4fc3f7, #0277bd);
    border-radius: 10px 0 0 10px;
  }
  
  .stat-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
`;

// Add a function to add the styles to the page
function addPredictorStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = newStyles;
  document.head.appendChild(styleElement);
}

// Call this function when the page loads
document.addEventListener("DOMContentLoaded", addPredictorStyles);