document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:3000';
  const eventList = document.getElementById('eventList');
  const registerForm = document.getElementById('registerForm');
  const cancelForm = document.getElementById('cancelForm');
  const messageDiv = document.getElementById('message');
  const cancelMessageDiv = document.getElementById('cancelMessage');

  // Display message helper
  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? '#e74c3c' : '#27ae60';
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
  }

  // Load and display events
  async function loadEvents() {
    try {
      eventList.innerHTML = '<li>Loading events...</li>';
      
      const response = await fetch(`${API_URL}/events`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const events = await response.json();
      
      if (!events.length) {
        eventList.innerHTML = '<li>No upcoming events</li>';
        return;
      }

      eventList.innerHTML = events.map(event => `
        <li class="event-item">
          <h3>${event.title}</h3>
          <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Attendees:</strong> ${event.attendees?.length || 0}</p>
          ${event.description ? `<p>${event.description}</p>` : ''}
          <div class="event-id">Event ID: ${event.id}</div>
        </li>
      `).join('');
    } catch (error) {
      console.error('Failed to load events:', error);
      eventList.innerHTML = `
        <li class="error">
          Failed to load events. ${error.message}
        </li>
      `;
    }
  }

  // Handle registration
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {
      eventId: formData.get('eventId'),
      name: formData.get('name'),
      email: formData.get('email')
    };

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      showMessage(messageDiv, result.message);
      registerForm.reset();
      loadEvents();
    } catch (error) {
      showMessage(messageDiv, error.message, true);
      console.error('Registration error:', error);
    }
  });

  // Handle cancellation
  cancelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(cancelForm);
    const data = {
      eventId: formData.get('cancelEventId'),
      email: formData.get('cancelEmail')
    };

    try {
      const response = await fetch(`${API_URL}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      showMessage(cancelMessageDiv, result.message);
      cancelForm.reset();
      loadEvents();
    } catch (error) {
      showMessage(cancelMessageDiv, error.message, true);
      console.error('Cancellation error:', error);
    }
  });

  // Initial load
  loadEvents();
});