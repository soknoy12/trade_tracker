
// Database and state management
let db;
const DB_NAME = "ProfitCalculatorDB";
const DB_VERSION = 1;
const STORE_CALCULATIONS = "calculations";
const STORE_INVESTORS = "investors";

function initDatabase()
{
    return new Promise((resolve, reject) =>
    {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = event =>
        {
            console.error("Database error:", event.target.error);
            reject("Database error");
        };

        request.onsuccess = event =>
        {
            db = event.target.result;
            console.log("Database initialized.");
            resolve(db);
        };

        request.onupgradeneeded = event =>
        {
            const db = event.target.result;

            // Create calculations store
            const calculationsStore = db.createObjectStore(STORE_CALCULATIONS, {
                keyPath: "id",
                autoIncrement: true,
            });
            calculationsStore.createIndex("date", "calculation_date", {
                unique: false,
            });

            // Create investors store
            const investorsStore = db.createObjectStore(STORE_INVESTORS, {
                keyPath: "id",
                autoIncrement: true,
            });
            investorsStore.createIndex("calculation_id", "calculation_id", {
                unique: false,
            });
        };
    });
}

function saveNote()
{
    const input = document.getElementById("noteInput").value;

    if (!db) {
        document.getElementById("status").innerText =
            "Database not initialized.";
        return;
    }

    const transaction = db.transaction([STORE_CALCULATIONS], "readwrite");
    const store = transaction.objectStore(STORE_CALCULATIONS);

    const note = {
        content: input,
        timestamp: new Date().getTime(),
    };

    const request = store.add(note);

    request.onsuccess = () =>
    {
        document.getElementById("status").innerText = "Note saved!";
        console.log("Saved:", input);
    };

    request.onerror = event =>
    {
        console.error("Insert error:", event.target.error);
    };
}

// Initialize database on page load
document.addEventListener("DOMContentLoaded", () =>
{
    initDatabase().catch(err =>
    {
        alert("Failed to initialize database: " + err);
    });
});

let currentCalculationId = null;
let investorCount = 0;
let investors = [];

// DOM elements
const elements = {
    inputs: {
        totalProfit: document.getElementById("totalProfit"),
        traderCapital: document.getElementById("traderCapital"),
        calculationNotes: document.getElementById("calculationNotes"),
    },
    buttons: {
        addInvestor: document.getElementById("addInvestorBtn"),
        saveCalculation: document.getElementById("saveCalculationBtn"),
        loadHistory: document.getElementById("loadHistoryBtn"),
        deleteCalculation: document.getElementById("deleteCalculationBtn"),
    },
    results: {
        totalPool: document.getElementById("totalPool"),
        traderShare: document.getElementById("traderShare"),
        traderFees: document.getElementById("traderFees"),
        totalInvestors: document.getElementById("totalInvestors"),
        profitStatus: document.getElementById("profitStatus"),
        ownershipTable: document.getElementById("ownershipTableBody"),
    },
    containers: {
        investors: document.getElementById("investorsContainer"),
        history: document.getElementById("historyContainer"),
    },
    modals: {
        calculationDetails: document.getElementById(
            "calculationDetailsModal"
        ),
        closeButtons: document.querySelectorAll(".close-modal"),
    },
    modalElements: {
        date: document.getElementById("modalCalculationDate"),
        totalProfit: document.getElementById("modalTotalProfit"),
        traderCapital: document.getElementById("modalTraderCapital"),
        totalPool: document.getElementById("modalTotalPool"),
        profitStatus: document.getElementById("modalProfitStatus"),
        ownershipTable: document.getElementById("modalOwnershipTableBody"),
        notes: document.getElementById("modalNotesContent"),
    },
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function ()
{
    setupEventListeners();
    initializeDemo();
});

// Set up event listeners
function setupEventListeners()
{
    // Input changes
    elements.inputs.totalProfit.addEventListener("input", calculateShares);
    elements.inputs.traderCapital.addEventListener(
        "input",
        calculateShares
    );

    // Buttons
    elements.buttons.addInvestor.addEventListener("click", addInvestor);
    elements.buttons.saveCalculation.addEventListener(
        "click",
        saveCurrentCalculation
    );
    elements.buttons.loadHistory.addEventListener("click", loadHistory);
    elements.buttons.deleteCalculation.addEventListener(
        "click",
        deleteCurrentCalculation
    );

    // Modal
    elements.modals.closeButtons.forEach(btn =>
    {
        btn.addEventListener("click", () =>
        {
            elements.modals.calculationDetails.style.display = "none";
            currentCalculationId = null;
        });
    });

    // Close modal when clicking outside
    window.addEventListener("click", event =>
    {
        if (event.target === elements.modals.calculationDetails) {
            elements.modals.calculationDetails.style.display = "none";
            currentCalculationId = null;
        }
    });
}

// Investor management
function addInvestor()
{
    investorCount++;
    const investorId = `investor${ investorCount }`;

    const investorDiv = document.createElement("div");
    investorDiv.className = "investor-item";
    investorDiv.id = `${ investorId }Container`;

    investorDiv.innerHTML = `
            <div class="investor-header">
                <h4 class="investor-title">Investor ${ investorCount }</h4>
                <button class="remove-btn" onclick="removeInvestor('${ investorId }')">Remove</button>
            </div>
            <div class="investor-inputs">
                <div class="input-group">
                    <label for="${ investorId }Capital">Capital ($)</label>
                    <input type="number" id="${ investorId }Capital" placeholder="Enter capital amount" step="0.01" min="0">
                </div>
                <div class="input-group">
                    <label for="${ investorId }Fee">Fee Rate (%)</label>
                    <input type="number" id="${ investorId }Fee" placeholder="Fee %" step="0.1" min="0" max="100">
                </div>
            </div>
        `;

    elements.containers.investors.appendChild(investorDiv);

    // Add event listeners to new inputs
    document
        .getElementById(`${ investorId }Capital`)
        .addEventListener("input", calculateShares);
    document
        .getElementById(`${ investorId }Fee`)
        .addEventListener("input", calculateShares);

    // Add to investors array
    investors.push({
        id: investorId,
        number: investorCount,
    });

    calculateShares();
}

function removeInvestor(investorId)
{
    // Remove from DOM
    const container = document.getElementById(`${ investorId }Container`);
    if (container) {
        container.remove();
    }

    // Remove from investors array
    investors = investors.filter(inv => inv.id !== investorId);

    calculateShares();
}

function getInvestorData()
{
    return investors
        .map(investor =>
        {
            const capitalEl = document.getElementById(`${ investor.id }Capital`);
            const feeEl = document.getElementById(`${ investor.id }Fee`);

            return {
                id: investor.id,
                number: investor.number,
                capital: parseFloat(capitalEl?.value) || 0,
                feeRate: parseFloat(feeEl?.value) || 0,
            };
        })
        .filter(inv => inv.capital > 0); // Only include investors with capital
}

// Calculation functions
function calculateShares()
{
    // Get input values
    const totalProfit = parseFloat(elements.inputs.totalProfit.value) || 0;
    const traderCapital =
        parseFloat(elements.inputs.traderCapital.value) || 0;
    const investorData = getInvestorData();

    // Calculate total capital pool
    const totalInvestorCapital = investorData.reduce(
        (sum, inv) => sum + inv.capital,
        0
    );
    const totalCapital = traderCapital + totalInvestorCapital;

    // Calculate ownership percentages
    const traderOwnership =
        totalCapital > 0 ? (traderCapital / totalCapital) * 100 : 0;

    let traderFees = 0;
    let traderProfit = 0;
    const investorResults = [];

    if (totalProfit > 0) {
        // Calculate profit shares based on capital ownership
        const traderProfitShare =
            totalProfit * (traderCapital / totalCapital);

        // Calculate investor profits and fees
        investorData.forEach(investor =>
        {
            const investorProfitShare =
                totalProfit * (investor.capital / totalCapital);
            const investorFee = investorProfitShare * (investor.feeRate / 100);

            traderFees += investorFee;

            investorResults.push({
                ...investor,
                ownership: (investor.capital / totalCapital) * 100,
                profitShare: investorProfitShare,
                fee: investorFee,
                finalProfit: investorProfitShare - investorFee,
                finalBalance:
                    investor.capital + investorProfitShare - investorFee,
            });
        });

        // Final trader profit (own share + fees)
        traderProfit = traderProfitShare + traderFees;
    } else {
        // For losses, distribute proportionally with no fees
        traderProfit = totalProfit * (traderCapital / totalCapital);

        investorData.forEach(investor =>
        {
            const investorLoss =
                totalProfit * (investor.capital / totalCapital);

            investorResults.push({
                ...investor,
                ownership: (investor.capital / totalCapital) * 100,
                profitShare: investorLoss,
                fee: 0,
                finalProfit: investorLoss,
                finalBalance: investor.capital + investorLoss,
            });
        });
    }

    // Calculate final balances
    const traderFinalBalance = traderCapital + traderProfit;

    // Update results display
    updateResultsDisplay({
        totalProfit,
        traderCapital,
        totalCapital,
        traderFinalBalance,
        traderFees,
        investorData,
        traderProfit,
        investorResults,
    });

    // Return calculation data for saving
    return {
        totalProfit,
        traderCapital,
        totalCapital,
        traderFinalBalance,
        traderFees,
        isProfit: totalProfit >= 0,
        investorResults,
        notes: elements.inputs.calculationNotes.value,
        calculation_date: new Date().getTime(),
    };
}

function updateResultsDisplay(data)
{
    elements.results.totalPool.textContent = formatCurrency(
        data.totalCapital
    );
    elements.results.traderShare.textContent = formatCurrency(
        data.traderFinalBalance
    );
    elements.results.traderFees.textContent = formatCurrency(
        data.traderFees
    );
    elements.results.totalInvestors.textContent =
        data.investorData.length.toString();

    // Update profit status
    const isProfit = data.totalProfit >= 0;
    elements.results.profitStatus.innerHTML = isProfit
        ? '<span class="profit-indicator profit">PROFIT</span>'
        : '<span class="profit-indicator loss">LOSS</span>';

    // Apply color classes to result values
    elements.results.traderShare.classList.toggle(
        "negative",
        data.traderFinalBalance < data.traderCapital
    );

    // Update ownership table
    updateOwnershipTable({
        traderCapital: data.traderCapital,
        traderOwnership:
            data.traderCapital > 0
                ? (data.traderCapital / data.totalCapital) * 100
                : 0,
        traderFinalBalance: data.traderFinalBalance,
        traderProfit: data.traderProfit,
        investorResults: data.investorResults,
    });
}

function updateOwnershipTable(data)
{
    const rows = [
        {
            name: "Trader (You)",
            capital: data.traderCapital,
            ownership: data.traderOwnership,
            finalBalance: data.traderFinalBalance,
            profitLoss: data.traderProfit,
        },
        ...data.investorResults.map(investor => ({
            name: `Investor ${ investor.number }`,
            capital: investor.capital,
            ownership: investor.ownership,
            finalBalance: investor.finalBalance,
            profitLoss: investor.finalProfit,
        })),
    ];

    elements.results.ownershipTable.innerHTML = rows
        .map(
            row => `
                    <tr>
                        <td><strong>${ row.name }</strong></td>
                        <td>${ formatCurrency(row.capital) }</td>
                        <td>${ formatPercentage(row.ownership) }</td>
                        <td class="${ row.finalBalance < row.capital ? "negative" : ""
                }">${ formatCurrency(row.finalBalance) }</td>
                        <td class="${ row.profitLoss < 0 ? "negative" : ""
                }">${ formatCurrency(row.profitLoss) }</td>
                    </tr>
                `
        )
        .join("");
}

// Database operations
async function saveCurrentCalculation()
{
    if (!db) {
        showError("Database not initialized.");
        return;
    }

    const calculationData = calculateShares();

    try {
        // Start a transaction
        const transaction = db.transaction(
            [STORE_CALCULATIONS, STORE_INVESTORS],
            "readwrite"
        );

        // Save calculation
        const calculationsStore = transaction.objectStore(STORE_CALCULATIONS);
        const calculationRequest = calculationsStore.add({
            total_profit: calculationData.totalProfit,
            trader_capital: calculationData.traderCapital,
            total_pool: calculationData.totalCapital,
            trader_share: calculationData.traderFinalBalance,
            trader_fees: calculationData.traderFees,
            profit_status: calculationData.isProfit ? "PROFIT" : "LOSS",
            notes: calculationData.notes,
            calculation_date: calculationData.calculation_date,
        });

        calculationRequest.onsuccess = event =>
        {
            const calculationId = event.target.result;

            // Save investors
            const investorsStore = transaction.objectStore(STORE_INVESTORS);
            calculationData.investorResults.forEach(investor =>
            {
                investorsStore.add({
                    calculation_id: calculationId,
                    investor_number: investor.number,
                    capital: investor.capital,
                    fee_rate: investor.feeRate,
                    ownership_percentage: investor.ownership,
                    profit_share: investor.profitShare,
                    fee_amount: investor.fee,
                    final_profit: investor.finalProfit,
                    final_balance: investor.finalBalance,
                });
            });

            showSuccess("Calculation saved successfully!");
            loadHistory();
        };

        calculationRequest.onerror = event =>
        {
            console.error("Error saving calculation:", event.target.error);
            showError("Failed to save calculation. Please try again.");
        };
    } catch (error) {
        console.error("Transaction error:", error);
        showError("Failed to save calculation. Please try again.");
    }
}

function loadHistory()
{
    if (!db) {
        showError("Database not initialized.");
        return;
    }

    const transaction = db.transaction([STORE_CALCULATIONS], "readonly");
    const store = transaction.objectStore(STORE_CALCULATIONS);
    const index = store.index("date");

    // Get all calculations sorted by date
    const request = index.getAll();

    request.onsuccess = event =>
    {
        const calculations = event.target.result;

        // For each calculation, count investors
        Promise.all(
            calculations.map(calc =>
            {
                return new Promise(resolve =>
                {
                    const investorTransaction = db.transaction(
                        [STORE_INVESTORS],
                        "readonly"
                    );
                    const investorStore =
                        investorTransaction.objectStore(STORE_INVESTORS);
                    const investorIndex = investorStore.index("calculation_id");
                    const countRequest = investorIndex.count(calc.id);

                    countRequest.onsuccess = e =>
                    {
                        resolve({
                            ...calc,
                            investor_count: e.target.result,
                        });
                    };

                    countRequest.onerror = () =>
                    {
                        resolve({
                            ...calc,
                            investor_count: 0,
                        });
                    };
                });
            })
        ).then(calculationsWithCounts =>
        {
            displayHistory(calculationsWithCounts.reverse()); // Show newest first
        });
    };

    request.onerror = event =>
    {
        console.error("Error loading history:", event.target.error);
        showError("Failed to load history. Please try again.");
    };
}

function displayHistory(calculations)
{
    if (calculations.length === 0) {
        elements.containers.history.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                    No calculations found in history.
                </div>
            `;
        return;
    }

    elements.containers.history.innerHTML = calculations
        .map(
            calc => `
                    <div class="history-item" data-id="${ calc.id }">
                        <div class="history-header">
                            <div class="history-date">${ formatDate(
                calc.calculation_date
            ) }</div>
                            <div class="history-profit ${ calc.total_profit >= 0 ? "positive" : "negative"
                }">
                                ${ formatCurrency(calc.total_profit) }
                            </div>
                        </div>
                        <div class="history-body">
                            <p>Trader Share: ${ formatCurrency(
                    calc.trader_share
                ) } | Fees: ${ formatCurrency(
                    calc.trader_fees
                ) } | Investors: ${ calc.investor_count }</p>
                            <button class="view-btn" onclick="showCalculationDetails(${ calc.id
                })">View</button>
                        </div>
                    </div>
                `
        )
        .join("");
}

function showCalculationDetails(id)
{
    if (!db) {
        showError("Database not initialized.");
        return;
    }

    // Get calculation
    const transaction = db.transaction([STORE_CALCULATIONS], "readonly");
    const store = transaction.objectStore(STORE_CALCULATIONS);
    const request = store.get(id);

    request.onsuccess = event =>
    {
        const calc = event.target.result;
        if (!calc) return;

        // Set modal values
        elements.modalElements.date.textContent = formatDate(
            calc.calculation_date
        );
        elements.modalElements.totalProfit.textContent = formatCurrency(
            calc.total_profit
        );
        elements.modalElements.traderCapital.textContent = formatCurrency(
            calc.trader_capital
        );
        elements.modalElements.totalPool.textContent = formatCurrency(
            calc.total_pool
        );
        elements.modalElements.profitStatus.innerHTML =
            calc.profit_status === "PROFIT"
                ? '<span class="profit-indicator profit">PROFIT</span>'
                : '<span class="profit-indicator loss">LOSS</span>';
        elements.modalElements.notes.textContent = calc.notes || "—";

        // Get related investors
        const investorTransaction = db.transaction(
            [STORE_INVESTORS],
            "readonly"
        );
        const investorStore =
            investorTransaction.objectStore(STORE_INVESTORS);
        const investorIndex = investorStore.index("calculation_id");
        const investorRequest = investorIndex.getAll(id);

        investorRequest.onsuccess = e =>
        {
            const investors = e.target.result;
            const rows = investors.map(
                inv => `
                    <tr>
                        <td>Investor ${ inv.investor_number }</td>
                        <td>${ formatCurrency(inv.capital) }</td>
                        <td>${ formatPercentage(inv.ownership_percentage) }</td>
                        <td>${ formatCurrency(inv.final_balance) }</td>
                        <td>${ formatCurrency(inv.final_profit) }</td>
                    </tr>
                `
            );

            elements.modalElements.ownershipTable.innerHTML = rows.join("");
            elements.modals.calculationDetails.style.display = "block";
            currentCalculationId = id;
        };
    };
}

function deleteCurrentCalculation()
{
    if (!currentCalculationId) {
        showError("No calculation selected to delete.");
        return;
    }

    if (!db) {
        showError("Database not initialized.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this calculation? This cannot be undone."
    );
    if (!confirmed) return;

    const transaction = db.transaction(
        [STORE_CALCULATIONS, STORE_INVESTORS],
        "readwrite"
    );

    // Delete investors first
    const investorStore = transaction.objectStore(STORE_INVESTORS);
    const investorIndex = investorStore.index("calculation_id");
    const investorRequest = investorIndex.openCursor(
        IDBKeyRange.only(currentCalculationId)
    );

    investorRequest.onsuccess = event =>
    {
        const cursor = event.target.result;
        if (cursor) {
            investorStore.delete(cursor.primaryKey);
            cursor.continue();
        }
    };

    // Then delete the calculation
    transaction.oncomplete = () =>
    {
        const calcTransaction = db.transaction(
            [STORE_CALCULATIONS],
            "readwrite"
        );
        const calcStore = calcTransaction.objectStore(STORE_CALCULATIONS);
        calcStore.delete(currentCalculationId);

        calcTransaction.oncomplete = () =>
        {
            showSuccess("Calculation deleted.");
            elements.modals.calculationDetails.style.display = "none";
            loadHistory();
            currentCalculationId = null;
        };
    };
}

// Utils
function formatCurrency(value)
{
    return "$" + value.toFixed(2);
}

function formatPercentage(value)
{
    return value.toFixed(2) + "%";
}

function formatDate(timestamp)
{
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function showError(message)
{
    alert("❌ " + message);
}

function showSuccess(message)
{
    alert("✅ " + message);
}

// Replace the existing initializeDemo function with this updated version
async function initializeFromLatest()
{
    if (!db) {
        console.log("Database not initialized, using default demo values");
        initializeDemo();
        return;
    }

    try {
        // Get the latest calculation
        const transaction = db.transaction([STORE_CALCULATIONS], "readonly");
        const store = transaction.objectStore(STORE_CALCULATIONS);
        const index = store.index("date");

        // Get all calculations and find the most recent one
        const request = index.getAll();

        request.onsuccess = async event =>
        {
            const calculations = event.target.result;

            if (calculations.length === 0) {
                console.log("No saved calculations found, using demo values");
                initializeDemo();
                return;
            }

            // Get the most recent calculation (highest timestamp)
            const latestCalc = calculations.reduce((latest, current) =>
                current.calculation_date > latest.calculation_date
                    ? current
                    : latest
            );

            console.log("Loading from latest calculation:", latestCalc);

            // Load the calculation data
            await loadCalculationData(latestCalc);
        };

        request.onerror = event =>
        {
            console.error(
                "Error loading latest calculation:",
                event.target.error
            );
            console.log("Falling back to demo values");
            initializeDemo();
        };
    } catch (error) {
        console.error("Error in initializeFromLatest:", error);
        console.log("Falling back to demo values");
        initializeDemo();
    }
}

async function loadCalculationData(calculation)
{
    try {
        // Set basic calculation values
        elements.inputs.totalProfit.value = calculation.total_profit || 0;
        elements.inputs.traderCapital.value = calculation.trader_capital || 0;
        elements.inputs.calculationNotes.value = calculation.notes || "";

        // Get investors for this calculation
        const investorTransaction = db.transaction(
            [STORE_INVESTORS],
            "readonly"
        );
        const investorStore =
            investorTransaction.objectStore(STORE_INVESTORS);
        const investorIndex = investorStore.index("calculation_id");
        const investorRequest = investorIndex.getAll(calculation.id);

        investorRequest.onsuccess = event =>
        {
            const savedInvestors = event.target.result;

            // Clear existing investors
            clearAllInvestors();

            // Add investors from saved data
            savedInvestors.forEach((investor, index) =>
            {
                addInvestor();

                // Set the investor values
                const capitalInput = document.getElementById(
                    `investor${ investorCount }Capital`
                );
                const feeInput = document.getElementById(
                    `investor${ investorCount }Fee`
                );

                if (capitalInput) capitalInput.value = investor.capital || 0;
                if (feeInput) feeInput.value = investor.fee_rate || 0;
            });

            // If no investors were saved, add one empty investor
            if (savedInvestors.length === 0) {
                addInvestor();
            }

            // Recalculate shares with loaded data
            calculateShares();

            console.log(
                `Loaded calculation from ${ formatDate(
                    calculation.calculation_date
                ) } with ${ savedInvestors.length } investors`
            );
        };

        investorRequest.onerror = event =>
        {
            console.error("Error loading investors:", event.target.error);
            // Still proceed with basic calculation data
            addInvestor();
            calculateShares();
        };
    } catch (error) {
        console.error("Error loading calculation data:", error);
        initializeDemo();
    }
}

function clearAllInvestors()
{
    // Remove all investor containers from DOM
    investors.forEach(investor =>
    {
        const container = document.getElementById(`${ investor.id }Container`);
        if (container) {
            container.remove();
        }
    });

    // Reset investor tracking variables
    investors = [];
    investorCount = 0;
}

// Keep the original demo function as fallback
function initializeDemo()
{
    console.log("Initializing with demo values");
    elements.inputs.totalProfit.value = 5000;
    elements.inputs.traderCapital.value = 3000;
    elements.inputs.calculationNotes.value = "";

    // Clear any existing investors first
    clearAllInvestors();

    // Add demo investor
    addInvestor();
    document.getElementById("investor1Capital").value = 1000;
    document.getElementById("investor1Fee").value = 10;
    calculateShares();
}

// Update the main initialization in DOMContentLoaded
document.addEventListener("DOMContentLoaded", function ()
{
    setupEventListeners();

    // Initialize database first, then load from latest calculation
    initDatabase()
        .then(() =>
        {
            console.log("Database ready, loading from latest calculation");
            initializeFromLatest();
        })
        .catch(err =>
        {
            console.error("Database initialization failed:", err);
            alert("Failed to initialize database: " + err);
            // Still initialize with demo values if database fails
            initializeDemo();
        });
});