// Description: This script generates a random password based on user-defined length and displays it in the popup.
function generatePassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd ="";
    for (let i =0; i< length; i++){
        const rand = crypto.getRandomValues(new Uint32Array(1))[0] % charset.length;
        pwd += charset[rand];
    }
    return pwd;
}
document.getElementById("generate").addEventListener("click", () => {
    const length = parseInt(document.getElementById("length").value, 10);
    if (isNaN(length) || length <= 0)
    {
        alert("Please enter a valid length.");
        return;
    }
    // Strangth check using zxcvbn
    const password = generatePassword(length);
    const result = zxcvbn(password);
    document.getElementById("strength").textContent = strengthText[result.score];
    console.log("Password strength score: ", result.score);
    document.getElementById("password").value = password;
});

const rangeInput = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");
// Set initial length value
rangeInput.addEventListener("input", () => {
  lengthValue.textContent = rangeInput.value;
});

const copyButton = document.getElementById("copy");
// Add event listener for the copy button
copyButton.addEventListener("click", () => {
    const passwordField = document.getElementById("password");
    password = passwordField.value;
    if (!password)
    {
        alert("Please generate a password first.");
        return;
    }
    navigator.clipboard.writeText(password)
    .then(() => {
        alert("Password copied to clipboard!");
    })
    .catch(err => {
        console.error("Failed to copy password: ", err);
        alert("Failed to copy password. Please try again.");
    });
});


const strengthText =
[
    "Very Weak",
    "Weak",
    "Medium",
    "Strong",
    "Very Strong"
];
