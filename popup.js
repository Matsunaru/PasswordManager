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
function saveAccounts(name,login,cipher, iv)
{
    chrome.storage.local.get({accounts: []},({accounts}) =>{
        accounts.push({name,login,cipher, iv});
        chrome.storage.local.set({accounts}, () =>{
            loadAccounts();
        });
    });
}
// Add event listener for the save account button
document.getElementById("saveAccount").addEventListener("click", async () => {
    const name = document.getElementById("accountName").value.trim();
    const login = document.getElementById("accountLogin").value.trim();
    const password = document.getElementById("accountPassword").value.trim();

    if(!encryptionKey)
    {
        alert("Please login to manage your accounts.");
        return;
    }
    const encrypted = await encryptText(password, encryptionKey);

    if (!name || !login || !password) {
        alert("Please fill in all fields.");
        return;
    }

    saveAccounts(name, login,encrypted.cipher, encrypted.iv);
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
async function renderAccountsList(accounts)
{
    const ul = document.querySelector("#accounts");
    ul.innerHTML = ""; // Clear existing list
    for (let i = 0; i < accounts.length; i++) {
    const { name, login, cipher, iv } = accounts[i];
    let password = "-";
    if (encryptionKey) {
        try {
            password = await decryptText(cipher, iv, encryptionKey);
        } catch (e) {
            password = "[Decryption failed]";
        }
    }
    const li = document.createElement("li");
    li.classList.add("account-item");
    li.innerHTML = `
    <div class="account-label">
        <strong>${name}</strong>
        <span class="account-login">(${login})</span>
    </div>
    <div class="account-actions">
        <button class="delete" data-index="${i}">Delete</button>
        <button class="copy-account" data-index="${i}">Copy Password</button>
    </div>
`;

    ul.appendChild(li);
    }
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
// Initialize encryption key
let encryptionKey = null;

// Key creation function
async function getKeyFromPassword(masterPassword)
{
    const enc = new TextEncoder();
    const salt = enc.encode("super_sól_123");

    //raw data to derive key
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(masterPassword), //incryption password
        { name: "PBKDF2" },
        false, ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt, // Use a secure random salt in production
            iterations: 100000, // Number of iterations for key stretching
            hash: { name: "SHA-256" }, // Hash algorithm for key stretching
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 }, // Key type and length
        false, // Whether the key is extractable
        ["encrypt", "decrypt"] // Key usages
    );
    return key;
}

// Login button event listener
document.getElementById("login").addEventListener("click", async () => {
    const pwd = document.getElementById("LoginPassword").value;

    if (!pwd) {
        alert("Please enter your password.");
        return;
    }

    const key = await getKeyFromPassword(pwd);

    chrome.storage.local.get(["testEncrypted"], async ({ testEncrypted }) => {
        // If there is no testEncrypted – we log in for the first time
        if (!testEncrypted) {
            const test = await encryptText("valid", key);
            chrome.storage.local.set({ testEncrypted: test }, () => {
                // Po zapisaniu klucza
                encryptionKey = key;
                alert("Master password set and saved!");
                document.getElementById("protectedArea").style.display = "block";
                loadAccounts();
            });
            return;
        }

        // Otherwise we try to decrypt testEncrypted
        try {
            const decrypted = await decryptText(testEncrypted.cipher, testEncrypted.iv, key);
            if (decrypted !== "valid") {
                alert("Wrong master password!");
                return;
            }

            encryptionKey = key;
            alert("Login successful! You can now manage your accounts.");
            document.getElementById("protectedArea").style.display = "block";

            loadAccounts();
        } catch (e) {
            console.error(e);
            alert("Wrong master password (decryption failed).");
        }
    });
});


async function encryptText(plainText, Key)
{
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate a random IV
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        Key,
        enc.encode(plainText)
    );
    return { 
        cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))), // Convert encrypted data to base64
        iv: btoa(String.fromCharCode(...iv)) // Convert IV to base64
     };
}

//decryptText
async function decryptText(cipherBase64, ivBase64, key)
{
    const cipherBytes = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivBytes,
        },
        key,
        cipherBytes
    );

    return new TextDecoder().decode(decrypted);
}