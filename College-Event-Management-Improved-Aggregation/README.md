# College Event Management System — Improved

A full-stack college event management project using **MongoDB, Node.js, Express, HTML, CSS and JavaScript**.

## Features

- Event CRUD: Create, Read, Update and Delete
- Participant CRUD: Create, Read, Update and Delete
- Register participants for events
- Prevent duplicate event registrations
- Delete registrations
- Submit and delete feedback
- Average feedback rating
- Dashboard statistics
- Search/filter events and participants
- Responsive modern UI
- Confirmation dialogs for destructive operations
- Automatic cleanup of registrations and feedback when an event/participant is deleted
- MongoDB database

## Data Manipulation / CRUD

This version demonstrates the main database manipulation operations:

- **INSERT** → Add Event / Add Participant / Registration / Feedback
- **SELECT** → View events, participants, registrations and feedback
- **UPDATE** → Edit events and participants
- **DELETE** → Delete events, participants, registrations and feedback

## Run

1. Open this project folder in terminal.
2. Install dependencies:

```bash
npm install
```

3. Start MongoDB Community Server.
4. Start the application:

```bash
npm start
```

5. Open:

http://localhost:3000

Database: `college_events`

Collections:
- events
- participants
- registrations
- feedback

## Project Structure

```text
College-Event-Management/
├── server.js
├── package.json
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Technologies

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Architecture: REST API + browser frontend


## Aggregation Pipeline

The improved version also includes **MongoDB Aggregation Pipelines** under the Analytics section.

### Pipelines implemented

1. **Registration count per event**
   - `$lookup` joins `events` with `registrations`
   - `$size` counts registrations
   - `$project` selects required fields
   - `$sort` orders events by registration count

2. **Average rating per event**
   - `$lookup` joins `events` with `feedbacks`
   - `$avg` calculates the average rating
   - `$size` counts reviews
   - `$round` formats the average
   - `$sort` orders results

3. **Participant registration analysis**
   - `$lookup` joins participants with registrations
   - `$size` counts registrations for each participant
   - `$sort` finds the most active participants

4. **Overall analytics**
   - `$group` calculates total registrations, events with registrations and average registrations per event
   - Another `$group` calculates total feedback and average rating

### API endpoints

```text
GET /api/analytics/event-registrations
GET /api/analytics/event-ratings
GET /api/analytics/participant-registrations
GET /api/analytics/summary
```

These results are displayed directly in the **Aggregation Pipeline Analytics** section of the dashboard.
