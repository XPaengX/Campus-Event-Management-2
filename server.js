const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for cross-origin requests

// Create JSON files if they don't exist
function initializeFiles() {
  if (!fs.existsSync('events.json')) {
    fs.writeFileSync('events.json', JSON.stringify([], null, 2)); // Create events file if not present
  }
  if (!fs.existsSync('registrations.json')) {
    fs.writeFileSync('registrations.json', JSON.stringify([], null, 2)); // Create registrations file if not present
  }
}

// Load data from JSON files
function loadEvents() {
  try {
    const data = fs.readFileSync('events.json', 'utf8'); // Read events data
    return JSON.parse(data); // Parse and return events as JSON
  } catch (err) {
    console.error('Error loading events:', err);
    return []; // Return empty array if there was an error
  }
}

function loadRegistrations() {
  try {
    const data = fs.readFileSync('registrations.json', 'utf8'); // Read registrations data
    return JSON.parse(data); // Parse and return registrations as JSON
  } catch (err) {
    console.error('Error loading registrations:', err);
    return []; // Return empty array if there was an error
  }
}

// Save data to JSON files
function saveEvents(events) {
  try {
    fs.writeFileSync('events.json', JSON.stringify(events, null, 2)); // Save events data to file
    return true; // Return true if saved successfully
  } catch (err) {
    console.error('Error saving events:', err);
    return false; // Return false if there was an error
  }
}

function saveRegistrations(registrations) {
  try {
    fs.writeFileSync('registrations.json', JSON.stringify(registrations, null, 2)); // Save registrations data to file
    return true; // Return true if saved successfully
  } catch (err) {
    console.error('Error saving registrations:', err);
    return false; // Return false if there was an error
  }
}

// Get all events
app.get('/events', (req, res) => {
  const events = loadEvents(); // Load events
  res.json(events); // Send events as JSON response
});

// Create a new event
app.post('/events', (req, res) => {
  const { title, description, date, location } = req.body;

  if (!title || !description || !date || !location) { // Validate input
    return res.status(400).json({ message: 'All fields are required: title, description, date, location' });
  }

  const events = loadEvents();
  const newEvent = {
    id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1, // Generate new ID
    title,
    description,
    date,
    location,
    attendees: [] // Initialize empty attendees list
  };

  events.push(newEvent); // Add new event to events list
  const saved = saveEvents(events); // Save events data to file

  if (saved) {
    res.json({ success: true, message: 'Event created', event: newEvent });
  } else {
    res.status(500).json({ message: 'Failed to save event' });
  }
});

// Register for an event
app.post('/register', (req, res) => {
  const { eventId, name, email } = req.body;
  const events = loadEvents();
  let registrations = loadRegistrations();

  const event = events.find(e => e.id === parseInt(eventId)); // Find event by ID
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  event.attendees = event.attendees || []; // Initialize attendees if not present

  // Check if already registered
  const isRegisteredInEvent = event.attendees.some(att => att.email === email);
  const isRegisteredInRecords = registrations.some(
    reg => reg.eventId === parseInt(eventId) && reg.email === email
  );

  if (isRegisteredInEvent || isRegisteredInRecords) {
    return res.status(400).json({ message: 'Already registered for this event' });
  }

  // Create registration record
  const newRegistration = {
    id: registrations.length > 0 ? Math.max(...registrations.map(r => r.id)) + 1 : 1, // Generate new ID
    eventId: parseInt(eventId),
    eventTitle: event.title,
    name,
    email,
    registrationDate: new Date().toISOString() // Capture registration date
  };

  event.attendees.push({ name, email }); // Add to event attendees
  registrations.push(newRegistration); // Add to registrations

  // Save changes
  const eventsSaved = saveEvents(events);
  const registrationsSaved = saveRegistrations(registrations);

  if (eventsSaved && registrationsSaved) {
    res.json({ 
      success: true,
      message: `Registered for ${event.title}`,
      registrationId: newRegistration.id
    });
  } else {
    res.status(500).json({ message: 'Failed to complete registration' });
  }
});

// Update an existing event
app.put('/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, date, location } = req.body;

  const events = loadEvents();
  const eventIndex = events.findIndex(e => e.id === parseInt(id)); // Find event by ID

  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }

  // Only update provided fields
  if (title) events[eventIndex].title = title;
  if (description) events[eventIndex].description = description;
  if (date) events[eventIndex].date = date;
  if (location) events[eventIndex].location = location;

  const saved = saveEvents(events);

  if (saved) {
    res.json({ success: true, message: 'Event updated', event: events[eventIndex] });
  } else {
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// Cancel a registration
app.post('/cancel', (req, res) => {
  const { eventId, email } = req.body;
  const events = loadEvents();
  let registrations = loadRegistrations();

  const event = events.find(e => e.id === parseInt(eventId)); // Find event by ID
  if (!event || !event.attendees) {
    return res.status(404).json({ message: 'Event not found or no attendees' });
  }

  const initialAttendeeCount = event.attendees.length;
  event.attendees = event.attendees.filter(att => att.email !== email); // Remove from event attendees

  const initialRegistrationCount = registrations.length;
  registrations = registrations.filter(
    reg => !(reg.eventId === parseInt(eventId) && reg.email === email) // Remove from registration records
  );

  if (event.attendees.length === initialAttendeeCount && 
      registrations.length === initialRegistrationCount) {
    return res.status(404).json({ message: 'Registration not found' });
  }

  const eventsSaved = saveEvents(events);
  const registrationsSaved = saveRegistrations(registrations);

  if (eventsSaved && registrationsSaved) {
    res.json({ 
      success: true,
      message: `Cancelled registration for ${event.title}`
    });
  } else {
    res.status(500).json({ message: 'Failed to complete cancellation' });
  }
});

// Get all registrations (for admin)
app.get('/registrations', (req, res) => {
  const registrations = loadRegistrations(); // Load all registrations
  res.json(registrations); // Send registrations as JSON response
});

// Start server and initialize files
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`); // Log server start
  initializeFiles(); // Initialize files if they don't exist
});
