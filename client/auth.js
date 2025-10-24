document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Make sure this matches your Node.js server port!
    const API_BASE_URL = 'http://localhost:27017/api'; 
    
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

            // 🛑 UPDATED: Get the value from the new 'reg-name' input field
            const name = e.target.elements['reg-name'].value; 
            const email = e.target.elements['reg-email'].value;
            const password = e.target.elements['reg-password'].value;
            
            const registrationData = { name, email, password };
            
            try {
                // Calls POST /api/register
                const user = await apiRequest('register', registrationData);

                alert(`✅ Registration Successful! Welcome, ${user.name}. You can now log in.`);
                
                registrationForm.reset();

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

                alert(`🎉 Login Successful! Welcome back, ${response.user.name}!`);
                
                // --- Next Steps in a Real App ---
                // 1. Save the Authentication Token (JWT) here if your backend returns one.
                // localStorage.setItem('authToken', response.token); 
                // 2. Save the user details.
                // localStorage.setItem('userName', response.user.name); 
                
                // Redirect the user
                window.location.href = 'index.html'; 

            } catch (error) {
                alert(`🔒 Login Failed: ${error.message}`);
            }
        });
    }
});