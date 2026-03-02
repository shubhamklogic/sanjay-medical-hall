// 1. We tell the brain where the search box, button, and text result are on the page.
const searchBox = document.querySelector('input');
const searchButton = document.querySelector('button');
const resultMessage = document.getElementById('search-result');

// 2. This is our Test Catalog (we can add hundreds more later!)
// Make sure these are always typed in lowercase for the code to read them easily.
const medicineCatalog = [
    "paracetamol",
    "amoxicillin",
    "cetirizine",
    "omeprazole",
    "azithromycin",
    "dolo 650",
    "calpol",
    "ibuprofen"
];

// 3. We tell the button what to do when someone clicks it.
searchButton.addEventListener('click', function() {
    
    // Read what the user typed, make it lowercase, and remove extra spaces
    const typedMedicine = searchBox.value.toLowerCase().trim();

    // If they clicked search without typing anything
    if (typedMedicine === "") {
        resultMessage.innerHTML = "Please type a medicine name first.";
        resultMessage.style.color = "orange";
        return; // Stop running the code here
    }

    // Check if the typed medicine is inside our catalog list
    if (medicineCatalog.includes(typedMedicine)) {
        // If YES, print a success message
        resultMessage.innerHTML = "✔️ <b>Yes</b>, " + typedMedicine.toUpperCase() + " is a standard item carried at Sanjay Medical Hall.";
        resultMessage.style.color = "green";
    } else {
        // If NO, print a helpful fallback message
        resultMessage.innerHTML = "❌ We could not find this in our standard catalog. Please call the pharmacy to double-check.";
        resultMessage.style.color = "red";
    }
});