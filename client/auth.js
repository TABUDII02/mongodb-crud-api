document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // A. UI TOGGLE LOGIC (CONNECTING HTML/CSS TO JS)
    // =========================================================

    const registerPanel = document.getElementById('register-panel');
    const loginPanel = document.getElementById('login-panel');
    const showLogin = document.getElementById('show-login');
    const showRegister = document.getElementById('show-register');

    /**
     * Toggles the visibility of the register and login forms.
     * @param {string} target 'login' or 'register'
     */
    function toggleForm(target) {
        if (target === 'login') {
            registerPanel.classList.remove('active-form');
            loginPanel.classList.add('active-form');
        } else if (target === 'register') {
            loginPanel.classList.remove('active-form');
            registerPanel.classList.add('active-form');
        }
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            toggleForm('login');
        });
    }

    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            toggleForm('register');
        });
    }

    // =========================================================
    // B. API HANDLER LOGIC (YOUR ORIGINAL CODE)
    // =========================================================
    
    // --- Configuration ---
    // Make sure this matches your Node.js server port!
    const API_BASE_URL = 'https://mongodb-crud-api-ato3.onrender.com/api'; 
    
    // --- Get Form Elements ---
    const registrationForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form');

    // --- Helper Function for Fetch Requests ---
    async function apiRequest(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            // Check if the HTTP status code is NOT successful (200-299)
            if (!response.ok) {
                // The backend sends error messages in the 'error' field
                throw new Error(result.error || `Server responded with status ${response.status}`);
            }

            return result; 
        } catch (error) {
            console.error(`API Request to /${endpoint} failed:`, error);
            throw error; 
        }
    }

    // =========================================================
    // 1. REGISTRATION HANDLER
    // =========================================================
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const name = e.target.elements['reg-name'].value; 
            const email = e.target.elements['reg-email'].value;
            const password = e.target.elements['reg-password'].value;
            
            // Basic client-side validation check
            if (!name || !email || !password) {
                alert('Please fill in all fields.');
                return;
            }

            const registrationData = { name, email, password };
            
            try {
                // Calls POST /api/register
                const user = await apiRequest('register', registrationData);

                // ⭐ Enhanced Success Feedback for E-commerce
                alert(`✅ Registration Successful! Welcome, ${user.name}! Please sign in now.`);
                
                registrationForm.reset();
                // Automatically switch to the login panel after successful registration
                toggleForm('login'); 

            } catch (error) {
                alert(`❌ Registration Failed: ${error.message}`);
            }
        });
    }

    // =========================================================
    // 2. LOGIN HANDLER
    // =========================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const email = e.target.elements['login-email'].value;
            const password = e.target.elements['login-password'].value;
            
            const loginData = { email, password };

            try {
                // Calls POST /api/login
                const response = await apiRequest('login', loginData);

                // Save token and user data (crucial for maintaining login state)
                if (response.token) {
                    localStorage.setItem('authToken', response.token); 
                }
                if (response.user) {
                    localStorage.setItem('userName', response.user.name); 
                }
                
                alert(`🎉 Login Successful! Welcome back, ${response.user.name}!`);
                
                // Redirect the user to the main products page
                window.location.href = 'index.html'; 

            } catch (error) {
                alert(`🔒 Login Failed: ${error.message}`);
            }
        });
    }
});
