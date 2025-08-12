// --- 1. SETUP ---

const flagContainer = document.getElementById('flag-container');
const optionsContainer = document.getElementById('options-container');
const feedbackText = document.getElementById('feedback-text');
const scoreSpan = document.getElementById('score');
const nextButton = document.getElementById('next-button');
const regionSelect = document.getElementById('region-select');
const restartButton = document.getElementById('restart-button');
const streakSpan = document.getElementById('streak');
const highScoreSpan = document.getElementById('high-score');
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const timerContainer = document.getElementById('timer-container');
const timerSpan = document.getElementById('timer');
const hintButton = document.getElementById('hint-button');
const hintsRemainingSpan = document.getElementById('hints-remaining');

let allCountries = [];
let filteredCountries = [];
let score = 0;
let streak = 0;
let highScore = 0;
let hintsRemaining = 0;
let currentCorrectCountry = null;
let currentOptions = [];
let timer;
let timeLeft;

const TIME_LIMIT = 10;
const HINT_COUNT = 3;

// --- 2. FETCH DATA FROM API ---
async function fetchCountries() {
    try {
        feedbackText.textContent = "Loading flags...";
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,region,capital,population,subregion');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        allCountries = data.filter(country => country.name.common && country.flags.svg && country.region && country.capital);
        console.log(`Successfully loaded ${allCountries.length} countries.`);
        startGame();
    } catch (error) {
        console.error("Failed to fetch country data:", error);
        feedbackText.textContent = "Failed to load country data. Please check your connection and refresh the page.";
    }
}

// --- 3. GAME LOGIC ---

function startGame() {
    highScore = localStorage.getItem('flagGuesserHighScore') || 0;
    highScoreSpan.textContent = highScore;
    score = 0;
    streak = 0;
    hintsRemaining = HINT_COUNT;
    scoreSpan.textContent = score;
    streakSpan.textContent = streak;
    hintsRemainingSpan.textContent = `(${hintsRemaining})`;
    
    updateModeLabel();
    filterCountriesByRegion();
    loadQuestion();
}

function filterCountriesByRegion() {
    const selectedRegion = regionSelect.value;
    if (selectedRegion === 'Worldwide') {
        filteredCountries = [...allCountries];
    } else {
        filteredCountries = allCountries.filter(country => country.region === selectedRegion);
    }
    console.log(`Starting game with ${filteredCountries.length} countries from ${selectedRegion}.`);
}

function startTimer() {
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    timerSpan.textContent = timeLeft;
    timerContainer.classList.remove('hidden');
    timer = setInterval(() => {
        timeLeft--;
        timerSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            checkAnswer(null);
        }
    }, 1000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function loadQuestion() {
    clearInterval(timer);
    timerContainer.classList.add('hidden');
    optionsContainer.innerHTML = '';
    feedbackText.innerHTML = ''; // Changed to innerHTML to allow line breaks
    nextButton.classList.add('hidden');
    hintButton.disabled = false;

    if (filteredCountries.length < 4) {
        feedbackText.textContent = `Not enough countries in ${regionSelect.value} to play.`;
        flagContainer.innerHTML = '';
        return;
    }

    const correctCountryIndex = Math.floor(Math.random() * filteredCountries.length);
    currentCorrectCountry = filteredCountries[correctCountryIndex];

    currentOptions = [currentCorrectCountry];
    const wrongCountries = [];
    while (wrongCountries.length < 3) {
        const randomIndex = Math.floor(Math.random() * filteredCountries.length);
        const randomCountry = filteredCountries[randomIndex];
        if (randomCountry.name.common !== currentCorrectCountry.name.common && !wrongCountries.some(c => c.name.common === randomCountry.name.common)) {
            wrongCountries.push(randomCountry);
        }
    }
    currentOptions.push(...wrongCountries);
    shuffleArray(currentOptions);

    flagContainer.innerHTML = `<img src="${currentCorrectCountry.flags.svg}" alt="Flag of a country">`;

    currentOptions.forEach(country => {
        const button = document.createElement('button');
        button.textContent = country.name.common;
        button.classList.add('option-button');
        button.addEventListener('click', () => checkAnswer(country.name.common));
        optionsContainer.appendChild(button);
    });

    feedbackText.textContent = "Which country's flag is this?";
    if (modeToggle.checked) startTimer();
}

function useHint() {
    if (hintsRemaining > 0) {
        hintsRemaining--;
        hintsRemainingSpan.textContent = `(${hintsRemaining})`;
        hintButton.disabled = true;

        const wrongOptions = currentOptions.filter(c => c.name.common !== currentCorrectCountry.name.common);
        shuffleArray(wrongOptions);

        const optionsToDisable = [wrongOptions[0], wrongOptions[1]];
        const buttons = optionsContainer.querySelectorAll('.option-button');

        buttons.forEach(button => {
            if (optionsToDisable.some(option => option.name.common === button.textContent)) {
                button.disabled = true;
                button.style.opacity = '0.5';
            }
        });
    }
}

function checkAnswer(selectedCountryName) {
    clearInterval(timer);
    const buttons = optionsContainer.querySelectorAll('.option-button');
    buttons.forEach(button => button.disabled = true);
    hintButton.disabled = true;

    let feedbackMessage = '';

    if (selectedCountryName && selectedCountryName === currentCorrectCountry.name.common) {
        score++;
        streak++;
        scoreSpan.textContent = score;
        streakSpan.textContent = streak;
        feedbackMessage = "Correct!";
        if (score > highScore) {
            highScore = score;
            highScoreSpan.textContent = highScore;
            localStorage.setItem('flagGuesserHighScore', highScore);
        }
        buttons.forEach(button => {
            if (button.textContent === selectedCountryName) button.classList.add('correct');
        });
    } else {
        streak = 0;
        streakSpan.textContent = streak;
        if (selectedCountryName === null) {
             feedbackMessage = `Time's up! The answer was ${currentCorrectCountry.name.common}.`;
        } else {
             feedbackMessage = `Wrong! The correct answer was ${currentCorrectCountry.name.common}.`;
        }
        buttons.forEach(button => {
            if (button.textContent === selectedCountryName) button.classList.add('incorrect');
            if (button.textContent === currentCorrectCountry.name.common) button.classList.add('correct');
        });
    }
    
    // --- NEW: Add the Fun Fact ---
    const capital = currentCorrectCountry.capital[0];
    const population = currentCorrectCountry.population.toLocaleString(); // Format with commas
    const funFact = `Did you know? The capital of ${currentCorrectCountry.name.common} is ${capital}, and its population is around ${population}.`;
    
    // We use innerHTML to allow for a line break
    feedbackText.innerHTML = `${feedbackMessage}<br><small>${funFact}</small>`;

    nextButton.classList.remove('hidden');
}

function updateModeLabel() {
    if (modeToggle.checked) {
        modeLabel.textContent = "Timed";
    } else {
        modeLabel.textContent = "Normal";
    }
}


// --- 4. EVENT LISTENERS ---

regionSelect.addEventListener('change', startGame);
restartButton.addEventListener('click', startGame);
nextButton.addEventListener('click', loadQuestion);
modeToggle.addEventListener('change', () => {
    updateModeLabel();
    startGame();
});
hintButton.addEventListener('click', useHint);

// --- 5. INITIALIZATION ---
fetchCountries();