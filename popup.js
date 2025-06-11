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
    const password = passwordField.value;
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

//loadAccouts
function loadAccounts(){
    chrome.storage.local.get({accounts: []}, ({accounts})=> {renderAccountsList(accounts);});
}

//saveAccounts
function saveAccounts(name,login,password)
{
    chrome.storage.local.get({accounts: []},({accounts}) =>{
        accounts.push({name,login,password});
        chrome.storage.local.set({accounts}, () =>{
            loadAccounts();
        });
    });
}
// Add event listener for the save account button
document.getElementById("saveAccount").addEventListener("click", () => {
    const name = document.getElementById("accountName").value.trim();
    const login = document.getElementById("accountLogin").value.trim();
    const password = document.getElementById("accountPassword").value.trim();

    if (!name || !login || !password) {
        alert("Please fill in all fields.");
        return;
    }

    saveAccounts(name, login, password);
    // Clear input fields after saving
    document.getElementById("accountName").value = "";
    document.getElementById("accountLogin").value = "";
    document.getElementById("accountPassword").value = "";
});

//delateAccount
function deleteAccount(index)
{
    chrome.storage.local.get({accounts: []},({accounts}) => {
        accounts.splice(index, 1);
        chrome.storage.local.set({accounts}, () => {
            loadAccounts();
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAccounts();
});

// Render accounts list
function renderAccountsList(accounts)
{
    const ul = document.querySelector("#accounts");
    ul.innerHTML = ""; // Clear existing list
    accounts.forEach(({name,login,password},i) => {
        const li = document.createElement("li");
        li.innerHTML =`
            <strong>${name}</strong> (${login})
            <button class="delete" data-index="${i}">Delete</button>
            <button class="copy-account" data-pwd="${password}">Copy Password</button>
        `;
        ul.appendChild(li);
    });
    // Add event listeners for buttons
    ul.querySelectorAll(".delete")
    .forEach(btn => btn.addEventListener("click", e => {
        deleteAccount(+e.target.dataset.index);
    }));
    ul.querySelectorAll(".copy-account")
    .forEach(btn => btn.addEventListener("click", e => {
        navigator.clipboard.writeText(e.target.dataset.pwd)
    }));
}